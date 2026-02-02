-- Create function to activate an add-on for a tenant after successful payment
CREATE OR REPLACE FUNCTION public.activate_addon(
  p_tenant_id uuid,
  p_addon_key text,
  p_quantity integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_addon_exists boolean;
BEGIN
  -- Verify the addon exists
  SELECT EXISTS (
    SELECT 1 FROM addon_definitions WHERE addon_key = p_addon_key AND is_active = true
  ) INTO v_addon_exists;
  
  IF NOT v_addon_exists THEN
    RAISE EXCEPTION 'Invalid or inactive add-on key: %', p_addon_key;
  END IF;

  -- Insert or update tenant_addons
  INSERT INTO tenant_addons (tenant_id, addon_key, quantity, is_enabled, activated_at)
  VALUES (p_tenant_id, p_addon_key, p_quantity, true, NOW())
  ON CONFLICT (tenant_id, addon_key) 
  DO UPDATE SET 
    quantity = tenant_addons.quantity + p_quantity,
    is_enabled = true,
    updated_at = NOW();

  -- Sync specific feature flags in business_profiles based on addon_key
  IF p_addon_key = 'multi_branch' THEN
    UPDATE business_profiles 
    SET multi_branch_enabled = true, updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_addon_key = 'warehouse_management' THEN
    UPDATE business_profiles 
    SET warehouse_enabled = true, updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_addon_key = 'whatsapp_messages' THEN
    UPDATE business_profiles 
    SET whatsapp_enabled = true, updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_addon_key = 'inventory_items' THEN
    UPDATE business_profiles 
    SET inventory_enabled = true, updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.activate_addon(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_addon(uuid, text, integer) TO service_role;