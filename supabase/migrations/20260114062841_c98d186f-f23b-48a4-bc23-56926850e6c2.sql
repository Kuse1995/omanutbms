-- RLS policies for whatsapp_conversation_drafts
-- This table is primarily used by backend functions, but we still add user-scoped policies to satisfy security checks.

ALTER TABLE public.whatsapp_conversation_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own WhatsApp drafts" ON public.whatsapp_conversation_drafts;
CREATE POLICY "Users can view their own WhatsApp drafts"
ON public.whatsapp_conversation_drafts
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own WhatsApp drafts" ON public.whatsapp_conversation_drafts;
CREATE POLICY "Users can create their own WhatsApp drafts"
ON public.whatsapp_conversation_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own WhatsApp drafts" ON public.whatsapp_conversation_drafts;
CREATE POLICY "Users can update their own WhatsApp drafts"
ON public.whatsapp_conversation_drafts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own WhatsApp drafts" ON public.whatsapp_conversation_drafts;
CREATE POLICY "Users can delete their own WhatsApp drafts"
ON public.whatsapp_conversation_drafts
FOR DELETE
USING (auth.uid() = user_id);
