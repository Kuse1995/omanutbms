-- Add item_type column to quotation_items for categorizing line items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product';

COMMENT ON COLUMN quotation_items.item_type IS 'Categorizes line items: product, service, material, labor, fee';

-- Add item_type column to invoice_items for categorizing line items
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product';

COMMENT ON COLUMN invoice_items.item_type IS 'Categorizes line items: product, service, material, labor, fee';