CREATE OR REPLACE FUNCTION public.complete_stock_transfer(p_transfer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
  v_source_stock INTEGER;
  v_target_stock INTEGER;
  v_source_branch_inv_id UUID;
  v_target_branch_inv_id UUID;
BEGIN
  SELECT * INTO v_transfer FROM public.stock_transfers 
  WHERE id = p_transfer_id AND status = 'in_transit'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not in transit';
  END IF;

  SELECT id, current_stock INTO v_source_branch_inv_id, v_source_stock
  FROM public.branch_inventory
  WHERE branch_id = v_transfer.from_branch_id 
    AND inventory_id = v_transfer.inventory_id
    AND tenant_id = v_transfer.tenant_id
  FOR UPDATE;

  IF v_source_branch_inv_id IS NULL THEN
    SELECT current_stock INTO v_source_stock
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

  UPDATE public.branch_inventory 
  SET current_stock = current_stock - v_transfer.quantity,
      updated_at = NOW()
  WHERE id = v_source_branch_inv_id;

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

  UPDATE public.branch_inventory 
  SET current_stock = current_stock + v_transfer.quantity,
      updated_at = NOW()
  WHERE id = v_target_branch_inv_id;

  UPDATE public.stock_transfers 
  SET status = 'completed', completed_at = NOW() 
  WHERE id = p_transfer_id;
END;
$function$;