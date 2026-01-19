-- Create a table to track restock history
CREATE TABLE public.restock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  cost_per_unit NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  recorded_as_expense BOOLEAN DEFAULT false,
  notes TEXT,
  restocked_by UUID,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restock_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view restock history for their tenant"
ON public.restock_history FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert restock history for their tenant"
ON public.restock_history FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.restock_history;

-- Add index for faster queries
CREATE INDEX idx_restock_history_tenant ON public.restock_history(tenant_id);
CREATE INDEX idx_restock_history_inventory ON public.restock_history(inventory_id);
CREATE INDEX idx_restock_history_created ON public.restock_history(created_at DESC);