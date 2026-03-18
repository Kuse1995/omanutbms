

# Fix: Inventory Showing 0 Items

## Root Cause

The query in `InventoryAgent.tsx` line 216 selects `color_count` and `size_count` directly from the `inventory` table, but **these columns do not exist** in the database. This causes a PostgREST 400 error on every fetch, which is caught silently, resulting in 0 items displayed.

The `color_count` and `size_count` values are already correctly computed from the `product_variants` table later in the code (lines 231-239), so selecting them from the database is both incorrect and redundant.

This bug affects **all tenants**, not just Zed Mart.

## Fix

### `src/components/dashboard/InventoryAgent.tsx`

Remove `color_count, size_count,` from the SELECT string on line 216:

```typescript
// Before (line 212-218):
let dataQuery = supabase.from("inventory").select(`
    id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price,
    reorder_level, liters_per_unit, image_url, category, status, item_type,
    inventory_class, unit_of_measure, default_location_id, is_archived,
    color_count, size_count, description, highlight, features, certifications, technical_specs,
    branches!default_location_id(name)
  `)

// After:
let dataQuery = supabase.from("inventory").select(`
    id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price,
    reorder_level, liters_per_unit, image_url, category, status, item_type,
    inventory_class, unit_of_measure, default_location_id, is_archived,
    description, highlight, features, certifications, technical_specs,
    branches!default_location_id(name)
  `)
```

One line change. The variant counts are already computed from the `product_variants` query and merged in lines 231-239.

