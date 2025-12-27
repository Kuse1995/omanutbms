-- =====================================================
-- PHASE 1.2: ADD tenant_id TO ALL EXISTING BUSINESS TABLES
-- =====================================================

-- Add tenant_id to inventory
ALTER TABLE public.inventory ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to product_variants
ALTER TABLE public.product_variants ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to sales
ALTER TABLE public.sales ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to sale_items
ALTER TABLE public.sale_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to sales_transactions
ALTER TABLE public.sales_transactions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to transactions
ALTER TABLE public.transactions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to invoices
ALTER TABLE public.invoices ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to invoice_items
ALTER TABLE public.invoice_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to quotations
ALTER TABLE public.quotations ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to quotation_items
ALTER TABLE public.quotation_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to payment_receipts
ALTER TABLE public.payment_receipts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to expenses
ALTER TABLE public.expenses ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to accounts_payable
ALTER TABLE public.accounts_payable ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to financial_reports
ALTER TABLE public.financial_reports ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to employees
ALTER TABLE public.employees ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to employee_attendance
ALTER TABLE public.employee_attendance ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to employee_documents
ALTER TABLE public.employee_documents ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to payroll_records
ALTER TABLE public.payroll_records ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to agent_applications
ALTER TABLE public.agent_applications ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to agent_inventory
ALTER TABLE public.agent_inventory ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to agent_transactions
ALTER TABLE public.agent_transactions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to impact_metrics
ALTER TABLE public.impact_metrics ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to impact_certificates
ALTER TABLE public.impact_certificates ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to wash_forums
ALTER TABLE public.wash_forums ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to community_messages
ALTER TABLE public.community_messages ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to donation_requests
ALTER TABLE public.donation_requests ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to hero_announcements
ALTER TABLE public.hero_announcements ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to website_contacts
ALTER TABLE public.website_contacts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to admin_alerts
ALTER TABLE public.admin_alerts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to audit_log
ALTER TABLE public.audit_log ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to transaction_audit_log
ALTER TABLE public.transaction_audit_log ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to authorized_emails
ALTER TABLE public.authorized_emails ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to user_roles (roles are now per-tenant)
ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON public.inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON public.product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant ON public.sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_tenant ON public.sales_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON public.invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON public.quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_tenant ON public.quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_tenant ON public.payment_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_tenant ON public.accounts_payable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_tenant ON public.financial_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_tenant ON public.employee_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_tenant ON public.employee_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_tenant ON public.payroll_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_tenant ON public.agent_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_inventory_tenant ON public.agent_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_tenant ON public.agent_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_tenant ON public.impact_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impact_certificates_tenant ON public.impact_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wash_forums_tenant ON public.wash_forums(tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_tenant ON public.community_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_donation_requests_tenant ON public.donation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON public.blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hero_announcements_tenant ON public.hero_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_contacts_tenant ON public.website_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_tenant ON public.admin_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_tenant ON public.transaction_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_tenant ON public.authorized_emails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);