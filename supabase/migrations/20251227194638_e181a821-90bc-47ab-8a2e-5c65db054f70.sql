-- =====================================================
-- PHASE 2.3: UPDATE RLS POLICIES FOR ALL BUSINESS TABLES
-- =====================================================

-- Drop and recreate policies for inventory
DROP POLICY IF EXISTS "Admins can delete inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Managers and admins can insert inventory" ON public.inventory;

CREATE POLICY "Users can view their tenant inventory" ON public.inventory FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert inventory" ON public.inventory FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update inventory" ON public.inventory FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete inventory" ON public.inventory FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for product_variants
DROP POLICY IF EXISTS "Admins can delete variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can update variants" ON public.product_variants;
DROP POLICY IF EXISTS "Anyone can view active variants" ON public.product_variants;
DROP POLICY IF EXISTS "Managers and admins can insert variants" ON public.product_variants;
DROP POLICY IF EXISTS "Managers and admins can view all variants" ON public.product_variants;

CREATE POLICY "Users can view their tenant variants" ON public.product_variants FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert variants" ON public.product_variants FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update variants" ON public.product_variants FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete variants" ON public.product_variants FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for sales
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Managers and admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

CREATE POLICY "Users can view their tenant sales" ON public.sales FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert sales" ON public.sales FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update sales" ON public.sales FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete sales" ON public.sales FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for sale_items
DROP POLICY IF EXISTS "Authenticated users can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Managers and admins can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admins can delete sale_items" ON public.sale_items;

CREATE POLICY "Users can view their tenant sale_items" ON public.sale_items FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert sale_items" ON public.sale_items FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update sale_items" ON public.sale_items FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete sale_items" ON public.sale_items FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for invoices
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Managers and admins can insert invoices" ON public.invoices;

CREATE POLICY "Users can view their tenant invoices" ON public.invoices FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert invoices" ON public.invoices FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update invoices" ON public.invoices FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for invoice_items
DROP POLICY IF EXISTS "Admins can delete invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Managers and admins can insert invoice items" ON public.invoice_items;

CREATE POLICY "Users can view their tenant invoice_items" ON public.invoice_items FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update invoice_items" ON public.invoice_items FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete invoice_items" ON public.invoice_items FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for quotations
DROP POLICY IF EXISTS "Admins can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "Managers and admins can insert quotations" ON public.quotations;

CREATE POLICY "Users can view their tenant quotations" ON public.quotations FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert quotations" ON public.quotations FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update quotations" ON public.quotations FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete quotations" ON public.quotations FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for quotation_items
DROP POLICY IF EXISTS "Admins can delete quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Admins can update quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can view quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Managers and admins can insert quotation items" ON public.quotation_items;

CREATE POLICY "Users can view their tenant quotation_items" ON public.quotation_items FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert quotation_items" ON public.quotation_items FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update quotation_items" ON public.quotation_items FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete quotation_items" ON public.quotation_items FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for payment_receipts
DROP POLICY IF EXISTS "Admins can delete receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Managers and admins can insert receipts" ON public.payment_receipts;

CREATE POLICY "Users can view their tenant receipts" ON public.payment_receipts FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert receipts" ON public.payment_receipts FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can delete receipts" ON public.payment_receipts FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for expenses
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers and admins can insert expenses" ON public.expenses;

CREATE POLICY "Users can view their tenant expenses" ON public.expenses FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert expenses" ON public.expenses FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update expenses" ON public.expenses FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for accounts_payable
DROP POLICY IF EXISTS "Admins can delete accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Admins can update accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can view accounts payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Managers and admins can insert accounts payable" ON public.accounts_payable;

CREATE POLICY "Users can view their tenant accounts_payable" ON public.accounts_payable FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert accounts_payable" ON public.accounts_payable FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update accounts_payable" ON public.accounts_payable FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete accounts_payable" ON public.accounts_payable FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for employees
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Managers and admins can insert employees" ON public.employees;

CREATE POLICY "Users can view their tenant employees" ON public.employees FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert employees" ON public.employees FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for employee_attendance
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "Managers and admins can insert attendance" ON public.employee_attendance;

CREATE POLICY "Users can view their tenant attendance" ON public.employee_attendance FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert attendance" ON public.employee_attendance FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update attendance" ON public.employee_attendance FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete attendance" ON public.employee_attendance FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for employee_documents
DROP POLICY IF EXISTS "Admins can delete employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Authenticated users can view employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Managers and admins can insert employee documents" ON public.employee_documents;

CREATE POLICY "Users can view their tenant documents" ON public.employee_documents FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert documents" ON public.employee_documents FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can delete documents" ON public.employee_documents FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Drop and recreate policies for payroll_records
DROP POLICY IF EXISTS "Admins can delete payroll" ON public.payroll_records;
DROP POLICY IF EXISTS "Admins can update payroll" ON public.payroll_records;
DROP POLICY IF EXISTS "Authenticated users can view payroll" ON public.payroll_records;
DROP POLICY IF EXISTS "Managers and admins can insert payroll" ON public.payroll_records;

CREATE POLICY "Users can view their tenant payroll" ON public.payroll_records FOR SELECT USING (public.user_belongs_to_tenant(tenant_id));
CREATE POLICY "Admins/managers can insert payroll" ON public.payroll_records FOR INSERT WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));
CREATE POLICY "Admins can update payroll" ON public.payroll_records FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Admins can delete payroll" ON public.payroll_records FOR DELETE USING (public.is_tenant_admin(tenant_id));