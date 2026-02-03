-- Fix audit trigger functions: Remove ::text cast from record_id 
-- since audit_log.record_id is UUID type

-- Fix INSERT trigger
CREATE OR REPLACE FUNCTION public.audit_table_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    NEW.id,
    'INSERT', 
    to_jsonb(NEW), 
    auth.uid(),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix UPDATE trigger
CREATE OR REPLACE FUNCTION public.audit_table_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, changed_by, tenant_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix DELETE trigger
CREATE OR REPLACE FUNCTION public.audit_table_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    OLD.id,
    'DELETE', 
    to_jsonb(OLD), 
    auth.uid(),
    OLD.tenant_id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;