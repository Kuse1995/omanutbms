-- Create a reusable trigger function that auto-fills tenant_id on INSERT
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If tenant_id is not set, fill it from the user's tenant membership
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  
  -- If still null after attempting to get user's tenant, raise an error
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required - user has no tenant membership or is not authenticated';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add triggers to tenant-scoped tables
-- Note: Not adding to tables with public INSERT policies (agent_applications, donation_requests, community_messages, etc.)

-- invoices
DROP TRIGGER IF EXISTS set_tenant_id_invoices ON public.invoices;
CREATE TRIGGER set_tenant_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- invoice_items
DROP TRIGGER IF EXISTS set_tenant_id_invoice_items ON public.invoice_items;
CREATE TRIGGER set_tenant_id_invoice_items
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- quotations
DROP TRIGGER IF EXISTS set_tenant_id_quotations ON public.quotations;
CREATE TRIGGER set_tenant_id_quotations
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- quotation_items
DROP TRIGGER IF EXISTS set_tenant_id_quotation_items ON public.quotation_items;
CREATE TRIGGER set_tenant_id_quotation_items
  BEFORE INSERT ON public.quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- payment_receipts
DROP TRIGGER IF EXISTS set_tenant_id_payment_receipts ON public.payment_receipts;
CREATE TRIGGER set_tenant_id_payment_receipts
  BEFORE INSERT ON public.payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- accounts_payable
DROP TRIGGER IF EXISTS set_tenant_id_accounts_payable ON public.accounts_payable;
CREATE TRIGGER set_tenant_id_accounts_payable
  BEFORE INSERT ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- expenses
DROP TRIGGER IF EXISTS set_tenant_id_expenses ON public.expenses;
CREATE TRIGGER set_tenant_id_expenses
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- employees
DROP TRIGGER IF EXISTS set_tenant_id_employees ON public.employees;
CREATE TRIGGER set_tenant_id_employees
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- employee_attendance
DROP TRIGGER IF EXISTS set_tenant_id_employee_attendance ON public.employee_attendance;
CREATE TRIGGER set_tenant_id_employee_attendance
  BEFORE INSERT ON public.employee_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- payroll_records
DROP TRIGGER IF EXISTS set_tenant_id_payroll_records ON public.payroll_records;
CREATE TRIGGER set_tenant_id_payroll_records
  BEFORE INSERT ON public.payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- inventory
DROP TRIGGER IF EXISTS set_tenant_id_inventory ON public.inventory;
CREATE TRIGGER set_tenant_id_inventory
  BEFORE INSERT ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- product_variants
DROP TRIGGER IF EXISTS set_tenant_id_product_variants ON public.product_variants;
CREATE TRIGGER set_tenant_id_product_variants
  BEFORE INSERT ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- agent_inventory
DROP TRIGGER IF EXISTS set_tenant_id_agent_inventory ON public.agent_inventory;
CREATE TRIGGER set_tenant_id_agent_inventory
  BEFORE INSERT ON public.agent_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- agent_transactions
DROP TRIGGER IF EXISTS set_tenant_id_agent_transactions ON public.agent_transactions;
CREATE TRIGGER set_tenant_id_agent_transactions
  BEFORE INSERT ON public.agent_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- sales_transactions
DROP TRIGGER IF EXISTS set_tenant_id_sales_transactions ON public.sales_transactions;
CREATE TRIGGER set_tenant_id_sales_transactions
  BEFORE INSERT ON public.sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- sales
DROP TRIGGER IF EXISTS set_tenant_id_sales ON public.sales;
CREATE TRIGGER set_tenant_id_sales
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- sale_items
DROP TRIGGER IF EXISTS set_tenant_id_sale_items ON public.sale_items;
CREATE TRIGGER set_tenant_id_sale_items
  BEFORE INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- hero_announcements
DROP TRIGGER IF EXISTS set_tenant_id_hero_announcements ON public.hero_announcements;
CREATE TRIGGER set_tenant_id_hero_announcements
  BEFORE INSERT ON public.hero_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- blog_posts
DROP TRIGGER IF EXISTS set_tenant_id_blog_posts ON public.blog_posts;
CREATE TRIGGER set_tenant_id_blog_posts
  BEFORE INSERT ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- impact_metrics
DROP TRIGGER IF EXISTS set_tenant_id_impact_metrics ON public.impact_metrics;
CREATE TRIGGER set_tenant_id_impact_metrics
  BEFORE INSERT ON public.impact_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- impact_certificates
DROP TRIGGER IF EXISTS set_tenant_id_impact_certificates ON public.impact_certificates;
CREATE TRIGGER set_tenant_id_impact_certificates
  BEFORE INSERT ON public.impact_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- financial_reports
DROP TRIGGER IF EXISTS set_tenant_id_financial_reports ON public.financial_reports;
CREATE TRIGGER set_tenant_id_financial_reports
  BEFORE INSERT ON public.financial_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- admin_alerts
DROP TRIGGER IF EXISTS set_tenant_id_admin_alerts ON public.admin_alerts;
CREATE TRIGGER set_tenant_id_admin_alerts
  BEFORE INSERT ON public.admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- audit_log
DROP TRIGGER IF EXISTS set_tenant_id_audit_log ON public.audit_log;
CREATE TRIGGER set_tenant_id_audit_log
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- authorized_emails
DROP TRIGGER IF EXISTS set_tenant_id_authorized_emails ON public.authorized_emails;
CREATE TRIGGER set_tenant_id_authorized_emails
  BEFORE INSERT ON public.authorized_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- employee_documents
DROP TRIGGER IF EXISTS set_tenant_id_employee_documents ON public.employee_documents;
CREATE TRIGGER set_tenant_id_employee_documents
  BEFORE INSERT ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();