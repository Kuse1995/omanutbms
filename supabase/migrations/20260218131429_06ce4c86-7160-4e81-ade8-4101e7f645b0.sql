-- Fix sales_transactions INSERT RLS: the existing policies fail when tenant_id is null
-- or when the user is a sales_rep/cashier (only covered by one of two policies).
-- Drop the old admin/manager-only policy and replace with a unified one that covers
-- all sales roles AND handles the nullable tenant_id correctly.

DROP POLICY IF EXISTS "Admins/managers can insert sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "Sales roles can insert transactions" ON public.sales_transactions;

-- Unified INSERT policy: any authenticated user who belongs to the tenant can insert,
-- covering admin, manager, sales_rep, cashier roles via can_record_sales.
-- Also handles the case where tenant_id might be resolved via get_user_tenant_id().
CREATE POLICY "Sales roles can insert transactions"
ON public.sales_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND can_record_sales(tenant_id)
);

-- Also ensure admins/managers have insert access as a fallback
CREATE POLICY "Admins and managers can insert sales transactions"
ON public.sales_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND is_tenant_admin_or_manager(tenant_id)
);