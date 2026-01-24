-- Create platform_config table for service provider settings
CREATE TABLE public.platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'Omanut BMS',
  legal_company_name TEXT,
  registration_number TEXT,
  tpin_number TEXT,
  support_email TEXT,
  billing_email TEXT,
  support_phone TEXT,
  support_whatsapp TEXT,
  physical_address TEXT,
  terms_of_service_url TEXT,
  privacy_policy_url TEXT,
  data_processing_agreement_url TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_swift_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can read platform config
CREATE POLICY "Super admins can view platform config"
ON public.platform_config
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Only super admins can insert platform config
CREATE POLICY "Super admins can create platform config"
ON public.platform_config
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

-- Only super admins can update platform config
CREATE POLICY "Super admins can update platform config"
ON public.platform_config
FOR UPDATE
TO authenticated
USING (public.is_super_admin());

-- Insert default row
INSERT INTO public.platform_config (platform_name) VALUES ('Omanut BMS');

-- Add updated_at trigger
CREATE TRIGGER update_platform_config_updated_at
BEFORE UPDATE ON public.platform_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();