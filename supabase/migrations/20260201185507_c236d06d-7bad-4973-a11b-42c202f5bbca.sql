-- Add onboarding_completed column to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create job_cards table for auto shop repair services
CREATE TABLE public.job_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Vehicle information
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_reg TEXT,
  vehicle_vin TEXT,
  odometer_reading INTEGER,
  
  -- Job details
  customer_complaint TEXT,
  diagnosis TEXT,
  work_required JSONB DEFAULT '[]'::jsonb,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Pricing
  estimated_labor_hours NUMERIC(10,2),
  labor_rate NUMERIC(10,2),
  parts_total NUMERIC(10,2) DEFAULT 0,
  labor_total NUMERIC(10,2) DEFAULT 0,
  quoted_total NUMERIC(10,2) DEFAULT 0,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'diagnosing', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready', 'collected', 'cancelled')),
  
  -- Assignments
  assigned_technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  -- Dates
  intake_date DATE DEFAULT CURRENT_DATE,
  promised_date DATE,
  completed_date DATE,
  
  -- Links
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  
  -- Demo mode support
  is_demo BOOLEAN DEFAULT FALSE,
  demo_session_id TEXT,
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for job_number per tenant
ALTER TABLE public.job_cards 
ADD CONSTRAINT job_cards_tenant_job_number_unique UNIQUE (tenant_id, job_number);

-- Enable RLS
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_cards
CREATE POLICY "Users can view job cards in their tenant"
ON public.job_cards FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can create job cards in their tenant"
ON public.job_cards FOR INSERT
WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update job cards in their tenant"
ON public.job_cards FOR UPDATE
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete job cards in their tenant"
ON public.job_cards FOR DELETE
USING (public.is_tenant_admin_or_manager(tenant_id));

-- Auto-generate job_number
CREATE OR REPLACE FUNCTION public.generate_job_card_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
BEGIN
  IF NEW.job_number IS NOT NULL AND NEW.job_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := 'JC' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(job_number, '^JC\d{4}-', ''),
        '[^0-9].*$', ''
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.job_cards
  WHERE job_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;
  
  NEW.job_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_job_card_number_trigger
BEFORE INSERT ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.generate_job_card_number();

-- Auto-set tenant_id
CREATE TRIGGER set_job_cards_tenant_id
BEFORE INSERT ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_id();

-- Auto-update updated_at
CREATE TRIGGER update_job_cards_updated_at
BEFORE UPDATE ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logging for job_cards
CREATE TRIGGER audit_job_cards_insert
AFTER INSERT ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.audit_table_insert();

CREATE TRIGGER audit_job_cards_update
AFTER UPDATE ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.audit_table_update();

CREATE TRIGGER audit_job_cards_delete
AFTER DELETE ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.audit_table_delete();

-- Create indexes for performance
CREATE INDEX idx_job_cards_tenant_id ON public.job_cards(tenant_id);
CREATE INDEX idx_job_cards_status ON public.job_cards(tenant_id, status);
CREATE INDEX idx_job_cards_customer_id ON public.job_cards(customer_id);
CREATE INDEX idx_job_cards_technician_id ON public.job_cards(assigned_technician_id);
CREATE INDEX idx_job_cards_intake_date ON public.job_cards(tenant_id, intake_date DESC);