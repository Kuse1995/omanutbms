
-- Create tenant for platform owner (abkanyanta@gmail.com)
INSERT INTO public.tenants (id, name, slug, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Omanut Platform Admin',
  'omanut-platform-admin',
  'active'
);

-- Link platform owner as tenant admin/owner
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'e5a409c3-a4e3-4714-a021-7220173434ca',
  'admin',
  true
);

-- Create business profile with Enterprise plan and all features enabled
INSERT INTO public.business_profiles (
  tenant_id,
  company_name,
  billing_plan,
  billing_status,
  inventory_enabled,
  payroll_enabled,
  agents_enabled,
  impact_enabled,
  website_enabled,
  whatsapp_enabled,
  advanced_accounting_enabled,
  white_label_enabled
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Omanut Platform Admin',
  'enterprise',
  'active',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
);

-- Create tenant statistics
INSERT INTO public.tenant_statistics (tenant_id)
VALUES ('a0000000-0000-0000-0000-000000000001');
