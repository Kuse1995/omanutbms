

# Fix "column quantity does not exist" Error in Stock Transfer Completion

## Problem

When clicking **Mark Complete** on a stock transfer, the `complete_stock_transfer` database function fails with the error: **column "quantity" does not exist**.

The function has a fallback path that reads from the `inventory` table when no `branch_inventory` record exists for the source location. In that fallback, it uses `SELECT quantity` but the `inventory` table's column is named `current_stock`, not `quantity`.

## Root Cause

In the `complete_stock_transfer` function, around this section:

```sql
-- If no branch_inventory exists for source, create one from main inventory
IF v_source_branch_inv_id IS NULL THEN
    SELECT quantity INTO v_source_stock        -- BUG: should be current_stock
    FROM public.inventory 
    WHERE id = v_transfer.inventory_id;
```

The `stock_transfers` table has a `quantity` column (which works fine), but the `inventory` table uses `current_stock`. The function confuses the two.

## Fix

Run a database migration to replace the `complete_stock_transfer` function, changing `SELECT quantity` to `SELECT current_stock` when reading from the `inventory` table. Everything else in the function remains the same.

## Technical Details

### Migration SQL

A single `CREATE OR REPLACE FUNCTION` statement that corrects the one line from:
```sql
SELECT quantity INTO v_source_stock FROM public.inventory WHERE id = v_transfer.inventory_id;
```
to:
```sql
SELECT current_stock INTO v_source_stock FROM public.inventory WHERE id = v_transfer.inventory_id;
```

No other changes are needed. The rest of the function correctly references `stock_transfers.quantity` and `branch_inventory.current_stock`.

