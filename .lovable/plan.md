

# Fix: Stock Item Counts Not Showing on Locations Page

## Problem

The Locations page shows "0" for the Stock Items column on most branches. This happens because:

1. Products are assigned to locations via `default_location_id` on the `inventory` table
2. But the Locations page only counts items from the `branch_inventory` table
3. Most existing products were created before the branch_inventory sync fix, so they have no `branch_inventory` records despite being assigned to a location

For example, the KITWE branch has 1,426 products assigned to it, but the Stock Items column shows 0.

## Solution

Update the `LocationsManager` to count stock items from **both** sources:

1. **`branch_inventory`** -- items that have explicit branch stock records (accurate current stock)
2. **`inventory.default_location_id`** -- items assigned to a location but without a branch_inventory record yet

The displayed count will be the higher of the two, ensuring all assigned products are reflected.

## Changes

### File: `src/components/dashboard/LocationsManager.tsx`

**Add a second query** for inventory items grouped by `default_location_id`:

```typescript
const { data: inventoryByLocation } = await supabase
  .from("inventory")
  .select("default_location_id")
  .eq("tenant_id", tenant.id)
  .not("default_location_id", "is", null);
```

**Update the stats mapping** to combine both counts:

```typescript
const branchInvCount = inventoryData
  ?.filter(i => i.branch_id === branch.id)
  .reduce((sum, i) => sum + (i.current_stock || 0), 0) || 0;

const assignedCount = inventoryByLocation
  ?.filter(i => i.default_location_id === branch.id).length || 0;

// Show the more meaningful number
inventory_count: Math.max(branchInvCount, assignedCount),
```

This way, even if `branch_inventory` records haven't been created yet, the Locations page will still show how many products are assigned to each branch. As users create new products (which now auto-sync to `branch_inventory`), the counts will naturally converge.

### Files to modify
- `src/components/dashboard/LocationsManager.tsx`

