-- Store multi-turn WhatsApp "draft" operations so follow-up answers can complete a record
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  intent TEXT NOT NULL,
  entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_prompt TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversation_drafts_unique
ON public.whatsapp_conversation_drafts (tenant_id, whatsapp_number);

CREATE INDEX IF NOT EXISTS whatsapp_conversation_drafts_expires_idx
ON public.whatsapp_conversation_drafts (expires_at);

ALTER TABLE public.whatsapp_conversation_drafts ENABLE ROW LEVEL SECURITY;

-- Timestamp helper (safe to create/replace)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_whatsapp_conversation_drafts_updated_at ON public.whatsapp_conversation_drafts;
CREATE TRIGGER update_whatsapp_conversation_drafts_updated_at
BEFORE UPDATE ON public.whatsapp_conversation_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
