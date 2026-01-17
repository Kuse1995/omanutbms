-- Add item_type column to inventory table to properly distinguish products from services
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';

-- Add a check constraint to ensure valid values
ALTER TABLE public.inventory
ADD CONSTRAINT inventory_item_type_check 
CHECK (item_type IN ('product', 'service', 'item', 'resource'));

-- Update existing services category items to be service type
-- (Categories commonly used for services)
UPDATE public.inventory
SET item_type = 'service',
    current_stock = 9999,
    reorder_level = 0
WHERE category IN ('consultation', 'project', 'retainer', 'training', 'support', 'package', 'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering', 'consultation_fee', 'lab_test', 'procedure', 'vaccination', 'repair', 'maintenance', 'diagnostics', 'service');

-- Update items with 9999 stock (legacy service indicator) to service type
UPDATE public.inventory
SET item_type = 'service'
WHERE current_stock = 9999 AND reorder_level = 0;

-- Add comment for documentation
COMMENT ON COLUMN public.inventory.item_type IS 'Type of inventory item: product (physical goods with stock), service (intangible, no stock tracking), item (generic), resource (educational/institutional)';