
-- Fix vendors table: operations_manager (and other inventory roles) can create/update vendors
-- They already have inventory access, so they should be able to manage vendors too

DROP POLICY IF EXISTS "Tenant admins/managers can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Tenant admins/managers can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Tenant admins/managers can delete vendors" ON public.vendors;

-- Allow anyone who can manage inventory to insert vendors
CREATE POLICY "Inventory roles can insert vendors"
ON public.vendors FOR INSERT TO authenticated
WITH CHECK (can_manage_inventory(tenant_id));

-- Allow anyone who can manage inventory to update vendors
CREATE POLICY "Inventory roles can update vendors"
ON public.vendors FOR UPDATE TO authenticated
USING (can_manage_inventory(tenant_id));

-- Only admins/managers can delete vendors
CREATE POLICY "Admins and managers can delete vendors"
ON public.vendors FOR DELETE TO authenticated
USING (is_tenant_admin_or_manager(tenant_id));
