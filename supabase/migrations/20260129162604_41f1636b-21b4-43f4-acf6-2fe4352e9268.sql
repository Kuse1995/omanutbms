-- =============================================
-- World-Class African SaaS - Schema Updates
-- =============================================

-- 1. Create currency_configs table with exchange rates vs USD
CREATE TABLE public.currency_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  currency_code text NOT NULL,
  currency_symbol text NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.currency_configs IS 'Exchange rates for African currencies vs USD base';

-- Enable RLS
ALTER TABLE public.currency_configs ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see currency rates)
CREATE POLICY "Anyone can view currency configs"
  ON public.currency_configs
  FOR SELECT
  USING (true);

-- Only super admins can modify
CREATE POLICY "Super admins can manage currency configs"
  ON public.currency_configs
  FOR ALL
  USING (public.is_super_admin());

-- Seed currency data
INSERT INTO public.currency_configs (country_code, country_name, currency_code, currency_symbol, exchange_rate) VALUES
  ('US', 'United States', 'USD', '$', 1.00),
  ('ZM', 'Zambia', 'ZMW', 'K', 27.50),
  ('NG', 'Nigeria', 'NGN', '₦', 1550.00),
  ('KE', 'Kenya', 'KES', 'KSh', 128.00),
  ('ZA', 'South Africa', 'ZAR', 'R', 18.50),
  ('GH', 'Ghana', 'GHS', 'GH₵', 15.80),
  ('TZ', 'Tanzania', 'TZS', 'TSh', 2685.00),
  ('UG', 'Uganda', 'UGX', 'USh', 3680.00),
  ('RW', 'Rwanda', 'RWF', 'FRw', 1320.00),
  ('BW', 'Botswana', 'BWP', 'P', 13.60),
  ('GB', 'United Kingdom', 'GBP', '£', 0.79),
  ('EU', 'European Union', 'EUR', '€', 0.92);

-- 2. Create subscription_payments table for payment history
CREATE TABLE public.subscription_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_reference text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  billing_period text NOT NULL DEFAULT 'monthly',
  provider text DEFAULT 'lenco',
  plan_key text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT valid_billing_period CHECK (billing_period IN ('monthly', 'annual'))
);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Tenant members can view their payments
CREATE POLICY "Tenant members can view their payments"
  ON public.subscription_payments
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

-- Only admins can insert payments (usually via edge function)
CREATE POLICY "Tenant admins can create payments"
  ON public.subscription_payments
  FOR INSERT
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- Super admins have full access
CREATE POLICY "Super admins can manage all payments"
  ON public.subscription_payments
  FOR ALL
  USING (public.is_super_admin());

-- 3. Add new columns to business_profiles
ALTER TABLE public.business_profiles 
  ADD COLUMN IF NOT EXISTS detected_country text,
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_provider_customer_id text;

-- 4. Update handle_new_user() trigger for open signup with 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
  assigned_role app_role;
  assigned_branch_id uuid;
  new_tenant_id uuid;
  existing_tenant_id uuid;
  existing_role app_role;
  user_full_name TEXT;
  company_name_input TEXT;
  detected_country_input TEXT;
  preferred_currency_input TEXT;
BEGIN
  -- Get the user's email and metadata
  user_email := NEW.email;
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1));
  company_name_input := NEW.raw_user_meta_data ->> 'company_name';
  detected_country_input := NEW.raw_user_meta_data ->> 'detected_country';
  preferred_currency_input := NEW.raw_user_meta_data ->> 'preferred_currency';
  
  -- Check if this email has a predefined tenant, role, and branch in authorized_emails
  -- This is for EXISTING tenant member invites only
  SELECT ae.tenant_id, ae.default_role, ae.branch_id 
  INTO existing_tenant_id, existing_role, assigned_branch_id
  FROM public.authorized_emails ae
  WHERE LOWER(ae.email) = LOWER(user_email)
  LIMIT 1;
  
  -- Default to viewer if no role found
  IF existing_role IS NULL THEN
    assigned_role := 'admin'; -- New signups become admin of their own tenant
  ELSE
    assigned_role := existing_role;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_full_name);
  
  -- Insert role into user_roles (for backward compatibility)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  -- Handle tenant assignment
  IF existing_tenant_id IS NOT NULL THEN
    -- User was pre-authorized to join an existing tenant (invited member)
    INSERT INTO public.tenant_users (tenant_id, user_id, role, branch_id, can_access_all_branches)
    VALUES (
      existing_tenant_id, 
      NEW.id, 
      assigned_role,
      assigned_branch_id,
      (assigned_role = 'admin' OR assigned_branch_id IS NULL)
    );
  ELSE
    -- NEW SIGNUP: Create a new tenant for this user (they become the owner/admin)
    -- This is the OPEN SIGNUP path - no authorization check needed
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(company_name_input, user_full_name || '''s Organization'),
      LOWER(REPLACE(COALESCE(company_name_input, user_full_name), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add user as tenant owner/admin with full branch access
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner, can_access_all_branches)
    VALUES (new_tenant_id, NEW.id, 'admin', true, true);
    
    -- Create business profile with 7-DAY TRIAL and currency detection
    INSERT INTO public.business_profiles (
      tenant_id, 
      company_name, 
      billing_status, 
      billing_plan,
      trial_expires_at,
      detected_country,
      preferred_currency
    )
    VALUES (
      new_tenant_id, 
      COALESCE(company_name_input, user_full_name || '''s Business'),
      'trial',
      'starter',
      NOW() + INTERVAL '7 days',
      detected_country_input,
      COALESCE(preferred_currency_input, 'USD')
    );
    
    -- Create tenant statistics
    INSERT INTO public.tenant_statistics (tenant_id)
    VALUES (new_tenant_id);
  END IF;
  
  RETURN NEW;
END;
$function$;