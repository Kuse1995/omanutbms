import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  sketchUrl?: string;
  sketchBase64?: string;
  designType: string;
  fabric: string;
  color: string;
  styleNotes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { sketchUrl, sketchBase64, designType, fabric, color, styleNotes } = await req.json() as GenerateRequest;

    // Build the prompt for generating professional fashion outfit on mannequin
    const basePrompt = `Ultra high resolution professional fashion photography of a ${designType} made from ${fabric} fabric in ${color} color, displayed on a modern white mannequin against a clean studio background. ${styleNotes || ''}
    
The outfit should be perfectly tailored, showing exquisite craftsmanship and attention to detail. The lighting should be professional studio lighting with soft shadows. Photorealistic, 8K quality, fashion magazine style.`;

    const views = [
      { view: "front", prompt: `${basePrompt} FRONT VIEW - showing the complete front of the garment, all buttons, closures, and front design details clearly visible.` },
      { view: "back", prompt: `${basePrompt} BACK VIEW - showing the complete back of the garment, back panel, vent details, and any back embellishments.` },
      { view: "side-left", prompt: `${basePrompt} LEFT SIDE VIEW - 45 degree angle from the left, showing the profile silhouette, sleeve construction, and side seam details.` },
      { view: "side-right", prompt: `${basePrompt} RIGHT SIDE VIEW - 45 degree angle from the right, showing the profile silhouette, pocket placement, and side construction.` },
    ];

    const generatedImages: { view: string; imageUrl: string }[] = [];

    // Generate each view
    for (const { view, prompt } of views) {
      let messages: any[];

      if (sketchBase64 || sketchUrl) {
        // Image-to-image: use the sketch as reference
        const imageContent = sketchBase64 
          ? `data:image/png;base64,${sketchBase64}`
          : sketchUrl;

        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transform this fashion sketch/reference into a ${prompt}`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageContent
                }
              }
            ]
          }
        ];
      } else {
        // Text-to-image: generate from description only
        messages = [
          {
            role: "user",
            content: prompt
          }
        ];
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages,
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error(`AI gateway error for ${view}:`, response.status, errorText);
        continue; // Skip this view but continue with others
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        generatedImages.push({ view, imageUrl });
      }
    }

    if (generatedImages.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any outfit views" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      images: generatedImages,
      message: `Generated ${generatedImages.length} outfit views`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-outfit-views error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
