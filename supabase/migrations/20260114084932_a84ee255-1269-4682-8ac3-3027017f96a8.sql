-- Fix audit_table_insert to include tenant_id from the source record
-- This prevents the cascading trigger failure when inserting via service_role
CREATE OR REPLACE FUNCTION public.audit_table_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by,
    tenant_id  -- Include tenant_id from the source record
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'INSERT',
    NULL,
    to_jsonb(NEW),
    COALESCE(auth.uid(), NEW.recorded_by, NEW.created_by),  -- Fallback to recorded_by/created_by if no auth
    NEW.tenant_id  -- Pass tenant_id from the triggering record
  );
  RETURN NEW;
END;
$function$;

-- Also fix audit_table_update to include tenant_id
CREATE OR REPLACE FUNCTION public.audit_table_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by,
    tenant_id
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    COALESCE(auth.uid(), NEW.recorded_by, NEW.created_by),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$function$;

-- Also fix audit_table_delete to include tenant_id
CREATE OR REPLACE FUNCTION public.audit_table_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by,
    tenant_id
  ) VALUES (
    TG_TABLE_NAME,
    OLD.id,
    'DELETE',
    to_jsonb(OLD),
    NULL,
    auth.uid(),
    OLD.tenant_id
  );
  RETURN OLD;
END;
$function$;