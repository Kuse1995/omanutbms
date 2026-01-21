-- Add inventory classification for raw materials vs finished goods
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS inventory_class TEXT 
  DEFAULT 'finished_good'
  CHECK (inventory_class IN ('raw_material', 'finished_good', 'consumable'));

-- Add unit of measure for materials (meters, yards, pieces, kg, etc.)
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pcs';

-- Add default storage location reference
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_inventory_class ON public.inventory(inventory_class);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory(default_location_id);

-- Add comment for documentation
COMMENT ON COLUMN public.inventory.inventory_class IS 'Classification: raw_material (fabrics, buttons), finished_good (sellable products), consumable (office supplies)';
COMMENT ON COLUMN public.inventory.unit_of_measure IS 'Unit for measuring stock: pcs, meters, yards, kg, liters, rolls, spools';
COMMENT ON COLUMN public.inventory.default_location_id IS 'Default storage location (warehouse/store/production)';