-- Add billing columns to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS billing_plan TEXT NOT NULL DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS billing_notes TEXT,
ADD COLUMN IF NOT EXISTS billing_start_date DATE,
ADD COLUMN IF NOT EXISTS billing_end_date DATE;

-- Add comment documenting valid values
COMMENT ON COLUMN public.business_profiles.billing_plan IS 'Valid values: starter, growth, enterprise';
COMMENT ON COLUMN public.business_profiles.billing_status IS 'Valid values: inactive, active, suspended, trial';