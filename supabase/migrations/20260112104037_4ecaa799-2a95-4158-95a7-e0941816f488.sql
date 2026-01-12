-- Create billing_plan_configs table for overriding default plan settings
CREATE TABLE public.billing_plan_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key TEXT NOT NULL UNIQUE CHECK (plan_key IN ('starter', 'growth', 'enterprise')),
  label TEXT,
  description TEXT,
  tagline TEXT,
  monthly_price NUMERIC,
  annual_price NUMERIC,
  currency TEXT DEFAULT 'ZMW',
  trial_days INTEGER,
  max_users INTEGER,
  max_inventory_items INTEGER,
  feature_inventory BOOLEAN,
  feature_payroll BOOLEAN,
  feature_agents BOOLEAN,
  feature_impact BOOLEAN,
  feature_advanced_accounting BOOLEAN,
  feature_website BOOLEAN,
  highlights TEXT[],
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.billing_plan_configs ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plan configs (for pricing page, etc.)
CREATE POLICY "Anyone can view active plan configs"
ON public.billing_plan_configs
FOR SELECT
USING (is_active = true);

-- Only platform admins can modify plan configs
CREATE POLICY "Platform admins can manage plan configs"
ON public.billing_plan_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
);

-- Insert default overrides (empty - will use code defaults)
INSERT INTO public.billing_plan_configs (plan_key) VALUES 
  ('starter'),
  ('growth'),
  ('enterprise');

-- Add trigger to update updated_at
CREATE TRIGGER update_billing_plan_configs_updated_at
BEFORE UPDATE ON public.billing_plan_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();