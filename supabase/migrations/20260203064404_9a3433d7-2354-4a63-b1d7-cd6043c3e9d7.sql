-- Create helper function for custom order access (assignment-based)
CREATE OR REPLACE FUNCTION public.can_access_custom_order(
  _tenant_id UUID, 
  _assigned_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND (
        -- Admins and managers have full access
        role IN ('admin', 'manager')
        OR 
        -- Operations managers can access orders assigned to them
        (role = 'operations_manager' AND _assigned_user_id = auth.uid())
      )
  )
$$;

-- Drop old restrictive UPDATE policy on custom_orders
DROP POLICY IF EXISTS "Tenant admins/managers can update custom_orders" ON public.custom_orders;

-- Create new UPDATE policy with assignment-based access for operations managers
CREATE POLICY "Authorized users can update custom_orders"
  ON public.custom_orders FOR UPDATE
  USING (
    public.is_tenant_admin_or_manager(tenant_id)
    OR 
    (public.can_manage_operations(tenant_id) AND assigned_operations_user_id = auth.uid())
  );

-- Allow tenant users to see colleague profiles (needed for "Assigned by" display)
-- First check if policy exists and drop it
DROP POLICY IF EXISTS "Tenant users can view colleague profiles" ON public.profiles;

CREATE POLICY "Tenant users can view colleague profiles"
  ON public.profiles FOR SELECT
  USING (
    -- User can see their own profile
    user_id = auth.uid()
    OR
    -- User can see profiles of colleagues in their tenant
    EXISTS (
      SELECT 1 FROM public.tenant_users tu1
      WHERE tu1.user_id = auth.uid()
        AND tu1.tenant_id IN (
          SELECT tu2.tenant_id FROM public.tenant_users tu2 
          WHERE tu2.user_id = profiles.user_id
        )
    )
  );