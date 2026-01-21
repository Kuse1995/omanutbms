-- Create a table to track feature usage across tenants
CREATE TABLE IF NOT EXISTS public.feature_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  feature_key text NOT NULL,
  action_type text NOT NULL DEFAULT 'view',
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feature_usage_tenant ON public.feature_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON public.feature_usage_logs(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created ON public.feature_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_tenant_feature ON public.feature_usage_logs(tenant_id, feature_key);

-- Enable RLS
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy for super admins to read all usage logs
CREATE POLICY "Super admins can read all feature usage logs"
ON public.feature_usage_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
);

-- Policy for tenants to insert their own usage logs
CREATE POLICY "Users can insert their own tenant usage logs"
ON public.feature_usage_logs
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  )
);

-- Add tenant_id to user_activity table if not exists (for better tenant-level tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_activity' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.user_activity ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    CREATE INDEX idx_user_activity_tenant ON public.user_activity(tenant_id);
  END IF;
END $$;

-- Create a view for aggregated feature usage stats (for dashboard)
CREATE OR REPLACE VIEW public.feature_usage_summary AS
SELECT 
  tenant_id,
  feature_key,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_used_at,
  DATE_TRUNC('day', created_at) as usage_date
FROM public.feature_usage_logs
GROUP BY tenant_id, feature_key, DATE_TRUNC('day', created_at);

-- Grant access to the view
GRANT SELECT ON public.feature_usage_summary TO authenticated;