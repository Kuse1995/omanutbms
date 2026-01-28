-- Add handoff columns to custom_orders table for Admin/Ops collaboration
ALTER TABLE public.custom_orders 
ADD COLUMN IF NOT EXISTS handoff_step INTEGER,
ADD COLUMN IF NOT EXISTS handoff_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assigned_operations_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS handed_off_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS handed_back_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS handoff_notes TEXT;

-- Add index for efficient querying of assigned orders
CREATE INDEX IF NOT EXISTS idx_custom_orders_assigned_ops 
ON public.custom_orders(assigned_operations_user_id) 
WHERE assigned_operations_user_id IS NOT NULL;

-- Add index for handoff status filtering
CREATE INDEX IF NOT EXISTS idx_custom_orders_handoff_status 
ON public.custom_orders(tenant_id, handoff_status) 
WHERE handoff_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.custom_orders.handoff_step IS 'Step index (0-6) where Operations Officer takes over';
COMMENT ON COLUMN public.custom_orders.handoff_status IS 'pending_handoff, in_progress, handed_back, or completed';
COMMENT ON COLUMN public.custom_orders.assigned_operations_user_id IS 'User ID of assigned Operations Officer';
COMMENT ON COLUMN public.custom_orders.handoff_notes IS 'Notes from Admin to Operations Officer';