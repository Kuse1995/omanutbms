-- Add advanced_accounting_enabled column to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS advanced_accounting_enabled BOOLEAN DEFAULT false;

-- Set to true for enterprise plan tenants
UPDATE public.business_profiles 
SET advanced_accounting_enabled = true 
WHERE billing_plan = 'enterprise';

-- Enable realtime for payroll_records table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_records;