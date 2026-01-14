-- =====================================================
-- WhatsApp-BMS Integration Tables
-- Centralized WhatsApp number for all tenants
-- =====================================================

-- Table 1: whatsapp_user_mappings
-- Links WhatsApp phone numbers to tenant users for identification
CREATE TABLE public.whatsapp_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'cashier', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(whatsapp_number)
);

-- Enable RLS
ALTER TABLE public.whatsapp_user_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_user_mappings
CREATE POLICY "Users can view their tenant's WhatsApp mappings"
  ON public.whatsapp_user_mappings
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins and managers can insert WhatsApp mappings"
  ON public.whatsapp_user_mappings
  FOR INSERT
  WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins and managers can update WhatsApp mappings"
  ON public.whatsapp_user_mappings
  FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins and managers can delete WhatsApp mappings"
  ON public.whatsapp_user_mappings
  FOR DELETE
  USING (public.is_tenant_admin_or_manager(tenant_id));

-- Index for phone lookup (critical for webhook performance)
CREATE INDEX idx_whatsapp_mappings_number ON public.whatsapp_user_mappings(whatsapp_number);
CREATE INDEX idx_whatsapp_mappings_tenant ON public.whatsapp_user_mappings(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_mappings_updated_at
  BEFORE UPDATE ON public.whatsapp_user_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: whatsapp_pending_actions
-- Stores actions awaiting user confirmation (e.g., high-value sales)
CREATE TABLE public.whatsapp_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  message_sid TEXT,
  intent TEXT NOT NULL,
  intent_data JSONB DEFAULT '{}',
  confirmation_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.whatsapp_pending_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - admins can view pending actions for debugging
CREATE POLICY "Admins can view pending actions"
  ON public.whatsapp_pending_actions
  FOR SELECT
  USING (public.is_tenant_admin_or_manager(tenant_id));

-- Indexes for lookups
CREATE INDEX idx_pending_actions_number ON public.whatsapp_pending_actions(whatsapp_number);
CREATE INDEX idx_pending_actions_expires ON public.whatsapp_pending_actions(expires_at);

-- Table 3: whatsapp_audit_logs
-- Comprehensive audit trail for all WhatsApp operations
CREATE TABLE public.whatsapp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  whatsapp_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT,
  intent TEXT,
  original_message TEXT,
  response_message TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only admins/managers can view audit logs
CREATE POLICY "Admins and managers can view WhatsApp audit logs"
  ON public.whatsapp_audit_logs
  FOR SELECT
  USING (public.is_tenant_admin_or_manager(tenant_id) OR public.is_super_admin());

-- Super admins can insert (for edge function)
CREATE POLICY "Service role can insert audit logs"
  ON public.whatsapp_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Index for tenant filtering and date queries
CREATE INDEX idx_whatsapp_audit_tenant ON public.whatsapp_audit_logs(tenant_id);
CREATE INDEX idx_whatsapp_audit_created ON public.whatsapp_audit_logs(created_at DESC);
CREATE INDEX idx_whatsapp_audit_number ON public.whatsapp_audit_logs(whatsapp_number);

-- Add whatsapp_enabled column to business_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'business_profiles' 
    AND column_name = 'whatsapp_enabled'
  ) THEN
    ALTER TABLE public.business_profiles ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add feature columns to billing_plan_configs if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'billing_plan_configs' 
    AND column_name = 'feature_whatsapp'
  ) THEN
    ALTER TABLE public.billing_plan_configs ADD COLUMN feature_whatsapp BOOLEAN DEFAULT false;
  END IF;
END $$;