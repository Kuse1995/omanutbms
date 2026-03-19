import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

const EXTRACTION_PROMPT = `You are a product data extractor for African businesses. 
Analyze this image which contains a product list, price list, inventory sheet, or handwritten stock list.

Extract ALL products you can identify. For each product, extract:
- name: The product name (clean it up, capitalize properly)
- price: The unit price as a number (in local currency, no symbols)
- quantity: The stock quantity as a number (default to 0 if not visible)
- sku: A suggested SKU code (optional, generate from name if not visible)
- unit: The unit of measurement (e.g., "pieces", "kg", "bags", "liters") - default to "pieces"

IMPORTANT RULES:
1. Be generous in interpretation - handwritten text may be messy
2. If you see prices with K, ZMW, $, etc. - extract just the number
3. If quantities aren't clear, default to 0
4. Clean up product names - capitalize, fix spelling where obvious
5. Generate simple SKU codes from product names (e.g., "Cement" → "CEMENT-001")
6. Handle both printed and handwritten text
7. If the image is a receipt or invoice, extract the line items as products

Return ONLY a valid JSON array of products. No other text.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { media_url, media_type, tenant_id } = await req.json();

    if (!media_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No media URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing stock image from Twilio: ${media_url}`);

    // Download the image from Twilio (requires auth)
    let imageBase64: string;
    try {
      const imageResponse = await fetch(media_url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        },
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    } catch (dlError) {
      console.error('Image download error:', dlError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine MIME type
    const mimeType = media_type || 'image/jpeg';

    // Call Lovable AI with vision
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_products',
              description: 'Extract product data from an image of a price list or inventory sheet',
              parameters: {
                type: 'object',
                properties: {
                  products: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Product name' },
                        price: { type: 'number', description: 'Unit price' },
                        quantity: { type: 'number', description: 'Stock quantity' },
                        sku: { type: 'string', description: 'SKU code' },
                        unit: { type: 'string', description: 'Unit of measurement' },
                      },
                      required: ['name', 'price'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['products'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_products' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI vision error:', aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI rate limit exceeded. Try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    
    // Extract from tool call response
    let products: any[] = [];
    
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        products = parsed.products || [];
      } catch (parseErr) {
        console.error('Failed to parse tool call arguments:', parseErr);
      }
    }

    // Fallback: try parsing content directly
    if (!products.length) {
      const content = aiResult.choices?.[0]?.message?.content;
      if (content) {
        try {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          products = Array.isArray(parsed) ? parsed : (parsed.products || []);
        } catch (e) {
          console.error('Content fallback parse failed:', e);
        }
      }
    }

    // Validate and clean products
    products = products
      .filter((p: any) => p.name && typeof p.name === 'string')
      .map((p: any, i: number) => ({
        name: String(p.name).trim().substring(0, 200),
        price: Math.max(0, Number(p.price) || 0),
        quantity: Math.max(0, Math.round(Number(p.quantity) || 0)),
        sku: String(p.sku || `${String(p.name).substring(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`),
        unit: String(p.unit || 'pieces').substring(0, 50),
      }));

    console.log(`Extracted ${products.length} products from image`);

    return new Response(
      JSON.stringify({ success: true, products, count: products.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock extractor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
