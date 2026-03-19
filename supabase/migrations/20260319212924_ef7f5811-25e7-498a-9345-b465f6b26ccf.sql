
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create embeddings table
CREATE TABLE public.embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'product', 'contact', 'intent', 'blog'
  entity_id uuid, -- nullable for intent examples
  content_text text NOT NULL,
  embedding extensions.vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_embeddings_tenant_type ON public.embeddings(tenant_id, entity_type);
CREATE INDEX idx_embeddings_entity ON public.embeddings(entity_type, entity_id);

-- HNSW index for fast cosine similarity search
CREATE INDEX idx_embeddings_vector ON public.embeddings USING hnsw (embedding extensions.vector_cosine_ops);

-- RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view embeddings"
  ON public.embeddings FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can manage embeddings"
  ON public.embeddings FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access to embeddings"
  ON public.embeddings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
