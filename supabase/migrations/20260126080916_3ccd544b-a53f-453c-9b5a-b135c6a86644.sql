-- Add missing columns to custom_orders table for Dodo Wear form alignment
ALTER TABLE custom_orders 
ADD COLUMN IF NOT EXISTS tag_material TEXT,
ADD COLUMN IF NOT EXISTS client_called BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS client_called_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_date DATE,
ADD COLUMN IF NOT EXISTS actual_collection_date DATE,
ADD COLUMN IF NOT EXISTS collection_signature_url TEXT;

-- Create adjustments tracking table for post-fitting alterations
CREATE TABLE IF NOT EXISTS custom_order_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_order_id UUID NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_fitting_date DATE,
  collection_date DATE,
  attended_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on adjustments table
ALTER TABLE custom_order_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for adjustments
CREATE POLICY "Users can view adjustments for their tenant"
ON custom_order_adjustments FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert adjustments for their tenant"
ON custom_order_adjustments FOR INSERT
WITH CHECK (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can update adjustments for their tenant"
ON custom_order_adjustments FOR UPDATE
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete adjustments for their tenant"
ON custom_order_adjustments FOR DELETE
USING (user_belongs_to_tenant(tenant_id));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_custom_order_adjustments_order_id ON custom_order_adjustments(custom_order_id);
CREATE INDEX IF NOT EXISTS idx_custom_order_adjustments_tenant_id ON custom_order_adjustments(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_custom_order_adjustments_updated_at
BEFORE UPDATE ON custom_order_adjustments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-set tenant_id trigger
CREATE TRIGGER set_custom_order_adjustments_tenant_id
BEFORE INSERT ON custom_order_adjustments
FOR EACH ROW
EXECUTE FUNCTION set_tenant_id();