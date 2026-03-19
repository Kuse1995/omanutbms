import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-004';

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: text.substring(0, 2048) }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  return result.embedding?.values || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, tenant_id, entity_type, limit = 10, threshold = 0.3 } = await req.json();

    if (!query || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'query and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);
    if (queryEmbedding.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: [], message: 'Could not generate query embedding' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use pgvector cosine distance search via RPC
    // We need to use raw SQL since the supabase-js client doesn't support vector operations directly
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const entityFilter = entity_type ? `AND entity_type = '${entity_type}'` : '';

    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: embeddingStr,
      match_tenant_id: tenant_id,
      match_entity_type: entity_type || null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Semantic search RPC error:', error);
      // Fallback: direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('embeddings')
        .select('id, entity_type, entity_id, content_text')
        .eq('tenant_id', tenant_id)
        .ilike('content_text', `%${query}%`)
        .limit(limit);

      return new Response(
        JSON.stringify({
          success: true,
          results: (fallbackData || []).map(r => ({ ...r, similarity: 0.5 })),
          method: 'keyword_fallback',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: data || [],
        method: 'semantic',
        query,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('semantic-search error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Semantic search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
