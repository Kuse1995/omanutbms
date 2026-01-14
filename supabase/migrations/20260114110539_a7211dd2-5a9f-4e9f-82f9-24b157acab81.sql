-- Add hourly rate and pay type to employees table for shift-based workers
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'monthly' CHECK (pay_type IN ('monthly', 'hourly', 'daily', 'per_shift')),
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_rate numeric DEFAULT 0;

-- Add shift_pay and hours_worked columns to payroll_records for shift-based calculations
ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS hours_worked numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shifts_worked integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_pay numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.employees.pay_type IS 'Payment type: monthly (salaried), hourly, daily, or per_shift';
COMMENT ON COLUMN public.employees.hourly_rate IS 'Hourly rate for hourly workers in ZMW';
COMMENT ON COLUMN public.employees.daily_rate IS 'Daily rate for daily workers in ZMW';
COMMENT ON COLUMN public.employees.shift_rate IS 'Per-shift rate for shift workers in ZMW';
COMMENT ON COLUMN public.payroll_records.hours_worked IS 'Total hours worked in pay period (for hourly workers)';
COMMENT ON COLUMN public.payroll_records.shifts_worked IS 'Total shifts worked in pay period (for shift workers)';
COMMENT ON COLUMN public.payroll_records.shift_pay IS 'Calculated pay from shifts/hours';