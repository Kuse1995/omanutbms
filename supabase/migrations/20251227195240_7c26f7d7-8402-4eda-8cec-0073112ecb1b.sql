-- Update handle_new_user to create tenant and tenant_users entry for new users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  assigned_role app_role;
  new_tenant_id uuid;
  existing_tenant_id uuid;
  existing_role app_role;
BEGIN
  -- Get the user's email
  user_email := NEW.email;
  
  -- Check if this email has a predefined tenant and role in authorized_emails
  SELECT ae.tenant_id, ae.default_role INTO existing_tenant_id, existing_role
  FROM public.authorized_emails ae
  WHERE LOWER(ae.email) = LOWER(user_email)
  LIMIT 1;
  
  -- Default to viewer if no role found
  IF existing_role IS NULL THEN
    assigned_role := 'viewer';
  ELSE
    assigned_role := existing_role;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Insert role into user_roles (for backward compatibility)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  -- Handle tenant assignment
  IF existing_tenant_id IS NOT NULL THEN
    -- User was pre-authorized to join an existing tenant
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (existing_tenant_id, NEW.id, assigned_role);
  ELSE
    -- Create a new tenant for this user (they become the owner/admin)
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1)) || '''s Organization',
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add user as tenant owner/admin
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner)
    VALUES (new_tenant_id, NEW.id, 'admin', true);
    
    -- Create default business profile for the tenant
    INSERT INTO public.business_profiles (tenant_id, company_name)
    VALUES (new_tenant_id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1)) || '''s Business');
    
    -- Create tenant statistics
    INSERT INTO public.tenant_statistics (tenant_id)
    VALUES (new_tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;