-- Create advisor_action_logs table for tracking AI advisor actions
CREATE TABLE public.advisor_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_params JSONB,
  action_result JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for daily usage counting
CREATE INDEX idx_advisor_actions_tenant_date 
  ON public.advisor_action_logs (tenant_id, action_type, created_at);

-- Index for user lookup
CREATE INDEX idx_advisor_actions_user 
  ON public.advisor_action_logs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.advisor_action_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant's action logs
CREATE POLICY "Users can view their tenant's action logs"
  ON public.advisor_action_logs FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

-- Users can insert action logs for their tenant
CREATE POLICY "Users can insert action logs"
  ON public.advisor_action_logs FOR INSERT
  WITH CHECK (user_belongs_to_tenant(tenant_id));

-- Super admins can view all logs
CREATE POLICY "Super admins can view all action logs"
  ON public.advisor_action_logs FOR SELECT
  USING (is_super_admin());

-- Add comment for documentation
COMMENT ON TABLE public.advisor_action_logs IS 'Tracks AI advisor-initiated actions for audit and usage limits';