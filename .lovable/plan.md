

# Seed Branch Inventory for Lusaka Main Store

## Problem

The `branch_inventory` table is nearly empty. "Lusaka Main" has **zero records**, yet there are **3,067 active inventory items** in the global `inventory` table. This means branch-level stock tracking, transfers, and sales isolation cannot function properly because no items have been assigned to any location.

## Solution

Create a database migration that bulk-inserts `branch_inventory` records for a designated "home" branch (Lusaka Main) using all existing active inventory items. This acts as a one-time seed to bootstrap location-specific stock management.

## Technical Details

### Database Migration

Run a single SQL `INSERT ... SELECT` statement that:

1. Takes every active, non-archived item from `inventory` that has `current_stock > 0`
2. Creates a corresponding `branch_inventory` record for "Lusaka Main" (`5edce03c-614f-42b8-8fca-7cb9402e4b7a`)
3. Copies the `current_stock` value from the global inventory as the starting stock
4. Sets a default `reorder_level` of 10
5. Uses `ON CONFLICT DO NOTHING` to avoid duplicates if some records already exist

```sql
INSERT INTO public.branch_inventory (tenant_id, branch_id, inventory_id, current_stock, reorder_level)
SELECT 
  tenant_id,
  '5edce03c-614f-42b8-8fca-7cb9402e4b7a',  -- Lusaka Main
  id,
  current_stock,
  10
FROM public.inventory
WHERE is_archived = false
  AND current_stock > 0
ON CONFLICT DO NOTHING;
```

### What This Achieves

- Lusaka Main will have ~3,067 `branch_inventory` records matching the global stock
- The stock transfer modal will correctly show items available at Lusaka Main
- Sales can be properly isolated to Lusaka Main's stock
- Future transfers from Lusaka Main to other branches will deduct from its specific stock

### No Code Changes Required

This is a data-only migration. The existing transfer modal, sales recorder, and inventory views already query `branch_inventory` -- they just need the data to exist.

