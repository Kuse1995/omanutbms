
# Fix SKU Unique Constraint for Multi-Tenant Support

## Problem

The error **"duplicate key value violates unique constraint 'inventory_sku_key'"** is happening because:

1. The `inventory` table currently has a **global** unique constraint on `sku`
2. This means NO two rows can have the same SKU, even if they belong to different tenants
3. When "Art of Brands" tenant tries to import SKU `04465-02220`, it may already exist in another tenant's inventory

This breaks multi-tenant isolation—each tenant should be able to have their own products with whatever SKUs they want.

---

## Solution

Change the unique constraint from **global** to **tenant-scoped**.

### Database Migration

```sql
-- 1. Drop the old global SKU constraint
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_sku_key;

-- 2. Create tenant-scoped SKU uniqueness
ALTER TABLE public.inventory 
ADD CONSTRAINT inventory_tenant_sku_unique 
UNIQUE (tenant_id, sku);
```

### Why This Works

| Before | After |
|--------|-------|
| `UNIQUE (sku)` | `UNIQUE (tenant_id, sku)` |
| SKU must be unique globally | SKU must be unique within each tenant |
| Tenant A uses SKU "12345" → Tenant B cannot | Tenant A and B can both use SKU "12345" |

---

## Changes Required

| Change | Description |
|--------|-------------|
| Database migration | Drop global constraint, add tenant-scoped constraint |

No code changes needed—the import logic already correctly filters by `tenant_id` when checking for existing products.

---

## After the Fix

- Each tenant can import their own products with any SKU they want
- The same SKU can exist in multiple tenants (proper isolation)
- Updates still work correctly when re-importing the same file
- No changes needed to the import UI or logic
