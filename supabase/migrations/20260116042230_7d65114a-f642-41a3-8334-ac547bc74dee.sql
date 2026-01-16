-- 1. Add WhatsApp usage tracking columns to billing_plan_configs
ALTER TABLE public.billing_plan_configs
ADD COLUMN IF NOT EXISTS whatsapp_monthly_limit integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS whatsapp_limit_enabled boolean DEFAULT true;

-- 2. Add WhatsApp usage tracking to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS whatsapp_messages_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_usage_reset_date date DEFAULT CURRENT_DATE;

-- 3. Create a table to track WhatsApp message usage per tenant per month
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number text NOT NULL,
  user_id uuid,
  message_direction text NOT NULL DEFAULT 'outbound' CHECK (message_direction IN ('inbound', 'outbound')),
  intent text,
  success boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on whatsapp_usage_logs
ALTER TABLE public.whatsapp_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for whatsapp_usage_logs
CREATE POLICY "Tenant users can view their usage logs" 
  ON public.whatsapp_usage_logs FOR SELECT 
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Service role can insert usage logs" 
  ON public.whatsapp_usage_logs FOR INSERT 
  WITH CHECK (true);

-- 4. Add link between payroll_records and expenses for audit
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS payroll_record_id uuid REFERENCES public.payroll_records(id) ON DELETE SET NULL;

-- 5. Enable WhatsApp feature for ALL plans with different limits
UPDATE public.billing_plan_configs
SET 
  feature_whatsapp = true,
  whatsapp_monthly_limit = CASE 
    WHEN plan_key = 'starter' THEN 50
    WHEN plan_key = 'growth' THEN 500
    WHEN plan_key = 'enterprise' THEN 0  -- 0 = unlimited
  END,
  whatsapp_limit_enabled = CASE 
    WHEN plan_key = 'enterprise' THEN false  -- Unlimited for enterprise
    ELSE true
  END,
  updated_at = now();

-- 6. Create database trigger to auto-create expense when payroll is marked as paid
CREATE OR REPLACE FUNCTION public.create_expense_on_payroll_paid()
RETURNS TRIGGER AS $$
DECLARE
  employee_name text;
  pay_period text;
BEGIN
  -- Only trigger when status changes to 'paid' and it wasn't paid before
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get employee name if available
    SELECT full_name INTO employee_name
    FROM public.employees
    WHERE id = NEW.employee_id;
    
    -- Format pay period
    pay_period := to_char(NEW.pay_period_start::date, 'Month YYYY');
    
    -- Check if expense already exists for this payroll record
    IF NOT EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE payroll_record_id = NEW.id
    ) THEN
      -- Create expense record linked to payroll
      INSERT INTO public.expenses (
        tenant_id,
        date_incurred,
        category,
        amount_zmw,
        vendor_name,
        notes,
        recorded_by,
        payroll_record_id
      ) VALUES (
        NEW.tenant_id,
        COALESCE(NEW.paid_date, CURRENT_DATE),
        'Salaries & Wages',
        NEW.net_pay,
        COALESCE(employee_name, 'Employee Payroll'),
        'Payroll: ' || COALESCE(employee_name, 'Employee') || ' - ' || pay_period,
        NEW.approved_by,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_create_expense_on_payroll_paid ON public.payroll_records;

CREATE TRIGGER trigger_create_expense_on_payroll_paid
  AFTER UPDATE ON public.payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expense_on_payroll_paid();

-- Also create trigger for INSERT (in case payroll is created with status=paid directly)
DROP TRIGGER IF EXISTS trigger_create_expense_on_payroll_paid_insert ON public.payroll_records;

CREATE TRIGGER trigger_create_expense_on_payroll_paid_insert
  AFTER INSERT ON public.payroll_records
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION public.create_expense_on_payroll_paid();

-- 7. Update existing business_profiles to enable WhatsApp for all tenants
UPDATE public.business_profiles
SET whatsapp_enabled = true
WHERE whatsapp_enabled IS NULL OR whatsapp_enabled = false;

-- 8. Create index for faster usage log queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_logs_tenant_date 
  ON public.whatsapp_usage_logs(tenant_id, created_at);

-- 9. Add realtime for usage logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_usage_logs;