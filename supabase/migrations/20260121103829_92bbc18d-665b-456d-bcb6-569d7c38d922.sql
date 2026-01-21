
-- Add super admin SELECT policies to key tables for Usage Analytics Dashboard
-- These policies allow platform super admins to view all data across tenants

-- Inventory: Super admins can view all
CREATE POLICY "Super admins can view all inventory" ON public.inventory
FOR SELECT USING (is_super_admin());

-- Sales: Super admins can view all
CREATE POLICY "Super admins can view all sales" ON public.sales
FOR SELECT USING (is_super_admin());

-- Sales Transactions: Super admins can view all
CREATE POLICY "Super admins can view all sales_transactions" ON public.sales_transactions
FOR SELECT USING (is_super_admin());

-- Invoices: Super admins can view all
CREATE POLICY "Super admins can view all invoices" ON public.invoices
FOR SELECT USING (is_super_admin());

-- Employees: Super admins can view all
CREATE POLICY "Super admins can view all employees" ON public.employees
FOR SELECT USING (is_super_admin());

-- Payment Receipts: Super admins can view all
CREATE POLICY "Super admins can view all payment_receipts" ON public.payment_receipts
FOR SELECT USING (is_super_admin());

-- Payroll Records: Super admins can view all
CREATE POLICY "Super admins can view all payroll_records" ON public.payroll_records
FOR SELECT USING (is_super_admin());

-- Agent Transactions: Super admins can view all
CREATE POLICY "Super admins can view all agent_transactions" ON public.agent_transactions
FOR SELECT USING (is_super_admin());

-- WhatsApp Audit Logs: Super admins can view all
CREATE POLICY "Super admins can view all whatsapp_audit_logs" ON public.whatsapp_audit_logs
FOR SELECT USING (is_super_admin());

-- Tenants: Super admins can view all tenants (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tenants' 
    AND policyname = 'Super admins can view all tenants'
  ) THEN
    CREATE POLICY "Super admins can view all tenants" ON public.tenants
    FOR SELECT USING (is_super_admin());
  END IF;
END $$;
