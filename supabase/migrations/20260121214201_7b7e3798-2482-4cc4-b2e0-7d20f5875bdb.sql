-- Add enabled_features JSONB column to store enterprise feature flags
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.business_profiles.enabled_features IS 'Array of enabled enterprise features like custom_designer_workflow, production_tracking';