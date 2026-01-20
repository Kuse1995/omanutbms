-- Create helper function for sales-capable roles
CREATE OR REPLACE FUNCTION public.can_record_sales(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'sales_rep', 'cashier')
  )
$$;

-- Drop existing restrictive INSERT policies on sales_transactions
DROP POLICY IF EXISTS "Users can insert sales transactions" ON public.sales_transactions;
DROP POLICY IF EXISTS "Admins and managers can insert sales" ON public.sales_transactions;

-- Create new INSERT policy allowing sales-capable roles
CREATE POLICY "Sales roles can insert transactions"
ON public.sales_transactions
FOR INSERT
WITH CHECK (
  public.can_record_sales(tenant_id)
);

-- Drop existing restrictive INSERT policies on payment_receipts
DROP POLICY IF EXISTS "Users can insert payment receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Admins and managers can insert receipts" ON public.payment_receipts;

-- Create new INSERT policy allowing sales-capable roles
CREATE POLICY "Sales roles can insert receipts"
ON public.payment_receipts
FOR INSERT
WITH CHECK (
  public.can_record_sales(tenant_id)
);

-- Update inventory UPDATE policy to allow stock decrements for sales
DROP POLICY IF EXISTS "Admins can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can update inventory" ON public.inventory;

-- Admin/manager can do full inventory updates, sales roles can update stock
CREATE POLICY "Inventory update policy"
ON public.inventory
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.is_tenant_admin_or_manager(tenant_id) OR public.can_record_sales(tenant_id)
);