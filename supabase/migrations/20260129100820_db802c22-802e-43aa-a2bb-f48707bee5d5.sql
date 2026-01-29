-- Phase 1: Enhanced feature_usage_logs table for analytics

-- Add new columns for richer tracking
ALTER TABLE public.feature_usage_logs 
ADD COLUMN IF NOT EXISTS page_path text,
ADD COLUMN IF NOT EXISTS session_id uuid;

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_tenant_id ON public.feature_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_user_id ON public.feature_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_feature_key ON public.feature_usage_logs(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_created_at ON public.feature_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_action_type ON public.feature_usage_logs(action_type);

-- Composite index for common analytics queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_analytics 
ON public.feature_usage_logs(tenant_id, feature_key, created_at DESC);

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_user_activity 
ON public.feature_usage_logs(user_id, created_at DESC);

-- Create engagement score calculation function
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(
  p_user_id uuid,
  p_start_date timestamp with time zone DEFAULT (now() - interval '30 days')
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_sales_count integer;
  v_invoice_count integer;
  v_inventory_count integer;
  v_receipt_count integer;
  v_ai_query_count integer;
  v_active_days integer;
BEGIN
  -- Sales created (weight: 5)
  SELECT COUNT(*) INTO v_sales_count
  FROM audit_log
  WHERE changed_by = p_user_id 
    AND table_name IN ('sales', 'sales_transactions')
    AND action = 'INSERT'
    AND changed_at >= p_start_date;
  
  -- Invoices created (weight: 4)
  SELECT COUNT(*) INTO v_invoice_count
  FROM audit_log
  WHERE changed_by = p_user_id 
    AND table_name = 'invoices'
    AND action = 'INSERT'
    AND changed_at >= p_start_date;
  
  -- Inventory actions (weight: 3)
  SELECT COUNT(*) INTO v_inventory_count
  FROM audit_log
  WHERE changed_by = p_user_id 
    AND table_name = 'inventory'
    AND changed_at >= p_start_date;
  
  -- Receipts issued (weight: 2)
  SELECT COUNT(*) INTO v_receipt_count
  FROM audit_log
  WHERE changed_by = p_user_id 
    AND table_name = 'payment_receipts'
    AND action = 'INSERT'
    AND changed_at >= p_start_date;
  
  -- AI Advisor queries (weight: 3)
  SELECT COUNT(*) INTO v_ai_query_count
  FROM feature_usage_logs
  WHERE user_id = p_user_id 
    AND feature_key = 'ai_advisor'
    AND created_at >= p_start_date;
  
  -- Days active (weight: 10)
  SELECT COUNT(DISTINCT DATE(changed_at)) INTO v_active_days
  FROM audit_log
  WHERE changed_by = p_user_id
    AND changed_at >= p_start_date;
  
  -- Calculate weighted score
  v_score := (COALESCE(v_sales_count, 0) * 5) +
             (COALESCE(v_invoice_count, 0) * 4) +
             (COALESCE(v_inventory_count, 0) * 3) +
             (COALESCE(v_receipt_count, 0) * 2) +
             (COALESCE(v_ai_query_count, 0) * 3) +
             (COALESCE(v_active_days, 0) * 10);
  
  RETURN v_score;
END;
$$;

-- Function to get top active users across all tenants (super admin only)
CREATE OR REPLACE FUNCTION public.get_top_active_users(
  p_limit integer DEFAULT 20,
  p_start_date timestamp with time zone DEFAULT (now() - interval '30 days')
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  tenant_id uuid,
  tenant_name text,
  total_actions bigint,
  last_active_at timestamp with time zone,
  engagement_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super admin only';
  END IF;
  
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      al.changed_by,
      COUNT(*) as action_count,
      MAX(al.changed_at) as last_activity
    FROM audit_log al
    WHERE al.changed_by IS NOT NULL
      AND al.changed_at >= p_start_date
    GROUP BY al.changed_by
  ),
  user_details AS (
    SELECT 
      ua.changed_by as uid,
      ua.action_count,
      ua.last_activity,
      p.full_name,
      au.email,
      tu.tenant_id as tid
    FROM user_activity ua
    LEFT JOIN profiles p ON p.user_id = ua.changed_by
    LEFT JOIN auth.users au ON au.id = ua.changed_by
    LEFT JOIN tenant_users tu ON tu.user_id = ua.changed_by
  )
  SELECT 
    ud.uid as user_id,
    ud.email,
    ud.full_name,
    ud.tid as tenant_id,
    t.name as tenant_name,
    ud.action_count as total_actions,
    ud.last_activity as last_active_at,
    public.calculate_engagement_score(ud.uid, p_start_date) as engagement_score
  FROM user_details ud
  LEFT JOIN tenants t ON t.id = ud.tid
  ORDER BY ud.action_count DESC
  LIMIT p_limit;
END;
$$;

-- Function to get feature usage statistics (super admin only)
CREATE OR REPLACE FUNCTION public.get_feature_usage_stats(
  p_start_date timestamp with time zone DEFAULT (now() - interval '30 days')
)
RETURNS TABLE (
  feature_key text,
  total_usage bigint,
  unique_users bigint,
  unique_tenants bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    ful.feature_key,
    COUNT(*) as total_usage,
    COUNT(DISTINCT ful.user_id) as unique_users,
    COUNT(DISTINCT ful.tenant_id) as unique_tenants
  FROM feature_usage_logs ful
  WHERE ful.created_at >= p_start_date
  GROUP BY ful.feature_key
  ORDER BY total_usage DESC;
END;
$$;

-- Function to get daily active users count
CREATE OR REPLACE FUNCTION public.get_daily_active_users(
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  activity_date date,
  active_users bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    DATE(al.changed_at) as activity_date,
    COUNT(DISTINCT al.changed_by) as active_users
  FROM audit_log al
  WHERE al.changed_at >= (CURRENT_DATE - p_days)
    AND al.changed_by IS NOT NULL
  GROUP BY DATE(al.changed_at)
  ORDER BY activity_date DESC;
END;
$$;