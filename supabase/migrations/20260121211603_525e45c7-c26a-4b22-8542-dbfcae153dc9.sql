-- Insert Warehouse Management add-on definition
INSERT INTO public.addon_definitions (
  addon_key, 
  display_name, 
  description, 
  icon,
  pricing_type, 
  monthly_price, 
  unit_price, 
  unit_label,
  starter_limit, 
  growth_limit, 
  enterprise_limit,
  sort_order, 
  is_active
) VALUES (
  'warehouse_management',
  'Warehouse Management',
  'Multi-location inventory with stock transfers, manager approvals, and smart restock suggestions.',
  'Warehouse',
  'fixed',
  300,
  NULL,
  NULL,
  NULL,
  0,
  0,
  4,
  true
) ON CONFLICT (addon_key) DO NOTHING;