-- Create helper function for HR-capable roles
CREATE OR REPLACE FUNCTION public.can_manage_hr(_tenant_id uuid)
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
      AND role IN ('admin', 'manager', 'hr_manager')
  )
$$;

-- Create helper function for accounting-capable roles
CREATE OR REPLACE FUNCTION public.can_manage_accounts(_tenant_id uuid)
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
      AND role IN ('admin', 'manager', 'accountant')
  )
$$;

-- =============================================
-- FIX SALE_ITEMS POLICIES
-- =============================================

-- Drop existing/duplicate INSERT policies on sale_items
DROP POLICY IF EXISTS "Managers and admins can insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins/managers can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Sales roles can insert sale_items" ON public.sale_items;

-- Create new INSERT policy for sale_items using can_record_sales
CREATE POLICY "Sales roles can insert sale_items"
ON public.sale_items
FOR INSERT
WITH CHECK (
  public.can_record_sales(tenant_id)
);

-- =============================================
-- FIX EMPLOYEES TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees" ON public.employees;
DROP POLICY IF EXISTS "HR roles can insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR roles can update employees" ON public.employees;

-- Create new INSERT policy for HR-capable roles
CREATE POLICY "HR roles can insert employees"
ON public.employees
FOR INSERT
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- Create new UPDATE policy for HR-capable roles
CREATE POLICY "HR roles can update employees"
ON public.employees
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- =============================================
-- FIX PAYROLL_RECORDS TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Admins can update payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Users can insert payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Users can update payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "HR roles can insert payroll_records" ON public.payroll_records;
DROP POLICY IF EXISTS "HR roles can update payroll_records" ON public.payroll_records;

-- Create new INSERT policy for HR-capable roles
CREATE POLICY "HR roles can insert payroll_records"
ON public.payroll_records
FOR INSERT
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- Create new UPDATE policy for HR-capable roles
CREATE POLICY "HR roles can update payroll_records"
ON public.payroll_records
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- =============================================
-- FIX EMPLOYEE_ATTENDANCE TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Users can insert attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Users can update attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "HR roles can insert attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "HR roles can update attendance" ON public.employee_attendance;

-- Create new INSERT policy for HR-capable roles
CREATE POLICY "HR roles can insert attendance"
ON public.employee_attendance
FOR INSERT
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- Create new UPDATE policy for HR-capable roles
CREATE POLICY "HR roles can update attendance"
ON public.employee_attendance
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_hr(tenant_id)
);

-- =============================================
-- FIX EXPENSES TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Accounting roles can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Accounting roles can update expenses" ON public.expenses;

-- Create new INSERT policy for accounting-capable roles
CREATE POLICY "Accounting roles can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- Create new UPDATE policy for accounting-capable roles
CREATE POLICY "Accounting roles can update expenses"
ON public.expenses
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- =============================================
-- FIX INVOICES TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Accounting roles can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Accounting roles can update invoices" ON public.invoices;

-- Create new INSERT policy for accounting-capable roles
CREATE POLICY "Accounting roles can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- Create new UPDATE policy for accounting-capable roles
CREATE POLICY "Accounting roles can update invoices"
ON public.invoices
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- =============================================
-- FIX INVOICE_ITEMS TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Accounting roles can insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Accounting roles can update invoice_items" ON public.invoice_items;

-- Create new INSERT policy for accounting-capable roles
CREATE POLICY "Accounting roles can insert invoice_items"
ON public.invoice_items
FOR INSERT
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- Create new UPDATE policy for accounting-capable roles
CREATE POLICY "Accounting roles can update invoice_items"
ON public.invoice_items
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- =============================================
-- FIX ACCOUNTS_PAYABLE TABLE POLICIES
-- =============================================

-- Drop existing restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Admins and managers can insert accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Admins can update accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Users can insert accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Users can update accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Accounting roles can insert accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Accounting roles can update accounts_payable" ON public.accounts_payable;

-- Create new INSERT policy for accounting-capable roles
CREATE POLICY "Accounting roles can insert accounts_payable"
ON public.accounts_payable
FOR INSERT
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);

-- Create new UPDATE policy for accounting-capable roles
CREATE POLICY "Accounting roles can update accounts_payable"
ON public.accounts_payable
FOR UPDATE
USING (
  public.user_belongs_to_tenant(tenant_id)
)
WITH CHECK (
  public.can_manage_accounts(tenant_id)
);