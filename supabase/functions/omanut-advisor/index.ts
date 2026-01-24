import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tenantId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business context
    let businessContext = "";
    
    if (tenantId) {
      // Get business profile
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("company_name, business_type, currency_symbol")
        .eq("tenant_id", tenantId)
        .single();

      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw")
        .eq("tenant_id", tenantId)
        .gte("created_at", today);

      const todayRevenue = todaySales?.reduce((sum, s) => sum + (s.total_amount_zmw || 0), 0) || 0;
      const todayCount = todaySales?.length || 0;

      // Get this month's sales
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: monthSales } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw")
        .eq("tenant_id", tenantId)
        .gte("created_at", monthStart.toISOString());

      const monthRevenue = monthSales?.reduce((sum, s) => sum + (s.total_amount_zmw || 0), 0) || 0;
      const monthCount = monthSales?.length || 0;

      // Get inventory stats
      const { data: inventory } = await supabase
        .from("inventory")
        .select("quantity, reorder_level, name")
        .eq("tenant_id", tenantId);

      const totalItems = inventory?.length || 0;
      const lowStockItems = inventory?.filter(i => i.quantity <= (i.reorder_level || 5)) || [];

      // Get pending invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("tenant_id", tenantId)
        .eq("status", "pending");

      const pendingAmount = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const pendingCount = invoices?.length || 0;

      const currency = profile?.currency_symbol || "K";
      
      businessContext = `
Business Context (${profile?.company_name || 'Business'}):
- Today: ${todayCount} sales totaling ${currency}${todayRevenue.toLocaleString()}
- This month: ${monthCount} sales totaling ${currency}${monthRevenue.toLocaleString()}
- Inventory: ${totalItems} products${lowStockItems.length > 0 ? `, ${lowStockItems.length} running low (${lowStockItems.slice(0, 3).map(i => i.name).join(', ')})` : ', all well stocked'}
- Pending invoices: ${pendingCount} worth ${currency}${pendingAmount.toLocaleString()}
`;
    }

    const systemPrompt = `You are Omanut Advisor, a friendly and insightful business companion. You chat casually like a trusted friend who happens to be great with business insights.

Your personality:
- Warm, encouraging, and supportive
- Keep responses SHORT (2-3 sentences max unless asked for detail)
- Use casual language, light humor when appropriate
- Give actionable tips, not lengthy reports
- Celebrate wins, gently flag concerns
- Use emojis sparingly but naturally 👍

${businessContext}

When asked about the business, reference actual data. Be specific but conversational. If something looks concerning, mention it gently with a suggestion. If things are going well, celebrate it!

Examples of your tone:
- "Hey! Today's looking solid with X sales 🎉 Keep it up!"
- "Hmm, noticed a few items running low. Might want to check on those before the weekend rush."
- "That's a great question! Based on your numbers..."

Never make up data. If you don't have info, just say so naturally.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Try again in a moment!" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Couldn't connect to advisor" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
