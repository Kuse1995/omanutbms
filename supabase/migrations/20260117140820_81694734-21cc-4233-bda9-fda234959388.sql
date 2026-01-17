-- Create addon_definitions table for platform-wide add-on configuration
CREATE TABLE public.addon_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Package',
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('usage', 'fixed', 'tiered')),
  monthly_price NUMERIC DEFAULT 0,
  annual_price NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  unit_label TEXT,
  starter_limit INTEGER,
  growth_limit INTEGER,
  enterprise_limit INTEGER,
  currency TEXT DEFAULT 'ZMW',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenant_addons table for per-tenant add-on tracking
CREATE TABLE public.tenant_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_key TEXT REFERENCES public.addon_definitions(addon_key) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  custom_unit_price NUMERIC,
  custom_monthly_price NUMERIC,
  custom_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, addon_key)
);

-- Add multi_branch_enabled to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS multi_branch_enabled BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.addon_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for addon_definitions (read by all authenticated, write by platform admins)
CREATE POLICY "Addon definitions are viewable by authenticated users"
ON public.addon_definitions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Platform admins can manage addon definitions"
ON public.addon_definitions FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- RLS policies for tenant_addons (using correct table: tenant_users)
CREATE POLICY "Users can view their tenant addons"
ON public.tenant_addons FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Platform admins can manage tenant addons"
ON public.tenant_addons FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- Seed initial add-on definitions
INSERT INTO public.addon_definitions (addon_key, display_name, description, icon, pricing_type, unit_price, unit_label, monthly_price, starter_limit, growth_limit, enterprise_limit, sort_order) VALUES
('inventory_items', 'Inventory Items', 'Additional inventory items beyond plan limit. Charged per item over the plan limit.', 'Package', 'usage', 1, 'per item', 0, 100, 500, NULL, 1),
('whatsapp_messages', 'WhatsApp Messages', 'AI-powered WhatsApp business assistant with message limits per billing cycle.', 'MessageCircle', 'tiered', 0.5, 'per message', 0, 50, 500, NULL, 2),
('multi_branch', 'Multi-Branch Management', 'Manage multiple business locations and branches with consolidated reporting.', 'Building2', 'fixed', 0, NULL, 200, NULL, NULL, NULL, 3);

-- Create updated_at trigger for addon_definitions
CREATE TRIGGER update_addon_definitions_updated_at
BEFORE UPDATE ON public.addon_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for tenant_addons
CREATE TRIGGER update_tenant_addons_updated_at
BEFORE UPDATE ON public.tenant_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();