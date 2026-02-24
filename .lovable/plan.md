
# Filter Out Archived Items from Stock Transfer Selection

## Problem
The stock transfer modal shows **all** inventory items, including 1,703 archived ones (out of 4,791 total). There is an `is_archived` boolean column on the `inventory` table, but the transfer modal queries don't filter on it.

## Fix

### File: `src/components/dashboard/StockTransferModal.tsx`

Two queries need an additional filter:

1. **Branch-specific query** (line ~140): The join to `inventory:inventory_id(name, sku)` doesn't filter archived items. Add `.eq('inventory.is_archived', false)` or filter client-side after the join since Supabase embedded filters can be tricky. The cleaner approach is to filter client-side by checking `item.inventory?.is_archived !== true` before mapping.

2. **Global fallback query** (line ~163): Add `.eq('is_archived', false)` to the inventory query chain, right after `.eq('tenant_id', tenant.id)`.

### Changes Summary

- Branch inventory path: filter out items where the joined inventory record has `is_archived = true`
- Global inventory fallback: add `.eq('is_archived', false)` to the query

This ensures only active, non-archived products appear in the transfer item picker.
