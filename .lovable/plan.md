

# Stock Transfer Continuity & Audit Trail Improvements

## Problem Summary

After investigating the stock transfer system, I found several gaps that prevent proper tracking and recording of inventory movements:

1. **No audit trail** - Changes to `stock_transfers`, `branch_inventory`, and `inventory` tables are NOT logged
2. **Source stock not properly tracked** - The Warehouse has no `branch_inventory` entries, so deductions fall back to main inventory without proper branch-level tracking
3. **Incomplete historical data** - Some completed transfers have NULL values for critical fields
4. **No movement history table** - There's no dedicated log showing the complete stock movement trail

---

## Proposed Solution

### 1. Add Audit Triggers for Stock Tables

Create triggers to log all changes to stock-related tables:

```text
Tables to add audit triggers:
+---------------------+
| stock_transfers     |  <-- INSERT, UPDATE, DELETE
| branch_inventory    |  <-- INSERT, UPDATE, DELETE  
| inventory           |  <-- UPDATE (for stock changes)
+---------------------+
```

This ensures every change is recorded in the `audit_log` table.

---

### 2. Create Stock Movement History Table

Add a dedicated table to track every physical stock movement with complete context:

| Column | Purpose |
|--------|---------|
| `movement_type` | transfer_out, transfer_in, sale, return, adjustment, restock |
| `from_branch_id` | Source location (NULL for restocks) |
| `to_branch_id` | Destination location (NULL for sales) |
| `reference_type` | stock_transfer, sale, adjustment, restock |
| `reference_id` | ID of the related record |
| `quantity_before` | Stock level before movement |
| `quantity_after` | Stock level after movement |

---

### 3. Initialize Warehouse Branch Inventory

The current system relies on `branch_inventory` for branch-specific stock, but Warehouses don't have entries. We need to:

1. Create `branch_inventory` records for existing warehouse products
2. Update `StockTransferModal` to create source `branch_inventory` records if missing

---

### 4. Improve Transfer Completion Logic

Update `complete_stock_transfer` function to:

1. Log movements to the new `stock_movements` table
2. Properly handle the source branch inventory (create if missing)
3. Record before/after quantities for complete audit

---

### 5. Add Stock Movements Viewer UI

Add a new tab/section in Inventory Agent to display:
- Complete movement history for any product
- Filter by branch, date range, movement type
- Click-through to related records (transfers, sales, etc.)

---

## Implementation Steps

### Phase 1: Database Changes

**A. Add audit triggers:**
```sql
-- Attach to stock_transfers
CREATE TRIGGER audit_stock_transfers_insert
  AFTER INSERT ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_table_insert();

CREATE TRIGGER audit_stock_transfers_update
  AFTER UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_table_update();

-- Similar for branch_inventory
```

**B. Create stock_movements table:**
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  inventory_id UUID REFERENCES inventory(id),
  branch_id UUID REFERENCES branches(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**C. Update complete_stock_transfer function:**
- Add movement logging
- Ensure source branch_inventory exists or create it
- Record quantity changes

---

### Phase 2: UI Updates

**A. Update StockTransfersManager:**
- Add "View History" action for completed transfers
- Show movement details in a timeline format

**B. Add StockMovementsViewer component:**
- Filterable list of all stock movements
- Group by product or by date
- Export capability

**C. Update WarehouseView:**
- Use `branch_inventory` for warehouse-specific stock levels
- Add quick action to view movement history

---

## Technical Details

### New Database Migration

```sql
-- 1. Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('transfer_out', 'transfer_in', 'sale', 'return', 
                      'adjustment', 'restock', 'damage', 'correction')
  ),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add audit triggers to stock tables
CREATE TRIGGER audit_stock_transfers_insert
  AFTER INSERT ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_table_insert();

CREATE TRIGGER audit_stock_transfers_update
  AFTER UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_table_update();

CREATE TRIGGER audit_branch_inventory_insert
  AFTER INSERT ON branch_inventory
  FOR EACH ROW EXECUTE FUNCTION audit_table_insert();

CREATE TRIGGER audit_branch_inventory_update
  AFTER UPDATE ON branch_inventory
  FOR EACH ROW EXECUTE FUNCTION audit_table_update();

-- 3. RLS for stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view stock movements"
  ON stock_movements FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant managers can insert stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (can_manage_inventory(tenant_id));
```

### Updated complete_stock_transfer Function

```sql
CREATE OR REPLACE FUNCTION complete_stock_transfer(p_transfer_id uuid)
RETURNS void AS $$
DECLARE
  v_transfer RECORD;
  v_source_stock INTEGER;
  v_target_stock INTEGER;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer FROM stock_transfers 
  WHERE id = p_transfer_id AND status = 'in_transit';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not in transit';
  END IF;

  -- Get source stock level
  SELECT COALESCE(current_stock, 0) INTO v_source_stock
  FROM branch_inventory
  WHERE branch_id = v_transfer.from_branch_id 
    AND inventory_id = v_transfer.inventory_id;

  -- If no branch_inventory, use main inventory
  IF v_source_stock IS NULL THEN
    SELECT current_stock INTO v_source_stock
    FROM inventory WHERE id = v_transfer.inventory_id;
  END IF;

  -- Log source movement (transfer_out)
  INSERT INTO stock_movements (
    tenant_id, inventory_id, branch_id, movement_type,
    quantity, quantity_before, quantity_after,
    reference_type, reference_id
  ) VALUES (
    v_transfer.tenant_id, v_transfer.inventory_id, 
    v_transfer.from_branch_id, 'transfer_out',
    -v_transfer.quantity, v_source_stock, 
    v_source_stock - v_transfer.quantity,
    'stock_transfer', v_transfer.id
  );

  -- Deduct from source...
  -- Add to destination...
  -- Log destination movement (transfer_in)...
  
  -- Mark complete
  UPDATE stock_transfers SET status = 'completed', 
    completed_at = NOW() WHERE id = p_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `stock_movements` table, audit triggers, update function |
| `src/components/dashboard/StockMovementsViewer.tsx` | **New** - Display movement history |
| `src/components/dashboard/InventoryAgent.tsx` | Add "Movement History" tab |
| `src/components/dashboard/StockTransfersManager.tsx` | Add "View History" button |
| `src/components/dashboard/WarehouseView.tsx` | Use branch_inventory for filtering |

---

## Expected Outcome

After implementation:

1. **Complete audit trail** - Every stock change is logged automatically
2. **Movement history** - Users can see exactly where stock moved, when, and why
3. **Branch-level tracking** - Each location has its own inventory counts
4. **Debugging capability** - Easy to trace discrepancies by viewing movement history
5. **Compliance ready** - Full documentation of inventory movements for audits

