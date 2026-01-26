-- Create helper function for operations management RLS policies
CREATE OR REPLACE FUNCTION public.can_manage_operations(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'operations_manager')
  )
$$;