-- 1. Create helper function for inventory permissions
CREATE OR REPLACE FUNCTION public.can_manage_inventory(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'operations_manager', 'sales_rep')
  )
$$;

-- 2. Drop old restrictive policy if it exists
DROP POLICY IF EXISTS "Admins/managers can insert inventory" ON public.inventory;

-- 3. Create new inclusive policy for inventory INSERT
CREATE POLICY "Inventory management roles can insert"
  ON public.inventory FOR INSERT
  WITH CHECK (can_manage_inventory(tenant_id));