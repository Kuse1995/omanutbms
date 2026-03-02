

# Fix: Inventory Items Not Showing at Assigned Location

## Problem Found
When you added the "shirt" to House of Dodo and assigned it to the "Production" location, the item's `default_location_id` was correctly set to Production. However, the `branch_inventory` record (which controls visibility when viewing a specific branch) was created pointing to the wrong branch (a branch from a different organization). This means when you select "Production" in the branch selector, the shirt doesn't appear because SmartInventory only looks at `branch_inventory` records for that branch.

The same pattern applies to "needles" — assigned to Production but `branch_inventory` points elsewhere.

## Root Cause
The `SmartInventory` and `InventoryAgent` components, when a branch is selected, **only** query `branch_inventory` for that specific `branch_id`. If the `branch_inventory` record doesn't exist or has a mismatched `branch_id`, the item is invisible — even though `default_location_id` correctly points to that branch.

## Solution

### 1. Fix `SmartInventory.tsx` — Fall back to `default_location_id`
When viewing a specific branch, query **both**:
- `branch_inventory` where `branch_id` matches (current behavior)
- `inventory` where `default_location_id` matches but no `branch_inventory` record exists for that branch

Merge the results, deduplicating by inventory ID. This ensures items assigned to a location always show, even if the `branch_inventory` sync failed.

### 2. Fix `InventoryAgent.tsx` — Same fallback
Apply the same dual-source query logic so the main inventory management screen also shows items correctly.

### 3. Add a self-healing sync
When displaying an item found via `default_location_id` (but missing from `branch_inventory`), automatically create the missing `branch_inventory` record in the background. This way the data self-corrects over time.

### 4. Fix stale `branch_inventory` data
Add a one-time data repair: for items where `default_location_id` doesn't match any `branch_inventory.branch_id` within the same tenant, upsert the correct `branch_inventory` record.

## Files to Modify
- `src/components/dashboard/SmartInventory.tsx` — Add fallback query for `default_location_id`
- `src/components/dashboard/InventoryAgent.tsx` — Same fallback query

## Data Fix (one-time)
Run a query to create missing `branch_inventory` records for items that have a `default_location_id` but no matching `branch_inventory` row, and clean up cross-tenant branch references.

