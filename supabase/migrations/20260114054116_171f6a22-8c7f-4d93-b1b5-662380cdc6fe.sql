-- Fix WhatsApp visibility: Enable WhatsApp for all Growth and Enterprise plan tenants
UPDATE public.business_profiles 
SET whatsapp_enabled = true 
WHERE billing_plan IN ('growth', 'enterprise');

-- Set default value for whatsapp_enabled column so new profiles default to true
ALTER TABLE public.business_profiles 
ALTER COLUMN whatsapp_enabled SET DEFAULT true;