
-- Add ZRA VSDC columns to business_profiles
ALTER TABLE public.business_profiles 
  ADD COLUMN IF NOT EXISTS zra_vsdc_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS zra_company_tin text,
  ADD COLUMN IF NOT EXISTS zra_company_names text,
  ADD COLUMN IF NOT EXISTS zra_security_key text,
  ADD COLUMN IF NOT EXISTS zra_vsdc_url text;

-- Create ZRA invoice log table
CREATE TABLE public.zra_invoice_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_num text NOT NULL,
  flag text NOT NULL DEFAULT 'INVOICE',
  status text NOT NULL DEFAULT 'pending',
  zra_response jsonb,
  fiscal_data jsonb,
  error_message text,
  related_table text,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.zra_invoice_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their ZRA logs"
  ON public.zra_invoice_log FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant users can insert ZRA logs"
  ON public.zra_invoice_log FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can update ZRA logs"
  ON public.zra_invoice_log FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Super admins full access to ZRA logs"
  ON public.zra_invoice_log FOR ALL
  TO authenticated
  USING (public.is_super_admin());

-- Auto-set tenant_id trigger
CREATE TRIGGER set_zra_invoice_log_tenant_id
  BEFORE INSERT ON public.zra_invoice_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Index for fast lookups
CREATE INDEX idx_zra_invoice_log_tenant ON public.zra_invoice_log(tenant_id);
CREATE INDEX idx_zra_invoice_log_related ON public.zra_invoice_log(related_table, related_id);
