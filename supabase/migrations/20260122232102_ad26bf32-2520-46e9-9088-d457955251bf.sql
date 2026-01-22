-- Drop the existing restrictive policy that only allows admins/managers
DROP POLICY IF EXISTS "Admins can manage stock transfers" ON stock_transfers;

-- Keep the existing SELECT policy (Tenant users can view stock transfers) as is

-- Allow any authenticated tenant member to INSERT (request) stock transfers
CREATE POLICY "Tenant users can request stock transfers"
ON stock_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Only admins/managers can UPDATE stock transfers (approve/reject/complete)
CREATE POLICY "Admins can update stock transfers"
ON stock_transfers
FOR UPDATE
TO authenticated
USING (is_tenant_admin_or_manager(tenant_id) OR is_super_admin())
WITH CHECK (is_tenant_admin_or_manager(tenant_id) OR is_super_admin());

-- Only admins/managers can DELETE stock transfers
CREATE POLICY "Admins can delete stock transfers"
ON stock_transfers
FOR DELETE
TO authenticated
USING (is_tenant_admin_or_manager(tenant_id) OR is_super_admin());