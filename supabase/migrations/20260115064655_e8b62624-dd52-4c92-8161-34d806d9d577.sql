-- Fix existing enterprise tenants that don't have advanced_accounting_enabled set to true
UPDATE public.business_profiles 
SET 
  advanced_accounting_enabled = true,
  inventory_enabled = true,
  payroll_enabled = true,
  agents_enabled = true,
  impact_enabled = true,
  website_enabled = true,
  whatsapp_enabled = true
WHERE billing_plan = 'enterprise';

-- Fix existing growth plan tenants
UPDATE public.business_profiles 
SET 
  inventory_enabled = true,
  payroll_enabled = true,
  agents_enabled = true,
  impact_enabled = true,
  website_enabled = true,
  whatsapp_enabled = true
WHERE billing_plan = 'growth';

-- Fix existing starter plan tenants
UPDATE public.business_profiles 
SET 
  inventory_enabled = true,
  payroll_enabled = COALESCE(payroll_enabled, false),
  agents_enabled = COALESCE(agents_enabled, false),
  impact_enabled = COALESCE(impact_enabled, false),
  website_enabled = COALESCE(website_enabled, false),
  whatsapp_enabled = COALESCE(whatsapp_enabled, false),
  advanced_accounting_enabled = false
WHERE billing_plan = 'starter';