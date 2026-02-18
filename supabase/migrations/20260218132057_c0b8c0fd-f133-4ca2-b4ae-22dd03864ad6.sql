
-- 1. Fix sales table: operations_manager can insert
DROP POLICY IF EXISTS "Admins/managers can insert sales" ON public.sales;
CREATE POLICY "Sales roles can insert sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));

-- 2. Fix invoices table: operations_manager can create invoices (for credit sales)
CREATE POLICY "Sales roles can insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));

-- 3. Fix invoice_items table: operations_manager can insert line items
CREATE POLICY "Sales roles can insert invoice_items"
ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));
