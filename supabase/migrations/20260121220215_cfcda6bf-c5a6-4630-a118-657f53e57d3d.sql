-- 1. Add skill level to employees for labor rate lookup
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS skill_level TEXT CHECK (skill_level IN ('Junior', 'Senior', 'Master'));

-- 2. Create Material Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.job_material_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_order_id UUID REFERENCES public.custom_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'meters',
  cost_at_time_of_use NUMERIC NOT NULL DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_material_usage ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "Tenant can manage job materials"
  ON public.job_material_usage FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- 3. Add Financial Breakdown columns to Custom Orders
ALTER TABLE public.custom_orders
ADD COLUMN IF NOT EXISTS assigned_tailor_id UUID REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS tailor_skill_level TEXT,
ADD COLUMN IF NOT EXISTS estimated_labor_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_hourly_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_material_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_labor_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC DEFAULT 30,
ADD COLUMN IF NOT EXISTS quoted_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_locked_at TIMESTAMPTZ;