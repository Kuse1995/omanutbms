
-- Create the match_embeddings RPC function for pgvector similarity search
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding text,
  match_tenant_id uuid,
  match_entity_type text DEFAULT NULL,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.content_text,
    1 - (e.embedding <=> query_embedding::extensions.vector) AS similarity
  FROM public.embeddings e
  WHERE e.tenant_id = match_tenant_id
    AND (match_entity_type IS NULL OR e.entity_type = match_entity_type)
    AND 1 - (e.embedding <=> query_embedding::extensions.vector) > match_threshold
  ORDER BY e.embedding <=> query_embedding::extensions.vector
  LIMIT match_count;
END;
$$;
