
-- Create a function to sync user roles by email across all relevant tables
CREATE OR REPLACE FUNCTION public.sync_user_role_by_email(
  p_email TEXT,
  p_new_role TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB := '{"updated": false}'::jsonb;
BEGIN
  -- Look up the user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'User not found with that email');
  END IF;

  -- Update tenant_users role for this specific user + tenant
  UPDATE public.tenant_users
  SET role = p_new_role::app_role,
      can_access_all_branches = (p_new_role = 'admin')
  WHERE user_id = v_user_id
    AND tenant_id = p_tenant_id;

  -- Update user_roles for this user
  UPDATE public.user_roles
  SET role = p_new_role::app_role
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('updated', true, 'user_id', v_user_id::text);
END;
$$;
