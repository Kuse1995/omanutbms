-- Create assets table for fixed asset management
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('IT', 'Vehicles', 'Machinery', 'Furniture', 'Buildings', 'Other')),
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'reducing_balance')),
  useful_life_years INTEGER NOT NULL DEFAULT 5 CHECK (useful_life_years > 0 AND useful_life_years <= 100),
  salvage_value NUMERIC NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  disposal_date DATE,
  disposal_value NUMERIC DEFAULT 0,
  serial_number TEXT,
  location TEXT,
  assigned_to TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create asset_logs table for audit trail
CREATE TABLE public.asset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'depreciation_run', 'disposed', 'transferred', 'revalued')),
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_assets_tenant_id ON public.assets(tenant_id);
CREATE INDEX idx_assets_status ON public.assets(tenant_id, status);
CREATE INDEX idx_assets_category ON public.assets(tenant_id, category);
CREATE INDEX idx_asset_logs_asset_id ON public.asset_logs(asset_id);
CREATE INDEX idx_asset_logs_tenant_id ON public.asset_logs(tenant_id);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets table
CREATE POLICY "Users can view their tenant's assets"
  ON public.assets FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "Users can insert assets for their tenant"
  ON public.assets FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Managers can update their tenant's assets"
  ON public.assets FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can delete their tenant's assets"
  ON public.assets FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

-- RLS Policies for asset_logs table
CREATE POLICY "Users can view their tenant's asset logs"
  ON public.asset_logs FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "Users can insert asset logs for their tenant"
  ON public.asset_logs FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set tenant_id if not provided
CREATE TRIGGER set_assets_tenant_id
  BEFORE INSERT ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_asset_logs_tenant_id
  BEFORE INSERT ON public.asset_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();