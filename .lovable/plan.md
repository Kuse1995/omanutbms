
# Fix: Products Not Appearing in Sales After Location Assignment

## Problem

When you add a new product and assign it to a storage location (branch), the product doesn't appear in the Sales product picker for that branch. This happens because:

1. The product form saves the location as `default_location_id` on the inventory table
2. But it never creates a matching record in the branch-level stock table
3. The Sales screen queries branch-level stock -- so items without a branch stock record are invisible

## Solution

After a product is created (or updated with a new location), automatically create the corresponding branch stock record so the item immediately appears in the Sales product picker for that branch.

## Changes

### File: `src/components/dashboard/ProductModal.tsx`

**On product creation (after insert succeeds):**
- If a storage location was selected, insert a row into `branch_inventory` with:
  - `inventory_id` = the new product's ID
  - `branch_id` = the selected `default_location_id`
  - `tenant_id` = current tenant
  - `current_stock` = the product's initial `current_stock` value

**On product update (after update succeeds):**
- If the storage location changed, handle both the old and new location:
  - If the location was removed or changed, optionally zero out the old branch stock
  - If a new location was set, upsert a `branch_inventory` row with the product's current stock

This ensures the product is visible in Sales immediately after creation, without needing a separate restock step.

## Technical Details

After the existing insert on line ~932, add:

```
// After successful insert, sync branch_inventory
if (insertedProduct?.id && formData.default_location_id && formData.default_location_id !== "none") {
  await supabase.from("branch_inventory").upsert({
    inventory_id: insertedProduct.id,
    branch_id: formData.default_location_id,
    tenant_id: tenantId,
    current_stock: isServiceItem ? 9999 : formData.current_stock,
  }, { onConflict: "inventory_id,branch_id" });
}
```

After the existing update on line ~919, add similar logic that checks if the location changed and syncs accordingly.

No database migrations are needed -- the `branch_inventory` table and its insert RLS policy already exist.

### Files to modify
- `src/components/dashboard/ProductModal.tsx` (sync branch_inventory on create and update)
