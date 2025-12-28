-- Auto-provision tenant membership from authorized email / invitation

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

  -- Prefer authorized_emails
  SELECT tenant_id, default_role
  INTO v_tenant_id, v_role
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

  -- Insert membership if missing
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users WHERE tenant_id = v_tenant_id AND user_id = v_uid
  ) THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_owner)
    VALUES (v_tenant_id, v_uid, COALESCE(v_role, 'viewer'::app_role), false);
  END IF;

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_tenant_membership() TO authenticated;
