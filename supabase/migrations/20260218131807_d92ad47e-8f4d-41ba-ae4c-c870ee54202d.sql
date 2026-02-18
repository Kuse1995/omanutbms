
-- Fix: operations_manager role was excluded from can_record_sales(), 
-- causing RLS violations for users like Titus at House of Dodo.
-- operations_managers need to record sales as part of their workflow.

CREATE OR REPLACE FUNCTION public.can_record_sales(_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'operations_manager', 'sales_rep', 'cashier')
  )
$function$;
