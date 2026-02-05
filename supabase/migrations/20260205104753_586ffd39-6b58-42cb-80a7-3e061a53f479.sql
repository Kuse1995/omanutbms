-- Add order_type to distinguish custom vs alteration orders
ALTER TABLE custom_orders 
ADD COLUMN order_type text DEFAULT 'custom' CHECK (order_type IN ('custom', 'alteration'));

-- Add alteration-specific fields
ALTER TABLE custom_orders
ADD COLUMN garment_source text CHECK (garment_source IN ('shop_made', 'external')),
ADD COLUMN original_order_id uuid REFERENCES custom_orders(id),
ADD COLUMN alteration_items jsonb DEFAULT '[]',
ADD COLUMN garment_condition text CHECK (garment_condition IN ('good', 'fair', 'fragile')),
ADD COLUMN bring_in_date date;

-- Index for querying alterations
CREATE INDEX idx_custom_orders_order_type ON custom_orders(tenant_id, order_type);