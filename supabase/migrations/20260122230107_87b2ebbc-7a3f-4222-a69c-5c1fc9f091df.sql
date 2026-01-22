-- Add QC tracking fields to custom_orders table
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS qc_checks jsonb DEFAULT '[]';
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS qc_notes text;
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS qc_completed_at timestamptz;
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS qc_completed_by uuid REFERENCES auth.users(id);

-- Add index for QC queries
CREATE INDEX IF NOT EXISTS idx_custom_orders_qc_completed ON public.custom_orders(qc_completed_at) WHERE qc_completed_at IS NOT NULL;