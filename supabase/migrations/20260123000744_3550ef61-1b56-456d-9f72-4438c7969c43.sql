-- Add new columns to custom_orders for Dodo Wear form alignment
ALTER TABLE public.custom_orders
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS residential_address TEXT,
ADD COLUMN IF NOT EXISTS production_type TEXT DEFAULT 'normal' CHECK (production_type IN ('normal', 'express')),
ADD COLUMN IF NOT EXISTS fitting_date DATE,
ADD COLUMN IF NOT EXISTS collection_date DATE,
ADD COLUMN IF NOT EXISTS collection_time TIME;

-- Add whatsapp_number to customers table if not exists
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS residential_address TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.custom_orders.production_type IS 'normal = 12 days standard, express = rush order';
COMMENT ON COLUMN public.custom_orders.fitting_date IS 'Scheduled fitting appointment date';
COMMENT ON COLUMN public.custom_orders.collection_date IS 'Scheduled collection/pickup date';
COMMENT ON COLUMN public.custom_orders.collection_time IS 'Scheduled collection/pickup time';