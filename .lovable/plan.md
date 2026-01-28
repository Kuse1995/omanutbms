

# Plan: Archive-Based Inventory Management

## Problem Summary
Inventory items cannot be deleted because of foreign key (FK) constraints from the `sale_items` table. The database logs confirm:
```
"update or delete on table inventory violates foreign key constraint sale_items_inventory_id_fkey on table sale_items"
```

The current deletion code attempts to nullify FK references, but:
1. The `sale_items_inventory_id_fkey` constraint doesn't have `ON DELETE SET NULL` - it's a hard reference
2. RLS policies may be blocking the update to `sale_items` in some cases
3. There are 682+ rows in `sales_transactions` with product_id references

---

## Solution: Soft-Delete (Archive) Pattern

Instead of deleting inventory items, we will **archive** them. Archived items:
- Will not appear in product pickers or sales forms
- Will remain linked to historical records (sales, invoices)
- Can be restored if needed

---

## Technical Implementation

### 1. Database Migration
Add an `is_archived` column to the `inventory` table:

```sql
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_inventory_is_archived ON public.inventory(is_archived)
WHERE is_archived = false;
```

### 2. Update ProductsManager Component
Replace the delete flow with an archive flow:

- Change "Delete" button to "Archive"
- Update confirmation dialog text
- Replace `DELETE` query with `UPDATE` setting `is_archived = true`
- Filter the product list to exclude archived items by default
- Add optional toggle to "Show archived items"
- Add "Restore" action for archived items

### 3. Update Product Selection Components
Filter out archived items in all product pickers:
- `ProductCombobox.tsx`
- `MaterialSelector.tsx`
- `SalesRecorder.tsx`
- Any other component that lists products for selection

Add `.eq("is_archived", false)` to all inventory queries used for selection.

### 4. UI Changes

**Products Table (ProductsManager)**
- "Delete" button becomes "Archive" button
- Archived items shown in a separate tab or with a filter toggle
- Archived items display with a visual indicator (e.g., dimmed row, badge)

**Archive Confirmation Dialog**
```
Title: "Archive [Product Name]?"
Message: "This item will be hidden from sales and inventory but historical records will be preserved. You can restore it later."
Actions: [Cancel] [Archive]
```

**Restore Action (for archived items)**
```
Button: "Restore"
Confirmation: "Restore [Product Name]? It will appear in your active inventory again."
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | Add `is_archived` column |
| `src/components/dashboard/ProductsManager.tsx` | Archive/restore logic, filter toggle |
| `src/components/dashboard/ProductCombobox.tsx` | Filter out archived items |
| `src/components/dashboard/MaterialSelector.tsx` | Filter out archived items |
| `src/components/dashboard/SalesRecorder.tsx` | Filter out archived items |
| `src/integrations/supabase/types.ts` | Auto-regenerated with new column |

---

## Benefits

1. **Data Integrity**: Historical sales records remain intact
2. **Reversibility**: Items can be restored if archived by mistake
3. **Clean UI**: Archived items don't clutter active inventory
4. **No FK Violations**: No need to modify database constraints

