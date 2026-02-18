CREATE POLICY "Tenant users can insert branch inventory"
ON public.branch_inventory FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_tenant(tenant_id));