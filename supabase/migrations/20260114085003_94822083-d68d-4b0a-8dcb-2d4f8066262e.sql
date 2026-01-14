-- Fix audit_table_insert to handle tables without recorded_by/created_by
-- Use a simpler approach: just pass NULL for changed_by if auth.uid() is null
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
    tenant_id
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'INSERT',
    NULL,
    to_jsonb(NEW),
    auth.uid(),  -- May be NULL for service role calls, that's OK
    NEW.tenant_id  -- Pass tenant_id from the triggering record
  );
  RETURN NEW;
END;
$function$;

-- Fix audit_table_update similarly
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
    auth.uid(),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$function$;

-- Fix audit_table_delete similarly
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