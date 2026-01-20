-- Update handle_new_user to include branch_id from authorized_emails

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
BEGIN
  -- Get the user's email
  user_email := NEW.email;
  
  -- Check if this email has a predefined tenant, role, and branch in authorized_emails
  SELECT ae.tenant_id, ae.default_role, ae.branch_id 
  INTO existing_tenant_id, existing_role, assigned_branch_id
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
    -- Admins get can_access_all_branches = true, others get their assigned branch
    INSERT INTO public.tenant_users (tenant_id, user_id, role, branch_id, can_access_all_branches)
    VALUES (
      existing_tenant_id, 
      NEW.id, 
      assigned_role,
      assigned_branch_id,
      (assigned_role = 'admin' OR assigned_branch_id IS NULL)
    );
  ELSE
    -- Create a new tenant for this user (they become the owner/admin)
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1)) || '''s Organization',
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(user_email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add user as tenant owner/admin with full branch access
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner, can_access_all_branches)
    VALUES (new_tenant_id, NEW.id, 'admin', true, true);
    
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

-- Update ensure_tenant_membership to include branch_id from authorized_emails

CREATE OR REPLACE FUNCTION public.ensure_tenant_membership()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower((auth.jwt() ->> 'email'));
  v_tenant_id uuid;
  v_role app_role;
  v_branch_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If user already has a tenant, return it
  SELECT tenant_id
  INTO v_tenant_id
  FROM public.tenant_users
  WHERE user_id = v_uid
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  -- Prefer authorized_emails - now also gets branch_id
  SELECT tenant_id, default_role, branch_id
  INTO v_tenant_id, v_role, v_branch_id
  FROM public.authorized_emails
  WHERE lower(email) = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  -- Fallback: tenant invitations (if used)
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id, role
    INTO v_tenant_id, v_role
    FROM public.tenant_invitations
    WHERE lower(email) = v_email
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      UPDATE public.tenant_invitations
      SET accepted_at = COALESCE(accepted_at, now())
      WHERE lower(email) = v_email
        AND tenant_id = v_tenant_id
        AND expires_at > now();
    END IF;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert membership if missing - now includes branch_id and can_access_all_branches logic
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users WHERE tenant_id = v_tenant_id AND user_id = v_uid
  ) THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner, branch_id, can_access_all_branches)
    VALUES (
      v_tenant_id, 
      v_uid, 
      COALESCE(v_role, 'viewer'::app_role), 
      false,
      v_branch_id,
      (COALESCE(v_role, 'viewer'::app_role) = 'admin' OR v_branch_id IS NULL)
    );
  END IF;

  RETURN v_tenant_id;
END;
$$;