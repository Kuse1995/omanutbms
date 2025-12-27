-- 1. Create platform_admins table for super admin users
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  notes text
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Create is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid()
  )
$$;

-- 3. RLS policies for platform_admins table
CREATE POLICY "Super admins can view platform_admins"
ON public.platform_admins FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert platform_admins"
ON public.platform_admins FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete platform_admins"
ON public.platform_admins FOR DELETE
USING (is_super_admin());

-- 4. Update tenants table RLS for super admin access
CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert tenants"
ON public.tenants FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update any tenant"
ON public.tenants FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete any tenant"
ON public.tenants FOR DELETE
USING (is_super_admin());

-- 5. Update authorized_emails RLS for super admin
CREATE POLICY "Super admins can view all authorized emails"
ON public.authorized_emails FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert any authorized email"
ON public.authorized_emails FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update any authorized email"
ON public.authorized_emails FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete any authorized email"
ON public.authorized_emails FOR DELETE
USING (is_super_admin());

-- 6. Update business_profiles RLS for super admin
CREATE POLICY "Super admins can view all business profiles"
ON public.business_profiles FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert any business profile"
ON public.business_profiles FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update any business profile"
ON public.business_profiles FOR UPDATE
USING (is_super_admin());

-- 7. Update tenant_users RLS for super admin
CREATE POLICY "Super admins can view all tenant users"
ON public.tenant_users FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert any tenant user"
ON public.tenant_users FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update any tenant user"
ON public.tenant_users FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete any tenant user"
ON public.tenant_users FOR DELETE
USING (is_super_admin());

-- 8. Update tenant_statistics RLS for super admin
CREATE POLICY "Super admins can view all tenant statistics"
ON public.tenant_statistics FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert any tenant statistics"
ON public.tenant_statistics FOR INSERT
WITH CHECK (is_super_admin());