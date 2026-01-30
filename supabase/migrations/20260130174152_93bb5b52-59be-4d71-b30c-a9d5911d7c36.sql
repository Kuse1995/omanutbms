-- Fix SKU Unique Constraint for Multi-Tenant Support
-- Problem: SKU uniqueness is global, preventing different tenants from using same SKUs
-- Solution: Change to tenant-scoped uniqueness

-- 1. Drop the old global SKU constraint
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_sku_key;

-- 2. Create tenant-scoped SKU uniqueness
-- This allows each tenant to have their own products with whatever SKUs they want
ALTER TABLE public.inventory 
ADD CONSTRAINT inventory_tenant_sku_unique 
UNIQUE (tenant_id, sku);