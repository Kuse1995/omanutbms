-- Fix payroll trigger to use correct expense category
-- The trigger was using 'Salaries & Wages' but the expenses table constraint only allows 'Salaries'

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
        'Salaries',  -- FIXED: Changed from 'Salaries & Wages' to match constraint
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
