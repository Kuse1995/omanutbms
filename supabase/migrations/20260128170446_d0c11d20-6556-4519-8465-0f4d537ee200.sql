-- Add is_archived column to inventory table for soft-delete functionality
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create partial index for efficient queries on active items
CREATE INDEX IF NOT EXISTS idx_inventory_is_archived ON public.inventory(is_archived)
WHERE is_archived = false;

-- Add comment for documentation
COMMENT ON COLUMN public.inventory.is_archived IS 'Soft-delete flag. Archived items are hidden from pickers but preserve historical references.';