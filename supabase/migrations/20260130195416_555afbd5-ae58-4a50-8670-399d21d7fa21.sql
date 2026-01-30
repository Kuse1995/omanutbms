-- Create vendors lookup table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS on vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendors (tenant-scoped)
CREATE POLICY "Tenant users can view their vendors"
ON public.vendors FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins/managers can insert vendors"
ON public.vendors FOR INSERT
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins/managers can update vendors"
ON public.vendors FOR UPDATE
USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Tenant admins/managers can delete vendors"
ON public.vendors FOR DELETE
USING (public.is_tenant_admin_or_manager(tenant_id));

-- Add vendor_id, invoice_url, quotation_url to restock_history
ALTER TABLE public.restock_history 
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id),
ADD COLUMN invoice_url TEXT,
ADD COLUMN quotation_url TEXT;

-- Create helper function for branch assignment check
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_branch(_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND (
        branch_id = _branch_id 
        OR can_access_all_branches = true
      )
  )
$$;

-- Update complete_stock_transfer to validate receiving location
CREATE OR REPLACE FUNCTION public.complete_stock_transfer(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM stock_transfers
  WHERE id = p_transfer_id AND status = 'in_transit';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not in transit status';
  END IF;
  
  -- Validate user is assigned to receiving location OR is admin/manager
  IF NOT public.user_is_assigned_to_branch(v_transfer.to_branch_id) 
     AND NOT public.is_tenant_admin_or_manager(v_transfer.tenant_id) THEN
    RAISE EXCEPTION 'Only users at the receiving location can complete this transfer';
  END IF;
  
  -- Deduct from source branch_inventory
  UPDATE branch_inventory
  SET 
    current_stock = GREATEST(0, current_stock - v_transfer.quantity),
    updated_at = NOW()
  WHERE branch_id = v_transfer.from_branch_id 
    AND inventory_id = v_transfer.inventory_id
    AND tenant_id = v_transfer.tenant_id;
  
  -- If source branch_inventory row didn't exist, deduct from main inventory
  IF NOT FOUND THEN
    UPDATE inventory
    SET 
      current_stock = GREATEST(0, current_stock - v_transfer.quantity),
      updated_at = NOW()
    WHERE id = v_transfer.inventory_id
      AND tenant_id = v_transfer.tenant_id;
  END IF;
  
  -- Add to destination branch_inventory (upsert)
  INSERT INTO branch_inventory (tenant_id, branch_id, inventory_id, current_stock, reorder_level)
  VALUES (v_transfer.tenant_id, v_transfer.to_branch_id, v_transfer.inventory_id, v_transfer.quantity, 10)
  ON CONFLICT (branch_id, inventory_id)
  DO UPDATE SET 
    current_stock = branch_inventory.current_stock + v_transfer.quantity,
    updated_at = NOW();
  
  -- Mark transfer as completed
  UPDATE stock_transfers
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;