
-- Phase 1: WhatsApp Conversations workflow state machine table
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_workflow text NOT NULL,
  workflow_step text NOT NULL,
  workflow_state jsonb DEFAULT '{}'::jsonb,
  pending_fields text[] DEFAULT '{}',
  completed_fields text[] DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active workflow per phone number
CREATE UNIQUE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations (phone);

-- Index for expiry cleanup
CREATE INDEX idx_whatsapp_conversations_expires ON public.whatsapp_conversations (expires_at);

-- Auto-update updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Service role needs full access (edge functions use service role)
CREATE POLICY "Service role full access on whatsapp_conversations"
  ON public.whatsapp_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tenant users can view their own tenant's conversations
CREATE POLICY "Tenant users can view own conversations"
  ON public.whatsapp_conversations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND public.user_belongs_to_tenant(tenant_id)
  );
