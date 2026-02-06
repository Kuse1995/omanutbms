
-- Set trial_days = 0 for all plans (new signups only)
UPDATE billing_plan_configs SET trial_days = 0;

-- Replace handle_new_user trigger function: new signups get 'inactive' instead of 'trial'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  user_email := NEW.email;
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1));
  company_name_input := NEW.raw_user_meta_data ->> 'company_name';
  detected_country_input := NEW.raw_user_meta_data ->> 'detected_country';
  preferred_currency_input := NEW.raw_user_meta_data ->> 'preferred_currency';
  
  SELECT ae.tenant_id, ae.default_role, ae.branch_id 
  INTO existing_tenant_id, existing_role, assigned_branch_id
  FROM public.authorized_emails ae
  WHERE LOWER(ae.email) = LOWER(user_email)
  LIMIT 1;
  
  IF existing_role IS NULL THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := existing_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  IF existing_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role, branch_id, can_access_all_branches)
    VALUES (
      existing_tenant_id, 
      NEW.id, 
      assigned_role,
      assigned_branch_id,
      (assigned_role = 'admin' OR assigned_branch_id IS NULL)
    )
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(company_name_input, user_full_name || '''s Organization'),
      LOWER(REPLACE(COALESCE(company_name_input, user_full_name), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner, can_access_all_branches)
    VALUES (new_tenant_id, NEW.id, 'admin', true, true);
    
    -- NEW: Set billing_status to 'inactive' and trial_expires_at to NULL for new signups
    INSERT INTO public.business_profiles (
      tenant_id, 
      company_name, 
      business_type,
      onboarding_completed,
      billing_status, 
      billing_plan,
      trial_expires_at,
      detected_country,
      preferred_currency,
      inventory_enabled,
      payroll_enabled,
      website_enabled,
      impact_enabled,
      agents_enabled,
      tax_enabled
    )
    VALUES (
      new_tenant_id, 
      COALESCE(company_name_input, user_full_name || '''s Business'),
      NULL,
      false,
      'inactive',     -- Changed from 'trial' to 'inactive'
      'starter',      -- Changed from 'growth' to 'starter' (default starting plan)
      NULL,           -- Changed from NOW() + 7 days to NULL
      detected_country_input,
      COALESCE(preferred_currency_input, 'USD'),
      true,
      true,
      true,
      true,
      true,
      true
    );
    
    INSERT INTO public.tenant_statistics (tenant_id)
    VALUES (new_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
