-- =====================================================
-- PHASE 1.1: CREATE CORE TENANT INFRASTRUCTURE
-- =====================================================

-- 1. Create tenants master table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Create business_profiles table (1:1 with tenants) - replaces company_settings
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_type TEXT DEFAULT 'retail' CHECK (business_type IN ('retail', 'ngo', 'school', 'services', 'distributor')),
  industry TEXT,
  country TEXT DEFAULT 'Zambia',
  currency TEXT DEFAULT 'ZMW',
  currency_symbol TEXT DEFAULT 'K',
  tax_enabled BOOLEAN DEFAULT true,
  tax_rate NUMERIC DEFAULT 0,
  inventory_enabled BOOLEAN DEFAULT true,
  payroll_enabled BOOLEAN DEFAULT true,
  agents_enabled BOOLEAN DEFAULT true,
  impact_enabled BOOLEAN DEFAULT true,
  website_enabled BOOLEAN DEFAULT true,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#004B8D',
  secondary_color TEXT DEFAULT '#0077B6',
  company_name TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_address TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on business_profiles
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create tenant_users table (links users to tenants with roles)
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Enable RLS on tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 4. Create tenant_statistics table (replaces company_statistics)
CREATE TABLE public.tenant_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  total_revenue_zmw NUMERIC NOT NULL DEFAULT 0,
  total_liters_donated BIGINT NOT NULL DEFAULT 0,
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_children_impacted BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_statistics
ALTER TABLE public.tenant_statistics ENABLE ROW LEVEL SECURITY;

-- 5. Create tenant_invitations table for user invitation system
CREATE TABLE public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_invitations
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 2.1: CREATE TENANT CONTEXT FUNCTIONS
-- =====================================================

-- Function to get user's active tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1
$$;

-- Function to check if user belongs to a specific tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id
  )
$$;

-- Function to check role within a specific tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role = _role
  )
$$;

-- Function to check if user is admin or manager in their tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_manager(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager')
  )
$$;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role = 'admin'
  )
$$;

-- =====================================================
-- PHASE 2.2: RLS POLICIES FOR NEW TENANT TABLES
-- =====================================================

-- Tenants policies
CREATE POLICY "Users can view their own tenants"
ON public.tenants FOR SELECT
USING (public.user_belongs_to_tenant(id));

CREATE POLICY "Tenant owners can update their tenant"
ON public.tenants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_id = id AND user_id = auth.uid() AND is_owner = true
  )
);

CREATE POLICY "System can insert tenants"
ON public.tenants FOR INSERT
WITH CHECK (true);

-- Business profiles policies
CREATE POLICY "Users can view their tenant's profile"
ON public.business_profiles FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can update business profile"
ON public.business_profiles FOR UPDATE
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "System can insert business profiles"
ON public.business_profiles FOR INSERT
WITH CHECK (true);

-- Tenant users policies
CREATE POLICY "Users can view their tenant's users"
ON public.tenant_users FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can manage users"
ON public.tenant_users FOR INSERT
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can update users"
ON public.tenant_users FOR UPDATE
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can delete users"
ON public.tenant_users FOR DELETE
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can view own tenant_users record"
ON public.tenant_users FOR SELECT
USING (user_id = auth.uid());

-- Tenant statistics policies
CREATE POLICY "Users can view their tenant's statistics"
ON public.tenant_statistics FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "System can update tenant statistics"
ON public.tenant_statistics FOR UPDATE
USING (true);

CREATE POLICY "System can insert tenant statistics"
ON public.tenant_statistics FOR INSERT
WITH CHECK (true);

-- Tenant invitations policies
CREATE POLICY "Users can view their tenant's invitations"
ON public.tenant_invitations FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can create invitations"
ON public.tenant_invitations FOR INSERT
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can delete invitations"
ON public.tenant_invitations FOR DELETE
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Anyone can view invitation by token"
ON public.tenant_invitations FOR SELECT
USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_statistics_updated_at
BEFORE UPDATE ON public.tenant_statistics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();