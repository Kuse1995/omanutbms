-- Add user_id column to employees table to link employees to auth users
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Create index for tenant + user combo lookup
CREATE INDEX IF NOT EXISTS idx_employees_tenant_user ON public.employees(tenant_id, user_id);

-- Add RLS policy for employees to update their own record
CREATE POLICY "Employees can update own record" 
ON public.employees 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);