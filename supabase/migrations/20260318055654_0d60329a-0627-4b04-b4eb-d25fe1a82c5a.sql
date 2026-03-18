-- Update INSERT policy to allow operations_manager to create quotations
DROP POLICY "Admins/managers can insert quotations" ON public.quotations;
CREATE POLICY "Admins/managers/ops can insert quotations" ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_admin_or_manager(tenant_id)
    OR public.has_tenant_role(tenant_id, 'operations_manager')
  );

-- Update UPDATE policy to allow operations_manager to edit quotations
DROP POLICY "Admins can update quotations" ON public.quotations;
CREATE POLICY "Admins/ops can update quotations" ON public.quotations
  FOR UPDATE TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_tenant_role(tenant_id, 'operations_manager')
  );