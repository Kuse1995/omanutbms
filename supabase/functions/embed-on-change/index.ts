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

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: text.substring(0, 2048) }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );

  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const result = await response.json();
  return result.embedding?.values || [];
}

function buildContentText(entityType: string, record: any): string {
  switch (entityType) {
    case 'product':
      return [record.name, record.description, record.category, record.sku]
        .filter(Boolean).join(' | ');
    case 'contact':
      return [record.name, record.email, record.phone, record.address, record.notes]
        .filter(Boolean).join(' | ');
    case 'blog':
      return [record.title, record.excerpt, record.content?.substring(0, 500)]
        .filter(Boolean).join(' | ');
    default:
      return record.name || record.title || JSON.stringify(record).substring(0, 500);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_type, entity_id, tenant_id, record, action = 'upsert' } = await req.json();

    if (!entity_type || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'entity_type and tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle deletion
    if (action === 'delete') {
      const { error } = await supabase
        .from('embeddings')
        .delete()
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('tenant_id', tenant_id);

      return new Response(
        JSON.stringify({ success: true, action: 'deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build content text from the record
    const contentText = buildContentText(entity_type, record);
    if (!contentText || contentText.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient content to embed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding
    const embedding = await generateEmbedding(contentText);
    if (embedding.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingStr = `[${embedding.join(',')}]`;

    // Upsert into embeddings table
    if (entity_id) {
      // Check if embedding exists
      const { data: existing } = await supabase
        .from('embeddings')
        .select('id')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('embeddings')
          .update({
            content_text: contentText,
            embedding: embeddingStr,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('embeddings')
          .insert({
            tenant_id,
            entity_type,
            entity_id,
            content_text: contentText,
            embedding: embeddingStr,
          });

        if (error) throw error;
      }
    } else {
      // For intent examples (no entity_id), just insert
      const { error } = await supabase
        .from('embeddings')
        .insert({
          tenant_id,
          entity_type,
          content_text: contentText,
          embedding: embeddingStr,
        });

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, action: 'embedded', entity_type, content_length: contentText.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('embed-on-change error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Embedding failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
