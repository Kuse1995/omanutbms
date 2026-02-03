-- Fix 1: Remove the default value for business_type column
ALTER TABLE public.business_profiles 
ALTER COLUMN business_type DROP DEFAULT;

-- Fix 2: Update existing profiles that have retail + onboarding_completed = false
-- These users never actually chose a business type, so reset to NULL so they see the wizard
UPDATE public.business_profiles 
SET business_type = NULL 
WHERE business_type = 'retail' AND (onboarding_completed = false OR onboarding_completed IS NULL);

-- Fix 3: Update handle_new_user trigger to explicitly set business_type = NULL
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
  
  -- Default to admin if no role found (new signups become admin of their own tenant)
  IF existing_role IS NULL THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := existing_role;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert role into user_roles (FIXED: use both columns to match unique constraint)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Handle tenant assignment
  IF existing_tenant_id IS NOT NULL THEN
    -- User was pre-authorized to join an existing tenant (invited member)
    -- FIXED: use (tenant_id, user_id) to match unique constraint
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
    -- NEW SIGNUP: Create a new tenant for this user (they become the owner/admin)
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(company_name_input, user_full_name || '''s Organization'),
      LOWER(REPLACE(COALESCE(company_name_input, user_full_name), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add user as tenant owner/admin with full branch access
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner, can_access_all_branches)
    VALUES (new_tenant_id, NEW.id, 'admin', true, true);
    
    -- Create business profile with 7-DAY TRIAL, Pro plan as default
    -- IMPORTANT: Explicitly set business_type = NULL and onboarding_completed = false
    -- This ensures the BusinessTypeSetupWizard shows for all new users
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
      -- Enable core features for trial users
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
      NULL,  -- Force NULL so wizard shows
      false, -- Ensure onboarding is not complete
      'trial',
      'growth',  -- Pro plan
      NOW() + INTERVAL '7 days',
      detected_country_input,
      COALESCE(preferred_currency_input, 'USD'),
      -- Default features for trial
      true,  -- inventory_enabled
      true,  -- payroll_enabled
      true,  -- website_enabled
      true,  -- impact_enabled
      true,  -- agents_enabled
      true   -- tax_enabled
    );
    
    -- Create tenant statistics
    INSERT INTO public.tenant_statistics (tenant_id)
    VALUES (new_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;