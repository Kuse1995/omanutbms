import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSION = 768;
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

interface EmbedRequest {
  texts: string[];
  task_type?: string; // RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, CLASSIFICATION
}

async function generateEmbeddings(texts: string[], taskType: string = 'RETRIEVAL_DOCUMENT'): Promise<number[][]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  if (texts.length === 0) return [];

  // Batch embed up to 100 texts at a time
  const allEmbeddings: number[][] = [];
  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const requests = batch.map(text => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: text.substring(0, 2048) }] }, // Truncate to 2048 chars
      taskType,
    }));

    const response = await fetch(`${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini embedding error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const embeddings = result.embeddings?.map((e: any) => e.values) || [];
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, task_type } = await req.json() as EmbedRequest;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (texts.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Maximum 500 texts per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddings = await generateEmbeddings(texts, task_type || 'RETRIEVAL_DOCUMENT');

    return new Response(
      JSON.stringify({
        success: true,
        embeddings,
        model: EMBEDDING_MODEL,
        dimension: EMBEDDING_DIMENSION,
        count: embeddings.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-embeddings error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate embeddings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
