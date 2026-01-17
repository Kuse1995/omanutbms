-- Fix WhatsApp sale recording: make sale_number unique per-tenant instead of globally.
-- This prevents cross-tenant collisions like S2026-0001.

ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_sale_number_key;

ALTER TABLE public.sales
ADD CONSTRAINT sales_tenant_sale_number_key UNIQUE (tenant_id, sale_number);
