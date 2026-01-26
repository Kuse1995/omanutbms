-- Add product_id column to invoice_items table for inventory linkage and stock tracking
ALTER TABLE invoice_items 
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES inventory(id);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- Add comment for documentation
COMMENT ON COLUMN invoice_items.product_id IS 'Links to inventory item for stock tracking and deduction';