import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { designType, styleNotes, fabric } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a fashion atelier AI assistant specializing in custom tailoring labor estimation.

Analyze this custom order and provide labor estimates:
- Design Type: ${designType || 'Not specified'}
- Fabric: ${fabric || 'Not specified'}  
- Style Notes: ${styleNotes || 'None'}

Based on typical tailoring workflows, estimate:
1. The number of hours this garment will take to complete
2. The recommended skill level (Junior, Senior, or Master)

Guidelines:
- Simple alterations/shirts: 4-8 hours, Junior
- Standard suits/dresses: 12-18 hours, Senior
- Wedding dresses/tuxedos: 18-30 hours, Master
- Heavy embroidery/beading adds 50-100% more time
- Velvet/silk require more careful handling (+20% time)
- 3-piece suits take ~30% longer than 2-piece`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Provide your estimation." }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_labor_estimate",
              description: "Provide the labor hour estimate and skill level recommendation",
              parameters: {
                type: "object",
                properties: {
                  suggestedHours: {
                    type: "number",
                    description: "Estimated hours to complete the garment"
                  },
                  suggestedSkillLevel: {
                    type: "string",
                    enum: ["Junior", "Senior", "Master"],
                    description: "Recommended tailor skill level"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of the estimate"
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Confidence level in the estimate"
                  }
                },
                required: ["suggestedHours", "suggestedSkillLevel", "reasoning", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_labor_estimate" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const estimate = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(estimate), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback response if AI doesn't use tool
    return new Response(JSON.stringify({
      suggestedHours: 12,
      suggestedSkillLevel: "Senior",
      reasoning: "Default estimate based on standard garment complexity.",
      confidence: "medium"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Estimate error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
