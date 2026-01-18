-- Add cost_price column to inventory table for tracking product/service costs
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Add a comment to explain the column
COMMENT ON COLUMN public.inventory.cost_price IS 'Cost price of the product/service used to calculate profit margin';