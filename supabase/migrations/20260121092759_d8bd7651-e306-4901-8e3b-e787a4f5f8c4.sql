-- Add missing discount columns to sales_transactions table
ALTER TABLE public.sales_transactions 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text;