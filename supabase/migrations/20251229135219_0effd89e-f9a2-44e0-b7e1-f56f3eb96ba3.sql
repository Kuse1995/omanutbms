-- Drop old policies that use the wrong has_role function
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "Managers and admins can insert sales" ON public.sales_transactions;

-- Create new tenant-based RLS policies
CREATE POLICY "Users can view their tenant sales"
ON public.sales_transactions FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert sales"
ON public.sales_transactions FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update sales"
ON public.sales_transactions FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete sales"
ON public.sales_transactions FOR DELETE
USING (is_tenant_admin(tenant_id));