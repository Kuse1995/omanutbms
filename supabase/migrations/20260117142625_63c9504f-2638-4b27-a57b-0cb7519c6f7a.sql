-- Phase 1: Multi-Branch Database Schema

-- 1.1 Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  manager_id UUID,
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 1.2 Create branch_inventory for per-branch stock tracking
CREATE TABLE public.branch_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  reserved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, inventory_id)
);

-- 1.3 Create stock_transfers table for inter-branch transfers
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  requested_by UUID,
  approved_by UUID,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Add branch_id columns to core tables
ALTER TABLE public.tenant_users
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_access_all_branches BOOLEAN DEFAULT false;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.authorized_emails
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 1.5 Enable RLS on new tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- 1.6 RLS Policies for branches
CREATE POLICY "Users can view their tenant branches"
ON public.branches FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Admins can insert branches"
ON public.branches FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tenant_admin_or_manager(tenant_id)
  OR public.is_super_admin()
);

CREATE POLICY "Admins can update branches"
ON public.branches FOR UPDATE
TO authenticated
USING (
  public.is_tenant_admin_or_manager(tenant_id)
  OR public.is_super_admin()
);

CREATE POLICY "Admins can delete branches"
ON public.branches FOR DELETE
TO authenticated
USING (
  public.is_tenant_admin(tenant_id)
  OR public.is_super_admin()
);

-- 1.7 RLS Policies for branch_inventory
CREATE POLICY "Users can view branch inventory"
ON public.branch_inventory FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Admins can manage branch inventory"
ON public.branch_inventory FOR ALL
TO authenticated
USING (
  public.is_tenant_admin_or_manager(tenant_id)
  OR public.is_super_admin()
);

-- 1.8 RLS Policies for stock_transfers
CREATE POLICY "Users can view stock transfers"
ON public.stock_transfers FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Admins can manage stock transfers"
ON public.stock_transfers FOR ALL
TO authenticated
USING (
  public.is_tenant_admin_or_manager(tenant_id)
  OR public.is_super_admin()
);

-- 1.9 Auto-create tenant_id trigger for new tables
CREATE TRIGGER set_branch_inventory_tenant_id
BEFORE INSERT ON public.branch_inventory
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_stock_transfers_tenant_id
BEFORE INSERT ON public.stock_transfers
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_id();

-- 1.10 Updated_at triggers
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_inventory_updated_at
BEFORE UPDATE ON public.branch_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at
BEFORE UPDATE ON public.stock_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.11 Function to auto-create HQ branch when multi_branch is enabled
CREATE OR REPLACE FUNCTION public.create_default_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.multi_branch_enabled = true AND (OLD.multi_branch_enabled IS NULL OR OLD.multi_branch_enabled = false) THEN
    INSERT INTO public.branches (tenant_id, name, code, is_headquarters, is_active)
    VALUES (NEW.tenant_id, 'Headquarters', 'HQ', true, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_multi_branch_enabled
AFTER UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_branch();