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
    const { periodStart, periodEnd, tenantId } = await req.json();
    
    if (!periodStart || !periodEnd) {
      return new Response(
        JSON.stringify({ error: "Period start and end dates are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business profile for tenant-specific settings
    let companyName = "Your Company";
    let impactEnabled = false;
    let impactUnitName = "Impact Units";
    
    if (tenantId) {
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("company_name, impact_enabled")
        .eq("tenant_id", tenantId)
        .single();
      
      if (profile) {
        companyName = profile.company_name || companyName;
        impactEnabled = profile.impact_enabled ?? false;
      }
    }

    // Fetch sales data for the period
    const { data: sales, error: salesError } = await supabase
      .from("sales_transactions")
      .select("*")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd + "T23:59:59");

    if (salesError) {
      console.error("Sales fetch error:", salesError);
      throw salesError;
    }

    // Fetch expenses for the period
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .gte("date_incurred", periodStart)
      .lte("date_incurred", periodEnd);

    if (expensesError) {
      console.error("Expenses fetch error:", expensesError);
      throw expensesError;
    }

    // Fetch invoices for the period
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .gte("invoice_date", periodStart)
      .lte("invoice_date", periodEnd);

    if (invoicesError) {
      console.error("Invoices fetch error:", invoicesError);
      throw invoicesError;
    }

    // Calculate totals
    const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount_zmw || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount_zmw || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Only calculate impact if feature is enabled
    const totalImpactUnits = impactEnabled 
      ? (sales || []).reduce((sum, s) => sum + Number(s.liters_impact || 0), 0)
      : 0;

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    (expenses || []).forEach(e => {
      const cat = e.category || "Other";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount_zmw || 0);
    });

    // Group sales by product
    const salesByProduct: Record<string, { quantity: number; revenue: number }> = {};
    (sales || []).forEach(s => {
      const prod = s.product_name || "Unknown";
      if (!salesByProduct[prod]) {
        salesByProduct[prod] = { quantity: 0, revenue: 0 };
      }
      salesByProduct[prod].quantity += Number(s.quantity || 0);
      salesByProduct[prod].revenue += Number(s.total_amount_zmw || 0);
    });

    // Invoice statistics
    const paidInvoices = (invoices || []).filter(i => i.status === "paid");
    const pendingInvoices = (invoices || []).filter(i => i.status !== "paid" && i.status !== "cancelled");
    const invoiceRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

    // Build context for AI - generic, not domain-specific
    let contextLines = [
      `Financial Report for ${periodStart} to ${periodEnd}:`,
      `Company: ${companyName}`,
      `- Total Sales Revenue: K ${totalRevenue.toLocaleString()}`,
      `- Total Expenses: K ${totalExpenses.toLocaleString()}`,
      `- Net Profit: K ${netProfit.toLocaleString()}`,
      `- Profit Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
      `- Number of Sales Transactions: ${(sales || []).length}`,
      `- Invoice Revenue (Paid): K ${invoiceRevenue.toLocaleString()}`,
      `- Pending Invoice Amount: K ${pendingAmount.toLocaleString()}`,
    ];

    // Only include impact metrics if enabled
    if (impactEnabled && totalImpactUnits > 0) {
      contextLines.push(`- Total ${impactUnitName}: ${totalImpactUnits.toLocaleString()}`);
    }

    contextLines.push("");
    contextLines.push("Top Expense Categories:");
    contextLines.push(...Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `- ${cat}: K ${amt.toLocaleString()}`));

    contextLines.push("");
    contextLines.push("Top Products by Revenue:");
    contextLines.push(...Object.entries(salesByProduct)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([prod, data]) => `- ${prod}: ${data.quantity} units, K ${data.revenue.toLocaleString()}`));

    const context = contextLines.join("\n");

    // Call Lovable AI for summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generic system prompt - no domain-specific references
    const systemPrompt = `You are a professional financial analyst for ${companyName}. Generate concise, actionable financial insights. Focus on:
1. Key performance highlights
2. Areas of concern
3. Recommendations for improvement
${impactEnabled ? '4. Social impact metrics (if applicable)' : ''}
Keep the summary under 300 words, professional but friendly.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate an executive summary for this financial data:\n${context}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate AI summary");
    }

    const aiData = await aiResponse.json();
    const aiSummary = aiData.choices?.[0]?.message?.content || "Unable to generate summary.";

    // Build insights object
    const insights: Record<string, unknown> = {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0",
      salesCount: (sales || []).length,
      invoiceRevenue,
      pendingAmount,
      expensesByCategory,
      salesByProduct,
      paidInvoicesCount: paidInvoices.length,
      pendingInvoicesCount: pendingInvoices.length,
    };

    // Only include impact in insights if enabled
    if (impactEnabled) {
      insights.totalImpactUnits = totalImpactUnits;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: aiSummary,
        insights,
        periodStart,
        periodEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});