-- 1. Create stock_movements table to track all inventory movements
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('transfer_out', 'transfer_in', 'sale', 'return', 
                      'adjustment', 'restock', 'damage', 'correction')
  ),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_inventory ON public.stock_movements(inventory_id);
CREATE INDEX idx_stock_movements_branch ON public.stock_movements(branch_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);

-- 2. Enable RLS on stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_movements
CREATE POLICY "Tenant users can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.tenant_id = stock_movements.tenant_id
    )
  );

CREATE POLICY "Tenant users can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.tenant_id = stock_movements.tenant_id
    )
  );

-- 3. Create audit trigger functions if they don't exist
CREATE OR REPLACE FUNCTION public.audit_table_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    NEW.id::text, 
    'INSERT', 
    to_jsonb(NEW), 
    auth.uid(),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.audit_table_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    NEW.id::text, 
    'UPDATE', 
    to_jsonb(OLD),
    to_jsonb(NEW), 
    auth.uid(),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.audit_table_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    OLD.id::text, 
    'DELETE', 
    to_jsonb(OLD), 
    auth.uid(),
    OLD.tenant_id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Add audit triggers to stock_transfers table
DROP TRIGGER IF EXISTS audit_stock_transfers_insert ON public.stock_transfers;
CREATE TRIGGER audit_stock_transfers_insert
  AFTER INSERT ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();

DROP TRIGGER IF EXISTS audit_stock_transfers_update ON public.stock_transfers;
CREATE TRIGGER audit_stock_transfers_update
  AFTER UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();

DROP TRIGGER IF EXISTS audit_stock_transfers_delete ON public.stock_transfers;
CREATE TRIGGER audit_stock_transfers_delete
  AFTER DELETE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();

-- 5. Add audit triggers to branch_inventory table
DROP TRIGGER IF EXISTS audit_branch_inventory_insert ON public.branch_inventory;
CREATE TRIGGER audit_branch_inventory_insert
  AFTER INSERT ON public.branch_inventory
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();

DROP TRIGGER IF EXISTS audit_branch_inventory_update ON public.branch_inventory;
CREATE TRIGGER audit_branch_inventory_update
  AFTER UPDATE ON public.branch_inventory
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();

DROP TRIGGER IF EXISTS audit_branch_inventory_delete ON public.branch_inventory;
CREATE TRIGGER audit_branch_inventory_delete
  AFTER DELETE ON public.branch_inventory
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();

-- 6. Update complete_stock_transfer function to log movements
CREATE OR REPLACE FUNCTION public.complete_stock_transfer(p_transfer_id uuid)
RETURNS void AS $$
DECLARE
  v_transfer RECORD;
  v_source_stock INTEGER;
  v_target_stock INTEGER;
  v_source_branch_inv_id UUID;
  v_target_branch_inv_id UUID;
BEGIN
  -- Get transfer details with lock
  SELECT * INTO v_transfer FROM public.stock_transfers 
  WHERE id = p_transfer_id AND status = 'in_transit'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not in transit';
  END IF;

  -- Handle SOURCE branch inventory
  SELECT id, current_stock INTO v_source_branch_inv_id, v_source_stock
  FROM public.branch_inventory
  WHERE branch_id = v_transfer.from_branch_id 
    AND inventory_id = v_transfer.inventory_id
    AND tenant_id = v_transfer.tenant_id
  FOR UPDATE;

  -- If no branch_inventory exists for source, create one from main inventory
  IF v_source_branch_inv_id IS NULL THEN
    SELECT quantity INTO v_source_stock
    FROM public.inventory 
    WHERE id = v_transfer.inventory_id;
    
    v_source_stock := COALESCE(v_source_stock, 0);
    
    INSERT INTO public.branch_inventory (
      tenant_id, branch_id, inventory_id, current_stock, reorder_level
    ) VALUES (
      v_transfer.tenant_id, v_transfer.from_branch_id, 
      v_transfer.inventory_id, v_source_stock, 10
    )
    RETURNING id INTO v_source_branch_inv_id;
  END IF;

  -- Log transfer OUT movement from source
  INSERT INTO public.stock_movements (
    tenant_id, inventory_id, branch_id, movement_type,
    quantity, quantity_before, quantity_after,
    from_branch_id, to_branch_id,
    reference_type, reference_id, created_by
  ) VALUES (
    v_transfer.tenant_id, v_transfer.inventory_id, 
    v_transfer.from_branch_id, 'transfer_out',
    v_transfer.quantity, v_source_stock, 
    v_source_stock - v_transfer.quantity,
    v_transfer.from_branch_id, v_transfer.to_branch_id,
    'stock_transfer', v_transfer.id, v_transfer.requested_by
  );

  -- Deduct from source branch_inventory
  UPDATE public.branch_inventory 
  SET current_stock = current_stock - v_transfer.quantity,
      updated_at = NOW()
  WHERE id = v_source_branch_inv_id;

  -- Handle TARGET branch inventory
  SELECT id, current_stock INTO v_target_branch_inv_id, v_target_stock
  FROM public.branch_inventory
  WHERE branch_id = v_transfer.to_branch_id 
    AND inventory_id = v_transfer.inventory_id
    AND tenant_id = v_transfer.tenant_id
  FOR UPDATE;

  IF v_target_branch_inv_id IS NULL THEN
    v_target_stock := 0;
    
    INSERT INTO public.branch_inventory (
      tenant_id, branch_id, inventory_id, current_stock, reorder_level
    ) VALUES (
      v_transfer.tenant_id, v_transfer.to_branch_id, 
      v_transfer.inventory_id, 0, 10
    )
    RETURNING id INTO v_target_branch_inv_id;
  END IF;

  -- Log transfer IN movement to destination
  INSERT INTO public.stock_movements (
    tenant_id, inventory_id, branch_id, movement_type,
    quantity, quantity_before, quantity_after,
    from_branch_id, to_branch_id,
    reference_type, reference_id, created_by
  ) VALUES (
    v_transfer.tenant_id, v_transfer.inventory_id, 
    v_transfer.to_branch_id, 'transfer_in',
    v_transfer.quantity, v_target_stock, 
    v_target_stock + v_transfer.quantity,
    v_transfer.from_branch_id, v_transfer.to_branch_id,
    'stock_transfer', v_transfer.id, v_transfer.requested_by
  );

  -- Add to target branch_inventory
  UPDATE public.branch_inventory 
  SET current_stock = current_stock + v_transfer.quantity,
      updated_at = NOW()
  WHERE id = v_target_branch_inv_id;

  -- Mark transfer complete
  UPDATE public.stock_transfers 
  SET status = 'completed', completed_at = NOW() 
  WHERE id = p_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Enable realtime for stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;