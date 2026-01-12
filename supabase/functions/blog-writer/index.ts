import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlogWriterRequest {
  title?: string;
  prompt?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI backend is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as BlogWriterRequest;
    const { title, prompt } = body;

    if (!title && !prompt) {
      return new Response(
        JSON.stringify({ error: "Please provide a title or brief prompt for the blog post" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a marketing copywriter for a professional business. Write concise, factual blog posts about the company's products, services, and impact in the community. Keep tone professional, clear, and optimistic.",
      },
      {
        role: "user",
        content:
          `Write a blog post draft for our company blog.\n\nTitle (optional): ${title ?? ""}\nBrief / angle: ${prompt ?? "General company news or product impact story"}\n\nReturn JSON with two fields: \\\"content\\\" (full markdown article, 600-900 words) and \\\"excerpt\\\" (1-2 sentence summary under 220 characters).`,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "create_blog_draft",
              description: "Return a blog post draft and short excerpt.",
              parameters: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  excerpt: { type: "string" },
                },
                required: ["content", "excerpt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_blog_draft" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please top up in your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function?.name !== "create_blog_draft") {
      console.error("Unexpected AI response format", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI returned an unexpected response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsedArgs: { content: string; excerpt: string };
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments ?? "{}");
    } catch (e) {
      console.error("Failed to parse tool arguments", e, toolCall.function?.arguments);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsedArgs), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("blog-writer error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
