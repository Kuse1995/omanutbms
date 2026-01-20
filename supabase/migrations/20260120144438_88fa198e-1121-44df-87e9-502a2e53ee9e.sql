-- Create inventory_adjustments table for tracking returns, damages, and stock corrections
CREATE TABLE public.inventory_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('return', 'damage', 'loss', 'correction', 'expired')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  customer_name TEXT,
  original_sale_id UUID REFERENCES public.sales(id),
  cost_impact NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  processed_by UUID,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  return_to_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add expiry tracking columns to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT false;

-- Enable Row Level Security
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_adjustments
CREATE POLICY "Users can view adjustments for their tenant"
ON public.inventory_adjustments
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert adjustments for their tenant"
ON public.inventory_adjustments
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Managers can update adjustments for their tenant"
ON public.inventory_adjustments
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete adjustments for their tenant"
ON public.inventory_adjustments
FOR DELETE
USING (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.role = 'admin'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_inventory_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_adjustments_updated_at
BEFORE UPDATE ON public.inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_adjustments_updated_at();

-- Create index for faster queries
CREATE INDEX idx_inventory_adjustments_tenant_id ON public.inventory_adjustments(tenant_id);
CREATE INDEX idx_inventory_adjustments_inventory_id ON public.inventory_adjustments(inventory_id);
CREATE INDEX idx_inventory_adjustments_type ON public.inventory_adjustments(adjustment_type);
CREATE INDEX idx_inventory_adjustments_status ON public.inventory_adjustments(status);
CREATE INDEX idx_inventory_expiry_date ON public.inventory(expiry_date) WHERE expiry_date IS NOT NULL;

-- Enable realtime for inventory_adjustments
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_adjustments;