-- Drop the existing FK constraint and recreate with SET NULL on delete
-- This allows audit log entries to remain even after the tenant is deleted

ALTER TABLE public.audit_log
DROP CONSTRAINT IF EXISTS audit_log_tenant_id_fkey;

ALTER TABLE public.audit_log
ADD CONSTRAINT audit_log_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE SET NULL;

-- Also fix transaction_audit_log if it has the same issue
ALTER TABLE public.transaction_audit_log
DROP CONSTRAINT IF EXISTS transaction_audit_log_tenant_id_fkey;

ALTER TABLE public.transaction_audit_log
ADD CONSTRAINT transaction_audit_log_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE SET NULL;