-- Create a function to complete stock transfers and update branch_inventory
CREATE OR REPLACE FUNCTION public.complete_stock_transfer(p_transfer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_stock_transfer(UUID) TO authenticated;