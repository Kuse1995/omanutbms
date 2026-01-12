-- Add billing-related columns for trial tracking and future payment integration
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for efficient trial expiration queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_trial_expires 
ON public.business_profiles (trial_expires_at) 
WHERE billing_status = 'trial';

-- Add comment for documentation
COMMENT ON COLUMN public.business_profiles.trial_expires_at IS 'End date of trial period, null for non-trial accounts';
COMMENT ON COLUMN public.business_profiles.stripe_customer_id IS 'Stripe customer ID for payment integration';
COMMENT ON COLUMN public.business_profiles.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';