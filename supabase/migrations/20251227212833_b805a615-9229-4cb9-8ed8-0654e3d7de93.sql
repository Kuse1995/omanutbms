-- Add white-label and additional branding fields to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS white_label_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS slogan text;

-- Add comment for documentation
COMMENT ON COLUMN public.business_profiles.white_label_enabled IS 'When true, removes all Omanut/vendor branding';
COMMENT ON COLUMN public.business_profiles.accent_color IS 'Tertiary color for accents and highlights';
COMMENT ON COLUMN public.business_profiles.slogan IS 'Company slogan or motto';