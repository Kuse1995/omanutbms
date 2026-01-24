-- Add TPIN and bank details to business_profiles
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS tpin_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS bank_swift_code TEXT;