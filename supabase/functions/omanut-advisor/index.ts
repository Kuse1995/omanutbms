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

    // Fetch comprehensive business context
    let businessContext = "";
    
    if (tenantId) {
      // Get full business profile
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      const currency = profile?.currency_symbol || "K";
      const businessType = profile?.business_type || "retail";
      const companyName = profile?.company_name || "Business";

      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw, payment_method, customer_name")
        .eq("tenant_id", tenantId)
        .gte("created_at", today);

      const todayRevenue = todaySales?.reduce((sum, s) => sum + (s.total_amount_zmw || 0), 0) || 0;
      const todayCount = todaySales?.length || 0;
      const todayUniqueCustomers = new Set(todaySales?.filter(s => s.customer_name).map(s => s.customer_name)).size;

      // Get this month's sales
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: monthSales } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw, customer_name, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", monthStart.toISOString());

      const monthRevenue = monthSales?.reduce((sum, s) => sum + (s.total_amount_zmw || 0), 0) || 0;
      const monthCount = monthSales?.length || 0;
      const monthUniqueCustomers = new Set(monthSales?.filter(s => s.customer_name).map(s => s.customer_name)).size;

      // Get last month's sales for comparison
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      const lastMonthEnd = new Date();
      lastMonthEnd.setDate(0); // Last day of previous month
      
      const { data: lastMonthSales } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw")
        .eq("tenant_id", tenantId)
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      const lastMonthRevenue = lastMonthSales?.reduce((sum, s) => sum + (s.total_amount_zmw || 0), 0) || 0;
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) 
        : null;

      // Get inventory stats with more detail
      const { data: inventory } = await supabase
        .from("inventory")
        .select("quantity, reorder_level, name, selling_price, cost_price, expiry_date")
        .eq("tenant_id", tenantId);

      const totalItems = inventory?.length || 0;
      const lowStockItems = inventory?.filter(i => i.quantity <= (i.reorder_level || 5)) || [];
      const outOfStockItems = inventory?.filter(i => i.quantity <= 0) || [];
      const totalInventoryValue = inventory?.reduce((sum, i) => sum + ((i.quantity || 0) * (i.cost_price || 0)), 0) || 0;
      
      // Check for expiring items (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringItems = inventory?.filter(i => {
        if (!i.expiry_date) return false;
        const expiry = new Date(i.expiry_date);
        return expiry <= thirtyDaysFromNow && expiry > new Date();
      }) || [];

      // Get pending and overdue invoices
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, status, due_date, client_name")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "partial"]);

      const pendingInvoices = allInvoices || [];
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
      const overdueInvoices = pendingInvoices.filter(i => i.due_date && new Date(i.due_date) < new Date());
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);

      // Get expenses this month
      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount_zmw, category")
        .eq("tenant_id", tenantId)
        .gte("date_incurred", monthStart.toISOString().split('T')[0]);

      const totalExpenses = monthExpenses?.reduce((sum, e) => sum + (e.amount_zmw || 0), 0) || 0;
      const expensesByCategory = monthExpenses?.reduce((acc, e) => {
        const cat = e.category || 'Other';
        acc[cat] = (acc[cat] || 0) + (e.amount_zmw || 0);
        return acc;
      }, {} as Record<string, number>) || {};
      const topExpenseCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];

      // Get employee count
      const { count: employeeCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("employment_status", "active");

      // Get customer count (unique from sales)
      const { data: allCustomers } = await supabase
        .from("sales_transactions")
        .select("customer_name, customer_email")
        .eq("tenant_id", tenantId)
        .not("customer_name", "is", null);

      const uniqueCustomers = new Set(allCustomers?.map(c => c.customer_email || c.customer_name)).size;

      // Get pending quotations
      const { data: pendingQuotations } = await supabase
        .from("quotations")
        .select("total_amount")
        .eq("tenant_id", tenantId)
        .eq("status", "pending");

      const quotationsPendingValue = pendingQuotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      // Build comprehensive business context
      businessContext = `
BUSINESS PROFILE:
- Company: ${companyName}
- Type: ${businessType}
- Currency: ${currency}
${profile?.company_address ? `- Address: ${profile.company_address}` : ''}
${profile?.tpin_number ? `- TPIN: ${profile.tpin_number}` : ''}
${employeeCount ? `- Active Employees: ${employeeCount}` : ''}
${uniqueCustomers ? `- Total Customers: ${uniqueCustomers}` : ''}

SALES PERFORMANCE:
- Today: ${todayCount} sales totaling ${currency}${todayRevenue.toLocaleString()}${todayUniqueCustomers > 0 ? ` (${todayUniqueCustomers} customers)` : ''}
- This Month: ${monthCount} sales totaling ${currency}${monthRevenue.toLocaleString()}${monthUniqueCustomers > 0 ? ` (${monthUniqueCustomers} unique customers)` : ''}
- Last Month: ${currency}${lastMonthRevenue.toLocaleString()}
${revenueGrowth !== null ? `- Month-over-Month Growth: ${parseFloat(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}%` : ''}

INVENTORY STATUS:
- Total Products: ${totalItems}
- Total Inventory Value: ${currency}${totalInventoryValue.toLocaleString()}
${outOfStockItems.length > 0 ? `- OUT OF STOCK (${outOfStockItems.length}): ${outOfStockItems.slice(0, 3).map(i => i.name).join(', ')}${outOfStockItems.length > 3 ? '...' : ''}` : '- No items out of stock ✓'}
${lowStockItems.length > 0 ? `- Low Stock Warning (${lowStockItems.length}): ${lowStockItems.slice(0, 3).map(i => i.name).join(', ')}${lowStockItems.length > 3 ? '...' : ''}` : ''}
${expiringItems.length > 0 ? `- Expiring Soon (${expiringItems.length}): ${expiringItems.slice(0, 3).map(i => i.name).join(', ')}` : ''}

RECEIVABLES:
- Pending Invoices: ${pendingInvoices.length} worth ${currency}${pendingAmount.toLocaleString()}
${overdueInvoices.length > 0 ? `- OVERDUE (${overdueInvoices.length}): ${currency}${overdueAmount.toLocaleString()} - needs attention!` : '- No overdue invoices ✓'}
${pendingQuotations && pendingQuotations.length > 0 ? `- Pending Quotations: ${pendingQuotations.length} worth ${currency}${quotationsPendingValue.toLocaleString()}` : ''}

EXPENSES THIS MONTH:
- Total: ${currency}${totalExpenses.toLocaleString()}
${topExpenseCategory ? `- Top Category: ${topExpenseCategory[0]} (${currency}${topExpenseCategory[1].toLocaleString()})` : ''}
- Net Profit Estimate: ${currency}${(monthRevenue - totalExpenses).toLocaleString()}

ENABLED FEATURES:
${profile?.inventory_enabled !== false ? '✓ Inventory Management' : ''}
${profile?.payroll_enabled ? '✓ Payroll & HR' : ''}
${profile?.agents_enabled ? '✓ Sales Agents' : ''}
${profile?.impact_enabled ? '✓ Impact Tracking' : ''}
${profile?.website_enabled ? '✓ Website/CMS' : ''}
${profile?.warehouse_enabled ? '✓ Multi-Location Warehouse' : ''}
${profile?.multi_branch_enabled ? '✓ Multi-Branch Operations' : ''}
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
