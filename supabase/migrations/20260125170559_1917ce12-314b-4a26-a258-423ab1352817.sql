-- Add sourcing-related columns to quotation_items
ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS is_sourcing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_time TEXT,
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;

-- Add global estimated delivery date to quotations
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Add sourcing columns to invoice_items for tracking when converting
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS is_sourcing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_time TEXT,
ADD COLUMN IF NOT EXISTS sourcing_status TEXT DEFAULT 'pending' CHECK (sourcing_status IN ('pending', 'ordered', 'received', 'cancelled')),
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;

-- Add customizable sourcing label to business_profiles for white-label
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS sourcing_label TEXT DEFAULT 'Sourcing';

-- Add comment for documentation
COMMENT ON COLUMN public.quotation_items.is_sourcing IS 'True if item has 0 stock and requires sourcing';
COMMENT ON COLUMN public.quotation_items.lead_time IS 'Delivery timeline e.g. 3-5 Business Days';
COMMENT ON COLUMN public.invoice_items.sourcing_status IS 'Status of sourcing: pending, ordered, received, cancelled';
COMMENT ON COLUMN public.business_profiles.sourcing_label IS 'Customizable label for sourcing items (e.g., Pre-order, Back-order)';