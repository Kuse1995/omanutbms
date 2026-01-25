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

      // Get pending and overdue invoices with client details
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, status, due_date, client_name, client_phone, invoice_number")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });

      const pendingInvoices = allInvoices || [];
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
      const overdueInvoices = pendingInvoices.filter(i => i.due_date && new Date(i.due_date) < new Date());
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
      
      // Calculate days overdue for each invoice
      const overdueDetails = overdueInvoices.slice(0, 5).map(inv => {
        const daysOverdue = Math.floor((new Date().getTime() - new Date(inv.due_date!).getTime()) / (1000 * 60 * 60 * 24));
        const amountOwed = (inv.total_amount || 0) - (inv.paid_amount || 0);
        return `${inv.client_name} owes ${currency}${amountOwed.toLocaleString()} (${daysOverdue} days overdue, Invoice #${inv.invoice_number})`;
      });

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

      // Get customer count and top customers
      const { data: allCustomerSales } = await supabase
        .from("sales_transactions")
        .select("customer_name, customer_email, customer_phone, total_amount_zmw")
        .eq("tenant_id", tenantId)
        .not("customer_name", "is", null);

      const uniqueCustomers = new Set(allCustomerSales?.map(c => c.customer_email || c.customer_name)).size;
      
      // Calculate top customers by revenue
      const customerRevenue = allCustomerSales?.reduce((acc, sale) => {
        const key = sale.customer_name || 'Unknown';
        acc[key] = (acc[key] || 0) + (sale.total_amount_zmw || 0);
        return acc;
      }, {} as Record<string, number>) || {};
      const topCustomers = Object.entries(customerRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => `${name}: ${currency}${amount.toLocaleString()}`);

      // Get pending quotations with client details
      const { data: pendingQuotations } = await supabase
        .from("quotations")
        .select("total_amount, client_name, client_phone, quotation_number, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      const quotationsPendingValue = pendingQuotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
      
      // Calculate days waiting for each quotation
      const quotationDetails = pendingQuotations?.slice(0, 5).map(q => {
        const daysWaiting = Math.floor((new Date().getTime() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return `${q.client_name}: ${currency}${(q.total_amount || 0).toLocaleString()} (waiting ${daysWaiting} days, #${q.quotation_number})`;
      }) || [];

      // Get low stock items with reorder quantities
      const lowStockDetails = lowStockItems.slice(0, 5).map(item => {
        const deficit = (item.reorder_level || 10) - (item.quantity || 0);
        return `${item.name}: ${item.quantity} left (reorder ${deficit}+ units)`;
      });

      // Get expiring items with dates
      const expiringDetails = expiringItems.slice(0, 5).map(item => {
        const daysUntilExpiry = Math.floor((new Date(item.expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return `${item.name}: expires in ${daysUntilExpiry} days`;
      });

      // Build comprehensive business context with actionable details
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

TOP CUSTOMERS (by total revenue):
${topCustomers.length > 0 ? topCustomers.map(c => `  • ${c}`).join('\n') : '  No customer data yet'}

INVENTORY STATUS:
- Total Products: ${totalItems}
- Total Inventory Value: ${currency}${totalInventoryValue.toLocaleString()}
${outOfStockItems.length > 0 ? `\n⚠️ OUT OF STOCK - URGENT ACTION NEEDED:\n${outOfStockItems.slice(0, 5).map(i => `  • ${i.name}`).join('\n')}` : '✓ No items out of stock'}
${lowStockDetails.length > 0 ? `\n⚠️ LOW STOCK - REORDER SOON:\n${lowStockDetails.map(d => `  • ${d}`).join('\n')}` : ''}
${expiringDetails.length > 0 ? `\n⏰ EXPIRING SOON - SELL OR DISCOUNT:\n${expiringDetails.map(d => `  • ${d}`).join('\n')}` : ''}

RECEIVABLES - ACTION ITEMS:
- Total Pending: ${pendingInvoices.length} invoices worth ${currency}${pendingAmount.toLocaleString()}
${overdueDetails.length > 0 ? `\n🔴 OVERDUE - FOLLOW UP IMMEDIATELY:\n${overdueDetails.map(d => `  • ${d}`).join('\n')}` : '✓ No overdue invoices'}

QUOTATIONS AWAITING RESPONSE:
${quotationDetails.length > 0 ? quotationDetails.map(d => `  • ${d}`).join('\n') : '  No pending quotations'}
${quotationsPendingValue > 0 ? `  → Total potential value: ${currency}${quotationsPendingValue.toLocaleString()}` : ''}

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
- Give SPECIFIC, ACTIONABLE recommendations with names, amounts, dates
- Celebrate wins, gently flag concerns
- Use emojis sparingly but naturally 👍

${businessContext}

IMPORTANT - ACTIONABLE ADVICE RULES:
1. Always mention SPECIFIC customer names, product names, and amounts when suggesting actions
2. Prioritize urgent items: overdue invoices first, then expiring stock, then low stock
3. When suggesting follow-ups, include the customer name and amount owed
4. When suggesting restocking, name the specific products
5. Format action items clearly: "→ Action: [specific thing to do]"

Examples of your tone with specific actions:
- "Hey! Today's looking solid with 5 sales 🎉 Quick note: John Mwape still owes K2,500 from last week. → Action: Send him a friendly reminder today!"
- "Heads up - Paracetamol 500mg is down to 3 units. → Action: Reorder before you run out this weekend."
- "Great month so far! But I noticed Zambia Sugar Ltd hasn't paid their K15,000 invoice due 5 days ago. → Action: Give them a call to check on payment status."
- "You have 3 quotations pending worth K45,000. → Action: Follow up with ABC Company (K20,000) - they've been waiting 4 days."

Never make up data. If you don't have info, just say so naturally. Always be specific when data is available.`;

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
