-- Backfill user_roles from tenant_users for users missing entries
INSERT INTO public.user_roles (user_id, role)
SELECT tu.user_id, tu.role
FROM public.tenant_users tu
LEFT JOIN public.user_roles ur ON ur.user_id = tu.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update ensure_tenant_membership function to also sync user_roles
CREATE OR REPLACE FUNCTION public.ensure_tenant_membership()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Ensure user_roles is synced even for existing members
    INSERT INTO public.user_roles (user_id, role)
    SELECT v_uid, tu.role
    FROM public.tenant_users tu
    WHERE tu.user_id = v_uid AND tu.tenant_id = v_tenant_id
    LIMIT 1
    ON CONFLICT (user_id, role) DO NOTHING;
    
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

  -- Also sync to user_roles table for consistency
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, COALESCE(v_role, 'viewer'::app_role))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_tenant_id;
END;
$function$;