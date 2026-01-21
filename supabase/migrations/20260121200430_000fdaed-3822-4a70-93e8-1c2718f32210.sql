-- Create function to safely decrement variant stock
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_product_id UUID,
  p_variant_type TEXT,
  p_variant_value TEXT,
  p_quantity INTEGER,
  p_tenant_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE product_variants 
  SET stock = GREATEST(0, COALESCE(stock, 0) - p_quantity)
  WHERE product_id = p_product_id 
    AND variant_type = p_variant_type 
    AND variant_value = p_variant_value
    AND tenant_id = p_tenant_id
    AND is_active = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(UUID, TEXT, TEXT, INTEGER, UUID) TO authenticated;