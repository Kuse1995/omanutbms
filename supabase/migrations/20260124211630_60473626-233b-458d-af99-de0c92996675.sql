-- Fix tenant deletion failing due to audit triggers inserting into audit_log
-- When a tenant is deleted, CASCADE deletes rows in audited tables, which insert into audit_log
-- A foreign key from audit_log.tenant_id -> tenants.id makes those inserts fail mid-delete.
-- audit_log entries should remain even if a tenant is deleted, so we remove this FK.

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_tenant_id_fkey;

-- Keep lookups fast
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON public.audit_log (tenant_id);
