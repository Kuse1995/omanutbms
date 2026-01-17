-- Fix expenses category check constraint to include 'Salaries & Wages' for payroll integration
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
CHECK (category = ANY (ARRAY[
  'Cost of Goods Sold - Vestergaard',
  'Salaries',
  'Salaries & Wages',
  'Marketing',
  'Operations/Rent',
  'Other'
]));

-- Add audit triggers for payroll_records table
DROP TRIGGER IF EXISTS audit_payroll_insert ON public.payroll_records;
DROP TRIGGER IF EXISTS audit_payroll_update ON public.payroll_records;
DROP TRIGGER IF EXISTS audit_payroll_delete ON public.payroll_records;

CREATE TRIGGER audit_payroll_insert
AFTER INSERT ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();

CREATE TRIGGER audit_payroll_update
AFTER UPDATE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();

CREATE TRIGGER audit_payroll_delete
AFTER DELETE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();