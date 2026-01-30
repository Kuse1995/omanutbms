-- Add Lenco payment tracking columns to subscription_payments
ALTER TABLE public.subscription_payments
ADD COLUMN IF NOT EXISTS lenco_reference text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS operator text,
ADD COLUMN IF NOT EXISTS failure_reason text,
ADD COLUMN IF NOT EXISTS virtual_account_number text,
ADD COLUMN IF NOT EXISTS virtual_account_bank text;