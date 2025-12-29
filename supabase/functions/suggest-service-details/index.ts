import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, companyName, itemName, category } = await req.json();

    if (!itemName || !businessType) {
      return new Response(
        JSON.stringify({ error: 'itemName and businessType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context-aware prompt based on business type
    const businessContext = {
      services: {
        itemType: 'service',
        examples: 'social media management, web development, consulting, training, graphic design',
        priceLabel: 'service fee',
        qualificationsLabel: 'qualifications/certifications',
      },
      retail: {
        itemType: 'product',
        examples: 'electronics, clothing, accessories, home goods',
        priceLabel: 'retail price',
        qualificationsLabel: 'certifications',
      },
      distribution: {
        itemType: 'product',
        examples: 'wholesale goods, bulk items, distribution products',
        priceLabel: 'wholesale price',
        qualificationsLabel: 'certifications',
      },
      ngo: {
        itemType: 'item/resource',
        examples: 'relief supplies, educational materials, medical supplies',
        priceLabel: 'unit value',
        qualificationsLabel: 'compliance certifications',
      },
      school: {
        itemType: 'resource/fee',
        examples: 'tuition fees, educational resources, supplies',
        priceLabel: 'fee amount',
        qualificationsLabel: 'accreditations',
      },
    };

    const context = businessContext[businessType as keyof typeof businessContext] || businessContext.retail;

    const systemPrompt = `You are an AI assistant helping a ${businessType} business called "${companyName || 'a company'}" create ${context.itemType} listings. 
    
Based on the ${context.itemType} name provided, suggest appropriate details that would be relevant for a ${businessType} business.

Respond ONLY with valid JSON in this exact format:
{
  "description": "A compelling 1-2 sentence description of the ${context.itemType}",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "highlight": "A short catchy highlight badge text (3-5 words max)",
  "suggestedPrice": 0,
  "qualifications": ["Relevant qualification 1", "Relevant qualification 2"]
}

For ${businessType} businesses, common ${context.itemType}s include: ${context.examples}.
Make the suggestions specific and professional. The suggestedPrice should be a reasonable number in local currency.`;

    const userPrompt = `Generate details for this ${context.itemType}: "${itemName}"${category ? ` in the "${category}" category` : ''}.`;

    console.log('Calling Lovable AI for suggestions:', { businessType, itemName, category });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to get AI suggestions');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the response
    let suggestions;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    console.log('AI suggestions generated successfully');

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-service-details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
