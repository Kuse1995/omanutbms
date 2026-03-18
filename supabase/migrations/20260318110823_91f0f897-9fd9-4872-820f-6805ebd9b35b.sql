
-- Fix quotation_items INSERT policy to include operations_manager
DROP POLICY IF EXISTS "Admins/managers can insert quotation_items" ON public.quotation_items;
CREATE POLICY "Admins/managers/ops can insert quotation_items" ON public.quotation_items
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_admin_or_manager(tenant_id) 
  OR has_tenant_role(tenant_id, 'operations_manager'::app_role)
);

-- Fix quotation_items UPDATE policy to include operations_manager and manager
DROP POLICY IF EXISTS "Admins can update quotation_items" ON public.quotation_items;
CREATE POLICY "Admins/managers/ops can update quotation_items" ON public.quotation_items
FOR UPDATE TO authenticated
USING (
  is_tenant_admin_or_manager(tenant_id) 
  OR has_tenant_role(tenant_id, 'operations_manager'::app_role)
);
