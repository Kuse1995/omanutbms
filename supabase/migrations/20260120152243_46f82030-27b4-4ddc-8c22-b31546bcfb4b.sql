-- Create recurring expenses table
CREATE TABLE public.recurring_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  description TEXT,
  amount_zmw NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  custom_interval_days INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  advance_notice_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expenses_frequency_check CHECK (frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  CONSTRAINT recurring_expenses_category_check CHECK (category IN ('Cost of Goods Sold - Vestergaard', 'Salaries', 'Salaries & Wages', 'Marketing', 'Operations/Rent', 'Other'))
);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view recurring expenses for their tenant" 
ON public.recurring_expenses 
FOR SELECT 
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins and managers can insert recurring expenses" 
ON public.recurring_expenses 
FOR INSERT 
WITH CHECK (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins and managers can update recurring expenses" 
ON public.recurring_expenses 
FOR UPDATE 
USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can delete recurring expenses" 
ON public.recurring_expenses 
FOR DELETE 
USING (public.is_tenant_admin(tenant_id));

-- Create trigger for auto-setting tenant_id
CREATE TRIGGER set_recurring_expenses_tenant_id
  BEFORE INSERT ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Create trigger for updated_at
CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient querying
CREATE INDEX idx_recurring_expenses_tenant_active ON public.recurring_expenses(tenant_id, is_active);
CREATE INDEX idx_recurring_expenses_next_due ON public.recurring_expenses(next_due_date) WHERE is_active = true;

-- Enable realtime for recurring expenses
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_expenses;