-- Security hardening: restrict billing_plan_configs exposure and secure feature usage analytics

-- 1) billing_plan_configs: require authentication for reads; restrict writes to super admins
ALTER TABLE public.billing_plan_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_plan_configs_select_authenticated" ON public.billing_plan_configs;
DROP POLICY IF EXISTS "billing_plan_configs_insert_super_admin" ON public.billing_plan_configs;
DROP POLICY IF EXISTS "billing_plan_configs_update_super_admin" ON public.billing_plan_configs;
DROP POLICY IF EXISTS "billing_plan_configs_delete_super_admin" ON public.billing_plan_configs;

CREATE POLICY "billing_plan_configs_select_authenticated"
ON public.billing_plan_configs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "billing_plan_configs_insert_super_admin"
ON public.billing_plan_configs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "billing_plan_configs_update_super_admin"
ON public.billing_plan_configs
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "billing_plan_configs_delete_super_admin"
ON public.billing_plan_configs
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- 2) feature_usage_logs: ensure RLS and restrict reads to super admins (business intelligence)
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_usage_logs_select_super_admin" ON public.feature_usage_logs;
DROP POLICY IF EXISTS "feature_usage_logs_insert_tenant_member" ON public.feature_usage_logs;

CREATE POLICY "feature_usage_logs_select_super_admin"
ON public.feature_usage_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "feature_usage_logs_insert_tenant_member"
ON public.feature_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_belongs_to_tenant(tenant_id)
);

-- 3) feature_usage_summary: recreate view as security invoker + revoke public privileges
CREATE OR REPLACE VIEW public.feature_usage_summary
WITH (security_invoker=on) AS
SELECT 
  tenant_id,
  feature_key,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_used_at,
  DATE_TRUNC('day', created_at) as usage_date
FROM public.feature_usage_logs
GROUP BY tenant_id, feature_key, DATE_TRUNC('day', created_at);

REVOKE ALL ON public.feature_usage_summary FROM PUBLIC;
GRANT SELECT ON public.feature_usage_summary TO authenticated;
