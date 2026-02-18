
# Location & Item Transfer Issues — Audit & Fix

## Current State Summary

The core transfer workflow (create → approve → mark complete) works correctly at the database level. The `complete_stock_transfer` database function properly deducts from source and adds to destination `branch_inventory`. However, there are **4 real issues** that affect reliability and usability.

---

## Issue 1 — Transfer Suggestion Engine is Completely Stubbed Out

In `WarehouseView.tsx`, the `fetchTransferSuggestions()` function (line 172) is a stub:

```typescript
const fetchTransferSuggestions = async () => {
  // Simplified - just clear suggestions for now
  setSuggestions([]);
};
```

The UI already has a full "Transfer Suggestions" panel ready to display results, but it always shows nothing because the query was never implemented. The suggestion logic should:
- Find items where a store's `branch_inventory.current_stock` is below `reorder_level`
- Check if any warehouse has surplus stock of that same item
- Surface these as actionable suggestions with a "Transfer X units" button

**Fix**: Implement `fetchTransferSuggestions()` with a real cross-branch query comparing store and warehouse stock levels.

---

## Issue 2 — Stock Availability Validation Uses Global Stock as Fallback

In `StockTransferModal.tsx`, `fetchSourceInventory()` has a fallback (lines 167–183): if no `branch_inventory` record exists for the selected source location, it falls back to the **global** `inventory` table's `current_stock`. This means a user can see "120 available" for a location that physically has 0 of that item, and submit a transfer request for 120 units. The `complete_stock_transfer` function would then deduct from a `branch_inventory` starting at 0, resulting in negative stock.

**Fix**: Remove the global `inventory` fallback entirely. If a location has no `branch_inventory` record for an item, that item should simply not appear in the transfer item picker for that source location. Add a clear "No inventory recorded at this location" empty state.

---

## Issue 3 — Missing `branch_inventory` INSERT Policy for Non-Admins

The `branch_inventory` table has no INSERT RLS policy for regular tenant users. Only the `complete_stock_transfer` database function (which runs as `SECURITY DEFINER`) can insert new `branch_inventory` rows safely. Any future code path that tries to directly insert a `branch_inventory` record for a non-admin user (e.g. initial stock seeding per branch) would silently fail or error.

**Fix**: Add an INSERT RLS policy:
```sql
CREATE POLICY "Tenant users can insert branch inventory"
ON public.branch_inventory FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_tenant(tenant_id));
```

---

## Issue 4 — "Mark Complete" Button Visible But Disabled with No Explanation for Non-Receiving Users

In `StockTransfersManager.tsx`, if a user is not assigned to the receiving branch, the "Mark Complete" button is rendered but disabled (with 50% opacity). There is a tooltip explaining why, but tooltips don't work on disabled buttons in most browsers (the `pointer-events: none` on disabled prevents the hover). Users see a greyed-out button with no clear reason.

**Fix**: For users who cannot complete the transfer, replace the disabled button with a clear informational badge (e.g. "Awaiting receipt at [Branch Name]") so the constraint is obvious without needing to hover.

---

## Files to Change

| File | Change | Issue |
|---|---|---|
| Migration SQL | Add `branch_inventory` INSERT policy | #3 |
| `src/components/dashboard/WarehouseView.tsx` | Implement real `fetchTransferSuggestions()` query | #1 |
| `src/components/dashboard/StockTransferModal.tsx` | Remove global inventory fallback; add empty state when no branch stock exists | #2 |
| `src/components/dashboard/StockTransfersManager.tsx` | Replace disabled "Mark Complete" button with informational badge for non-eligible users | #4 |

---

## Technical Details

### Fix 1 — Transfer Suggestions Query (WarehouseView.tsx)

Replace the stub with:
```typescript
const fetchTransferSuggestions = async () => {
  if (!tenant?.id || warehouses.length === 0) return;
  
  // Get all store branches
  const { data: stores } = await supabase
    .from('branches')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('type', 'Store')
    .eq('is_active', true);

  if (!stores?.length) return;

  // Get branch_inventory for stores that are below reorder level
  const { data: lowStoreStock } = await supabase
    .from('branch_inventory')
    .select('branch_id, inventory_id, current_stock, reorder_level')
    .eq('tenant_id', tenant.id)
    .in('branch_id', stores.map(s => s.id))
    .filter('current_stock', 'lte', 'reorder_level');  // raw filter

  // For each low-stock store item, check if any warehouse has surplus
  // Cross-reference against warehouse branch_inventory
  // Build suggestion objects
};
```

Because Supabase doesn't support column-to-column comparisons in `.filter()`, this will be done client-side: fetch all store `branch_inventory` records then filter where `current_stock <= reorder_level`.

### Fix 2 — Remove Inventory Fallback (StockTransferModal.tsx)

Delete lines 167–183 (the fallback block) and replace with:
```typescript
if (!branchData || branchData.length === 0) {
  setAvailableInventory([]);
  return; // show empty state in picker
}
```

Add a note in the Select's empty state: "No inventory on record at this location".

### Fix 3 — Database Migration

```sql
CREATE POLICY "Tenant users can insert branch inventory"
ON public.branch_inventory FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_tenant(tenant_id));
```

### Fix 4 — Replace Disabled Button (StockTransfersManager.tsx)

```tsx
{transfer.status === 'in_transit' && (
  canCompleteTransfer(transfer) ? (
    <Button size="sm" variant="outline" onClick={() => handleComplete(transfer)}>
      Mark Complete
    </Button>
  ) : (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      Awaiting receipt at {transfer.to_branch_name}
    </Badge>
  )
)}
```

No new components. No new routes. No schema column changes (only a new RLS policy).
