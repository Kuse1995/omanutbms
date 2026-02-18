ALTER TABLE public.custom_orders 
ADD COLUMN IF NOT EXISTS fixed_price numeric(12,2) DEFAULT NULL;