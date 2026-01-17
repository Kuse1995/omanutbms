-- Add nhima_deduction column to payroll_records table
ALTER TABLE public.payroll_records 
ADD COLUMN IF NOT EXISTS nhima_deduction numeric NOT NULL DEFAULT 0;