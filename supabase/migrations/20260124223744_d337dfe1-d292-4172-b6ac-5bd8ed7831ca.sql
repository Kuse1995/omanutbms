-- Create whatsapp_pending_confirmations table for storing pending clock-in/out requests awaiting location
CREATE TABLE public.whatsapp_pending_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  user_id UUID,
  intent TEXT NOT NULL,
  entities JSONB DEFAULT '{}',
  pending_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(tenant_id, whatsapp_number)
);

-- Enable RLS
ALTER TABLE public.whatsapp_pending_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access" 
ON public.whatsapp_pending_confirmations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for efficient lookups
CREATE INDEX idx_pending_confirmations_lookup 
ON public.whatsapp_pending_confirmations(tenant_id, whatsapp_number, expires_at);

-- Add comment
COMMENT ON TABLE public.whatsapp_pending_confirmations IS 'Stores pending WhatsApp confirmations for actions that require follow-up (e.g., clock-in awaiting location)';