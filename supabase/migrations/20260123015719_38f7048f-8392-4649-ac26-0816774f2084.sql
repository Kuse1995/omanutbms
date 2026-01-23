-- Make user_id nullable to allow employee-only WhatsApp mappings
-- This enables staff without BMS accounts to access their own data via WhatsApp
ALTER TABLE public.whatsapp_user_mappings 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure at least user_id OR employee_id is provided
ALTER TABLE public.whatsapp_user_mappings 
ADD CONSTRAINT whatsapp_mapping_requires_identity 
CHECK (user_id IS NOT NULL OR employee_id IS NOT NULL);

-- Add column to track if this is an employee-only self-service mapping
ALTER TABLE public.whatsapp_user_mappings 
ADD COLUMN IF NOT EXISTS is_employee_self_service boolean DEFAULT false;

-- Add index for employee lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_mappings_employee 
ON public.whatsapp_user_mappings(employee_id) 
WHERE employee_id IS NOT NULL;