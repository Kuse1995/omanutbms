-- Allow super admins to delete tenants
CREATE POLICY "Super admins can delete tenants"
ON public.tenants
FOR DELETE
USING (is_super_admin());

-- Allow super admins to delete business profiles
CREATE POLICY "Super admins can delete business profiles"
ON public.business_profiles
FOR DELETE
USING (is_super_admin());

-- Allow super admins to delete tenant statistics
CREATE POLICY "Super admins can delete tenant statistics"
ON public.tenant_statistics
FOR DELETE
USING (is_super_admin());