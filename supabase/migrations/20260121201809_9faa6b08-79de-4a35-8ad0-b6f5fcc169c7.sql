-- Create customers table for client profiles with measurements
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  -- Body measurements stored as JSON (in cm)
  measurements JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create custom_orders table for bespoke design requests
CREATE TABLE public.custom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Design specifications
  design_type TEXT, -- 'dress', 'suit', 'shirt', 'trousers', etc.
  fabric TEXT,
  color TEXT,
  style_notes TEXT,
  reference_images TEXT[] DEFAULT '{}',
  -- Measurements snapshot (copied from customer at order time)
  measurements JSONB DEFAULT '{}'::jsonb,
  -- Pricing
  estimated_cost NUMERIC(12,2),
  final_cost NUMERIC(12,2),
  deposit_paid NUMERIC(12,2) DEFAULT 0,
  -- Timeline
  order_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  -- Status workflow
  status TEXT DEFAULT 'pending',
  -- Links
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create custom_order_items table for multi-item orders
CREATE TABLE public.custom_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  custom_order_id UUID NOT NULL REFERENCES public.custom_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint for order_number per tenant
ALTER TABLE public.custom_orders ADD CONSTRAINT custom_orders_tenant_order_number_unique UNIQUE (tenant_id, order_number);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Tenant users can view customers"
  ON public.customers FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins/managers can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins/managers can update customers"
  ON public.customers FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

-- RLS Policies for custom_orders
CREATE POLICY "Tenant users can view custom_orders"
  ON public.custom_orders FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant users can insert custom_orders"
  ON public.custom_orders FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins/managers can update custom_orders"
  ON public.custom_orders FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins can delete custom_orders"
  ON public.custom_orders FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

-- RLS Policies for custom_order_items
CREATE POLICY "Tenant users can view custom_order_items"
  ON public.custom_order_items FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant users can insert custom_order_items"
  ON public.custom_order_items FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins/managers can update custom_order_items"
  ON public.custom_order_items FOR UPDATE
  USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins can delete custom_order_items"
  ON public.custom_order_items FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

-- Auto-generate custom order number function
CREATE OR REPLACE FUNCTION public.generate_custom_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := 'CO' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(order_number, '^CO\d{4}-', ''),
        '[^0-9].*$', ''
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.custom_orders
  WHERE order_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;
  
  NEW.order_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating order numbers
CREATE TRIGGER generate_custom_order_number_trigger
  BEFORE INSERT ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_custom_order_number();

-- Create trigger for auto-setting tenant_id
CREATE TRIGGER set_customers_tenant_id
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_custom_orders_tenant_id
  BEFORE INSERT ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_custom_order_items_tenant_id
  BEFORE INSERT ON public.custom_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Updated_at triggers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_orders_updated_at
  BEFORE UPDATE ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_order_items_updated_at
  BEFORE UPDATE ON public.custom_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for custom orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_orders;