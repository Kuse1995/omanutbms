-- Add employee_id column to whatsapp_user_mappings for direct employee lookup
ALTER TABLE whatsapp_user_mappings 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_employee 
ON whatsapp_user_mappings(employee_id) WHERE employee_id IS NOT NULL;