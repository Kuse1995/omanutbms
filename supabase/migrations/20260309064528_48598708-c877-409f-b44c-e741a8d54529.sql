
-- BMS Integration Configs table
CREATE TABLE public.bms_integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  api_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  callback_url text,
  callback_events jsonb NOT NULL DEFAULT '["low_stock","out_of_stock","new_order","payment_confirmed","invoice_overdue","daily_summary","large_sale","new_contact"]'::jsonb,
  last_api_call_at timestamptz,
  last_callback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- BMS API Logs table
CREATE TABLE public.bms_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  source text NOT NULL DEFAULT 'external',
  request_summary jsonb,
  response_status text,
  execution_time_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast log queries
CREATE INDEX idx_bms_api_logs_tenant_created ON public.bms_api_logs(tenant_id, created_at DESC);
CREATE INDEX idx_bms_api_logs_action ON public.bms_api_logs(action);

-- Enable RLS
ALTER TABLE public.bms_integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_api_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for bms_integration_configs: only tenant admins/managers
CREATE POLICY "Tenant admins can manage BMS configs"
  ON public.bms_integration_configs
  FOR ALL
  TO authenticated
  USING (public.is_tenant_admin_or_manager(tenant_id))
  WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));

-- Super admins can see all
CREATE POLICY "Super admins can manage all BMS configs"
  ON public.bms_integration_configs
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- RLS policies for bms_api_logs
CREATE POLICY "Tenant admins can view BMS logs"
  ON public.bms_api_logs
  FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Super admins can view all BMS logs"
  ON public.bms_api_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Service role inserts logs (from edge functions)
CREATE POLICY "Service can insert BMS logs"
  ON public.bms_api_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

-- Updated_at trigger for configs
CREATE TRIGGER update_bms_integration_configs_updated_at
  BEFORE UPDATE ON public.bms_integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
