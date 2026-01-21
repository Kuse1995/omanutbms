const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MaterialRecommendation {
  materialType: string;
  estimatedQuantity: number;
  unitOfMeasure: string;
  reasoning: string;
}

interface EstimateResponse {
  recommendations: MaterialRecommendation[];
  totalEstimatedCost: number;
  confidence: "low" | "medium" | "high";
  notes: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { designType, fabric, color, styleNotes, availableMaterials } = await req.json();

    // Build context about available materials
    const materialsContext = availableMaterials?.length > 0
      ? `Available materials in inventory:\n${availableMaterials.map((m: any) => 
          `- ${m.name} (${m.sku}): ${m.current_stock} ${m.unit_of_measure} at K${m.cost_price || 0}/unit`
        ).join('\n')}`
      : "No inventory data available.";

    const prompt = `You are an expert fashion cost estimator. Based on the design specifications, recommend materials and quantities needed.

Design Type: ${designType || 'Custom garment'}
Fabric Type: ${fabric || 'Not specified'}
Color: ${color || 'Not specified'}
Style Notes: ${styleNotes || 'None'}

${materialsContext}

Analyze the design and provide:
1. Recommended materials from the available inventory (match by name/category)
2. Estimated quantities needed for each material
3. A confidence level for the estimate
4. Any notes about material selection

Be practical and conservative with estimates. Consider seam allowances, pattern matching for prints, and wastage.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional fashion industry cost estimator. Provide accurate material recommendations based on garment specifications."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_material_estimate",
              description: "Provide material cost estimation for a custom garment",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    description: "List of recommended materials",
                    items: {
                      type: "object",
                      properties: {
                        materialType: {
                          type: "string",
                          description: "Type or name of material (should match inventory if possible)"
                        },
                        estimatedQuantity: {
                          type: "number",
                          description: "Estimated quantity needed"
                        },
                        unitOfMeasure: {
                          type: "string",
                          description: "Unit (meters, yards, pieces, etc.)"
                        },
                        reasoning: {
                          type: "string",
                          description: "Brief explanation for this recommendation"
                        }
                      },
                      required: ["materialType", "estimatedQuantity", "unitOfMeasure", "reasoning"]
                    }
                  },
                  totalEstimatedCost: {
                    type: "number",
                    description: "Total estimated material cost in Kwacha"
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Confidence level in the estimate"
                  },
                  notes: {
                    type: "string",
                    description: "Additional notes or considerations"
                  }
                },
                required: ["recommendations", "confidence", "notes"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_material_estimate" } }
      }),
    });

    if (response.status === 429 || response.status === 402) {
      return new Response(
        JSON.stringify({ 
          error: "AI service temporarily unavailable",
          recommendations: [],
          confidence: "low",
          notes: "Please add materials manually."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const estimate: EstimateResponse = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(estimate),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default response if AI doesn't provide structured output
    return new Response(
      JSON.stringify({
        recommendations: [],
        totalEstimatedCost: 0,
        confidence: "low",
        notes: "Could not generate estimate. Please add materials manually."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in estimate-material-cost:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        recommendations: [],
        confidence: "low",
        notes: "Error generating estimate."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
