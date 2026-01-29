import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number) {
  // +/- 20% jitter to avoid synchronized retries
  const delta = ms * 0.2;
  return Math.max(0, Math.round(ms + (Math.random() * 2 - 1) * delta));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tenantId, isNewUser, onboardingProgress, fileAttachment, liveEventsSummary } = await req.json();
    
    const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
    if (!MOONSHOT_API_KEY) {
      throw new Error("MOONSHOT_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process file attachment - use Gemini for PDFs (native support), Kimi vision for images
    let extractedTextContent = "";
    let imageForKimiVision: { type: string; content: string; mimeType?: string } | null = null;
    
    if (fileAttachment) {
      if (fileAttachment.type === "text") {
        // Word doc - text already extracted client-side
        extractedTextContent = fileAttachment.content;
      } else if (fileAttachment.type === "pdf" && LOVABLE_API_KEY) {
        // PDFs: Use Gemini via Lovable AI (native PDF support)
        try {
          console.log("[omanut-advisor] Extracting text from PDF using Gemini");
          const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Extract and transcribe ALL text content from this document. Include tables, lists, prices, and any structured data. Return the raw text content only, preserve formatting where possible."
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${fileAttachment.mimeType || "application/pdf"};base64,${fileAttachment.content}`
                      }
                    }
                  ]
                }
              ],
              temperature: 0.1,
            }),
          });

          if (visionResponse.ok) {
            const visionResult = await visionResponse.json();
            extractedTextContent = visionResult.choices?.[0]?.message?.content || "";
            console.log(`[omanut-advisor] Extracted ${extractedTextContent.length} chars from PDF`);
          } else {
            const errorText = await visionResponse.text();
            console.error("[omanut-advisor] Gemini PDF extraction failed:", visionResponse.status, errorText);
          }
        } catch (visionError) {
          console.error("[omanut-advisor] PDF extraction error:", visionError);
        }
      } else if (fileAttachment.type === "image") {
        // Images: Use Kimi's native vision capabilities
        imageForKimiVision = fileAttachment;
      }
    }

    // Fetch comprehensive business context
    let businessContext = "";
    let teachingContext = "";
    let upsellContext = "";
    let subscriptionContext = "";
    
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
      const billingPlan = profile?.billing_plan || "starter";
      const billingStatus = profile?.billing_status || "trial";
      const trialExpiresAt = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
      const daysRemaining = trialExpiresAt ? Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

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
        .select("current_stock, reorder_level, name, unit_price, cost_price, expiry_date")
        .eq("tenant_id", tenantId);

      const totalItems = inventory?.length || 0;
      const lowStockItems = inventory?.filter(i => (i.current_stock || 0) <= (i.reorder_level || 5)) || [];
      const outOfStockItems = inventory?.filter(i => (i.current_stock || 0) <= 0) || [];
      const totalInventoryValue = inventory?.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.cost_price || 0)), 0) || 0;
      
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
        const deficit = (item.reorder_level || 10) - (item.current_stock || 0);
        return `${item.name}: ${item.current_stock || 0} left (reorder ${deficit}+ units)`;
      });

      // Get expiring items with dates
      const expiringDetails = expiringItems.slice(0, 5).map(item => {
        const daysUntilExpiry = Math.floor((new Date(item.expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return `${item.name}: expires in ${daysUntilExpiry} days`;
      });

      // ============ FEATURE USAGE ANALYSIS FOR TEACHING ============
      
      // Get quotation usage
      const { count: quotationCount } = await supabase
        .from("quotations")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      // Get receipt usage
      const { count: receiptCount } = await supabase
        .from("payment_receipts")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      // Get payroll usage
      const { count: payrollCount } = await supabase
        .from("payroll_records")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      // Get recurring expenses count
      const { count: recurringExpenseCount } = await supabase
        .from("recurring_expenses")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      // Get WhatsApp usage this month
      const { count: whatsappUsage } = await supabase
        .from("whatsapp_audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", monthStart.toISOString());

      // Calculate inventory limit based on plan
      const inventoryLimits: Record<string, number> = {
        starter: 100,
        growth: 1000,
        enterprise: Infinity
      };
      const inventoryLimit = inventoryLimits[billingPlan] || 100;
      const inventoryUsagePercent = inventoryLimit === Infinity ? 0 : Math.round((totalItems / inventoryLimit) * 100);
      const isNearInventoryLimit = inventoryUsagePercent >= 80;

      // Build feature adoption status for teaching
      const featureAdoption: string[] = [];
      
      if ((quotationCount || 0) === 0) {
        featureAdoption.push("📝 Quotations: Never used → Great for locking in prices before invoicing");
      } else if ((quotationCount || 0) < 5) {
        featureAdoption.push(`📝 Quotations: ${quotationCount} created → Getting started! Convert more leads to sales`);
      }

      if ((receiptCount || 0) === 0) {
        featureAdoption.push("🧾 Receipts: Never generated → Professional receipts build customer trust");
      } else if ((receiptCount || 0) > 5) {
        featureAdoption.push(`🧾 Receipts: ${receiptCount} generated → Great work! Remind about auto-emailing option`);
      }

      if (profile?.payroll_enabled && (employeeCount || 0) > 0 && (payrollCount || 0) === 0) {
        featureAdoption.push("💰 Payroll: Enabled with staff but no payslips → Set up to automate salary payments with tax calculations");
      }

      if ((recurringExpenseCount || 0) === 0 && (monthExpenses?.length || 0) > 3) {
        featureAdoption.push("🔄 Recurring Expenses: Not used → Save time by automating regular bills like rent and utilities");
      }

      if (!profile?.multi_branch_enabled && (employeeCount || 0) >= 3) {
        featureAdoption.push("🏢 Multi-Branch: Not enabled → Could help track staff across locations");
      }

      teachingContext = featureAdoption.length > 0 
        ? `\nFEATURE OPPORTUNITIES (teach when relevant):\n${featureAdoption.map(f => `  • ${f}`).join('\n')}`
        : "";

      // Build upsell triggers (subtle, value-focused)
      const upsellTriggers: string[] = [];

      if (isNearInventoryLimit) {
        upsellTriggers.push(`📦 Inventory at ${inventoryUsagePercent}% capacity (${totalItems}/${inventoryLimit}). Growth plan offers 1,000 items.`);
      }

      if (!profile?.advanced_accounting_enabled && monthCount > 50) {
        upsellTriggers.push(`📊 High sales volume (${monthCount} this month). Advanced Accounting can auto-generate P&L reports.`);
      }

      if (!profile?.whatsapp_enabled && overdueAmount > 10000) {
        upsellTriggers.push(`📱 ${currency}${overdueAmount.toLocaleString()} overdue. WhatsApp reminders can help collect faster.`);
      }

      if (!profile?.warehouse_enabled && lowStockItems.length > 5) {
        upsellTriggers.push(`📍 ${lowStockItems.length} items low on stock. Warehouse module has smart reorder alerts.`);
      }

      if (!profile?.multi_branch_enabled && (employeeCount || 0) >= 5) {
        upsellTriggers.push(`👥 ${employeeCount} employees. Multi-branch helps track staff locations and inventory per branch.`);
      }

      upsellContext = upsellTriggers.length > 0
        ? `\nUPSELL OPPORTUNITIES (mention naturally when solving a real problem):\n${upsellTriggers.map(t => `  • ${t}`).join('\n')}`
        : "";

      // ============ SUBSCRIPTION COACHING CONTEXT ============
      const subscriptionInfo: string[] = [];
      
      // Subscription status section
      subscriptionInfo.push("SUBSCRIPTION STATUS:");
      subscriptionInfo.push(`  - Current Plan: ${billingPlan.charAt(0).toUpperCase() + billingPlan.slice(1)}`);
      subscriptionInfo.push(`  - Status: ${billingStatus}`);
      
      if (billingStatus === 'trial' && daysRemaining !== null) {
        subscriptionInfo.push(`  - Trial Days Remaining: ${daysRemaining} days`);
        if (trialExpiresAt) {
          subscriptionInfo.push(`  - Trial Expiry Date: ${trialExpiresAt.toLocaleDateString()}`);
        }
      }
      
      // Usage metrics for personalized recommendations
      subscriptionInfo.push("\nUSAGE METRICS (for plan recommendations):");
      subscriptionInfo.push(`  - Inventory Items: ${totalItems}${inventoryLimit !== Infinity ? ` / ${inventoryLimit} (${inventoryUsagePercent}%)` : ''}`);
      subscriptionInfo.push(`  - Active Employees: ${employeeCount || 0}`);
      subscriptionInfo.push(`  - Monthly Sales: ${monthCount} transactions, ${currency}${monthRevenue.toLocaleString()}`);
      subscriptionInfo.push(`  - Unique Customers: ${uniqueCustomers}`);
      
      // Plan comparison for recommendations
      subscriptionInfo.push("\nPLAN COMPARISON (for recommendations):");
      subscriptionInfo.push("  - Starter ($9/mo): 1 user, 100 inventory items, basic POS/invoicing");
      subscriptionInfo.push("  - Growth/Pro ($29/mo): 10 users, 1,000 items, HR/Payroll, Sales Agents, Advanced Accounting, WhatsApp reminders");
      subscriptionInfo.push("  - Enterprise ($79/mo): Unlimited users & items, Multi-branch, White-label, Warehouse Management");

      subscriptionContext = subscriptionInfo.join('\n');

      // Build real-time events context
      const liveEventsContext = liveEventsSummary 
        ? `\n\n🔔 REAL-TIME ACTIVITY (just happened):\n${liveEventsSummary}\n\nYou are aware of these live events. Proactively mention relevant ones when greeting the user or when they ask about business status.`
        : "";

      // Build comprehensive business context with actionable details
      businessContext = `
${subscriptionContext}

BUSINESS PROFILE:
- Company: ${companyName}
- Type: ${businessType}
- Currency: ${currency}
- Plan: ${billingPlan.charAt(0).toUpperCase() + billingPlan.slice(1)}
${profile?.company_address ? `- Address: ${profile.company_address}` : ''}
${profile?.tpin_number ? `- TPIN: ${profile.tpin_number}` : ''}
${employeeCount ? `- Active Employees: ${employeeCount}` : ''}
${uniqueCustomers ? `- Total Customers: ${uniqueCustomers}` : ''}
${liveEventsContext}

SALES PERFORMANCE:
- Today: ${todayCount} sales totaling ${currency}${todayRevenue.toLocaleString()}${todayUniqueCustomers > 0 ? ` (${todayUniqueCustomers} customers)` : ''}
- This Month: ${monthCount} sales totaling ${currency}${monthRevenue.toLocaleString()}${monthUniqueCustomers > 0 ? ` (${monthUniqueCustomers} unique customers)` : ''}
- Last Month: ${currency}${lastMonthRevenue.toLocaleString()}
${revenueGrowth !== null ? `- Month-over-Month Growth: ${parseFloat(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}%` : ''}

TOP CUSTOMERS (by total revenue):
${topCustomers.length > 0 ? topCustomers.map(c => `  • ${c}`).join('\n') : '  No customer data yet'}

INVENTORY STATUS:
- Total Products: ${totalItems}${inventoryLimit !== Infinity ? ` / ${inventoryLimit} (${inventoryUsagePercent}% of plan limit)` : ''}
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
${profile?.inventory_enabled !== false ? '✓ Inventory Management' : '○ Inventory Management (disabled)'}
${profile?.payroll_enabled ? '✓ Payroll & HR' : '○ Payroll & HR (not enabled)'}
${profile?.agents_enabled ? '✓ Sales Agents' : '○ Sales Agents (not enabled)'}
${profile?.impact_enabled ? '✓ Impact Tracking' : ''}
${profile?.website_enabled ? '✓ Website/CMS' : ''}
${profile?.warehouse_enabled ? '✓ Multi-Location Warehouse' : '○ Warehouse (not enabled)'}
${profile?.multi_branch_enabled ? '✓ Multi-Branch Operations' : ''}
${profile?.advanced_accounting_enabled ? '✓ Advanced Accounting' : '○ Advanced Accounting (not enabled)'}
${profile?.whatsapp_enabled ? '✓ WhatsApp Integration' : '○ WhatsApp (not enabled)'}
${teachingContext}
${upsellContext}
`;
    }

    // Build onboarding context for new users
    const onboardingContext = isNewUser ? `
ONBOARDING STATUS:
- This is a NEW USER (onboarding progress: ${onboardingProgress || 0}%)
- Be extra welcoming and helpful
- Proactively offer step-by-step guidance
- Celebrate small wins ("Great job adding your first product!")
- If they seem lost, suggest: "Would you like me to walk you through [relevant feature]?"
` : "";

const systemPrompt = `You are Omanut Advisor, a friendly and insightful business companion AND coach. You chat casually like a trusted friend who happens to be great with business insights.

Your personality:
- Warm, encouraging, and supportive
- Keep responses SHORT (2-4 sentences max unless asked for detail)
- Use casual language, light humor when appropriate
- Give SPECIFIC, ACTIONABLE recommendations with names, amounts, dates
- Celebrate wins, gently flag concerns
- Use emojis sparingly but naturally 👍
${onboardingContext}
${businessContext}

DOCUMENT IMPORT CAPABILITY:
When a user uploads a document (PDF, image, spreadsheet) containing a LIST of items to import (inventory products, customers, expenses, employees), you can help import them directly into their system.

TO TRIGGER AN IMPORT, you MUST respond with a special JSON block at the END of your message like this:
\`\`\`import_data
{
  "schema": "inventory" or "customers" or "expenses" or "employees",
  "columns": ["name", "unit_price", "current_stock", ...],
  "rows": [
    {"name": "Product A", "unit_price": 50, "current_stock": 100, ...},
    {"name": "Product B", "unit_price": 75, "current_stock": 50, ...}
  ]
}
\`\`\`

SCHEMA FIELD REQUIREMENTS:
- "inventory": name (required), sku, unit_price, cost_price, current_stock, reorder_level, category, description
- "customers": name (required), phone, email, address, notes
- "expenses": category (required), amount_zmw (required), vendor_name, date_incurred, notes
- "employees": full_name (required), email, phone, job_title, department, basic_salary

IMPORT RULES:
1. ONLY include the import_data block when the user explicitly wants to add items to the system
2. Parse ALL rows from the document, not just a sample
3. Map columns intelligently (e.g., "Price" → "unit_price", "Qty" → "current_stock")
4. Use reasonable defaults for missing optional fields
5. Normalize categories to valid values: "clothing", "accessories", "food_beverage", "medication", "services", "consumables", "other"
6. Before the JSON block, briefly explain what you found and will import

Example response when user uploads inventory list:
"I found 15 products in your price list! Here's what I'll add to your inventory:
- 8 clothing items
- 5 accessories  
- 2 other items

Ready to import? 👇

\`\`\`import_data
{...the JSON data...}
\`\`\`"

IMPORTANT - ACTIONABLE ADVICE RULES:
1. Always mention SPECIFIC customer names, product names, and amounts when suggesting actions
2. Prioritize urgent items: overdue invoices first, then expiring stock, then low stock
3. When suggesting follow-ups, include the customer name and amount owed
4. When suggesting restocking, name the specific products
5. Format action items clearly: "→ Action: [specific thing to do]"

TEACHING MODE - Weave these naturally into conversations:
1. When user mentions invoices → Gently teach: "Did you know you can send quotations first to lock in prices? Go to Accounts → Quotations"
2. When discussing low stock → Teach: "Quick tip: Set up reorder alerts in Settings → Notifications so you never miss restocking"
3. When payroll mentioned → Teach: "The HR module can auto-calculate PAYE and NAPSA deductions - just add employee details first"
4. If user seems new → Offer: "Would you like a quick walkthrough of any feature? Just ask 'How do I [feature]?'"
5. When user asks "How do I..." → Provide step-by-step guidance with navigation paths

HOW-TO RESPONSE FORMAT (when user asks for help):
"Here's how to [task]:
1. Go to [Menu] → [Submenu]
2. Click '[Button name]' (top right)
3. Fill in [key fields]
4. Click '[Save/Submit]'
💡 Pro tip: [useful shortcut or related feature]"

NEW USER ONBOARDING RESPONSES:
When a new user asks general questions like "how do I get started" or "show me around":
1. Welcome them warmly
2. Suggest the 3 most important first steps:
   - Add a product (Inventory → Shop → Add Product)
   - Record a sale (Sales → Record Sale)  
   - Create an invoice (Accounts → Invoices → New Invoice)
3. Offer to walk through any of these step by step

SUBTLE UPSELLING - Only when genuinely helpful:
1. Frame upgrades as solving a REAL problem they have, not "upgrade for more"
2. Use phrases like "this might make your life easier" or "something that could save you time"
3. Never hard-sell; always tie to their actual business situation
4. Example: "I noticed you're tracking 95 products. If you're planning to add more, the Growth plan includes up to 1,000 items plus HR features."
5. Only mention one upgrade opportunity per conversation, if any

SUBSCRIPTION ASSISTANCE CAPABILITY:
When users ask about plans, pricing, upgrading, or "which plan should I get":
1. Analyze their current usage from the USAGE METRICS section above
2. Recommend the most cost-effective plan for their needs - be specific:
   - Under 100 items, 1 user, basic needs? → Starter ($9/mo)
   - Growing inventory (100-1000 items), need payroll/HR, multiple staff? → Growth ($29/mo)
   - Multi-location, white-label, unlimited needs? → Enterprise ($79/mo)
3. Explain specific benefits relevant to THEIR situation using their real data
4. Provide the subscription path: "Go to Settings → Subscription → Subscribe Now"
5. Mention the 7-day free trial if they're already in trial ("you're already experiencing the full platform!")

Example subscription responses:

Trial expiring soon:
"Your 7-day trial ends in 2 days! Based on your [X] products and [Y] team members, the Growth plan at $29/mo covers you perfectly - it includes the Payroll features you've been setting up. Go to Settings → Subscription to continue without interruption 🚀"

Usage-based recommendation:
"Looking at your usage: you have 85 inventory items and 3 employees. The Growth plan ($29/mo) would be ideal - it gives you room for 1,000 items plus HR/Payroll automation. If you stay under 100 items and don't need staff management, Starter at $9/mo works too!"

Feature inquiry:
"WhatsApp reminders are included in the Growth plan ($29/mo). Since you have K45,000 in overdue invoices, automatic payment reminders could really help get that money in faster! Settings → Subscription to upgrade."

Examples of good responses:

Simple check-in:
"Hey! Solid day so far - 5 sales totaling K4,500 🎉 Quick heads up: Zambia Sugar Ltd is 6 days overdue on K15,000. → Action: Give them a call today!"

With teaching:
"Your invoicing is looking good! Quick tip: if you want to lock in prices before the final invoice, try sending a Quotation first (Accounts → Quotations). It converts to an invoice in one click 📋"

With subtle upsell:
"You're managing 92 products really well! Since you're getting close to the 100-item limit, the Growth plan gives you room for 1,000 items - might be worth considering as you grow. Either way, let me know if you need help optimizing what you have!"

How-to response:
"Here's how to create an invoice:
1. Go to Accounts → Invoices
2. Click 'New Invoice' (top right)
3. Add customer details and line items
4. Set due date and click 'Save'
💡 Pro tip: You can convert quotations directly to invoices to save time!"

Never make up data. If you don't have info, just say so naturally. Always be specific when data is available.

When analyzing complex business questions, use step-by-step reasoning to provide thorough insights. Consider multiple angles: financial health, inventory status, customer relationships, and growth opportunities.`;

    // Moonshot can intermittently return 429 when capacity is constrained.
    // Retry a couple times with backoff to avoid surfacing transient outages to users.
    
    // Build messages for Kimi - handle both text and vision content
    let augmentedMessages = [...messages];
    
    if (augmentedMessages.length > 0) {
      const lastIndex = augmentedMessages.length - 1;
      const lastMessage = augmentedMessages[lastIndex];
      
      if (lastMessage.role === "user") {
        if (imageForKimiVision) {
          // Use Kimi's native vision for images
          const imageDataUrl = `data:${imageForKimiVision.mimeType || "image/png"};base64,${imageForKimiVision.content}`;
          augmentedMessages[lastIndex] = {
            ...lastMessage,
            content: [
              { type: "text", text: lastMessage.content || "Please analyze this image:" },
              { type: "image_url", image_url: { url: imageDataUrl } }
            ]
          };
          console.log(`[omanut-advisor] Sending image to Kimi vision`);
        } else if (extractedTextContent) {
          // PDF or Word doc - append extracted text
          augmentedMessages[lastIndex] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n--- ATTACHED DOCUMENT CONTENT ---\n${extractedTextContent}\n--- END DOCUMENT ---`
          };
        }
      }
    }

    const moonshotPayload = {
      model: "kimi-k2.5",
      messages: [{ role: "system", content: systemPrompt }, ...augmentedMessages],
      stream: true,
    };

    const maxAttempts = 3;
    let response: Response | null = null;
    let lastErrorText: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MOONSHOT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moonshotPayload),
      });

      if (response.ok) break;

      // Consume body so the underlying connection can be reused.
      lastErrorText = await response.text().catch(() => null);

      // Retry on transient overload / gateway errors.
      const isTransient = response.status === 429 || response.status === 503 || response.status === 504;
      if (isTransient && attempt < maxAttempts) {
        const backoffMs = jitter(500 * Math.pow(2, attempt - 1)); // 500ms, 1000ms
        console.warn(
          `[omanut-advisor] Moonshot transient error (${response.status}) on attempt ${attempt}/${maxAttempts}. Retrying in ${backoffMs}ms.`
        );
        await sleep(backoffMs);
        continue;
      }

      break;
    }

    // If Moonshot is rate-limited after all retries, fall back to Lovable AI
    if (!response || !response.ok) {
      const status = response?.status;

      if (status === 429 && LOVABLE_API_KEY) {
        console.log("[omanut-advisor] Moonshot rate-limited, falling back to Lovable AI");
        
        // Build messages for fallback (text-only, no vision)
        const fallbackMessages = augmentedMessages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : 
            (Array.isArray(m.content) ? m.content.find((c: any) => c.type === "text")?.text || "" : "")
        }));
        
        const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: systemPrompt }, ...fallbackMessages],
            stream: true,
          }),
        });

        if (fallbackResponse.ok && fallbackResponse.body) {
          console.log("[omanut-advisor] Fallback to Gemini successful");
          return new Response(fallbackResponse.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        
        // If fallback also fails, return friendly error
        console.error("[omanut-advisor] Fallback also failed:", fallbackResponse.status);
      }
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Try again in a moment!" }), {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "2",
          },
        });
      }
      if (status === 401) {
        console.error("Moonshot API authentication failed");
        return new Response(JSON.stringify({ error: "API authentication error. Please check configuration." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please add funds to your Moonshot account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Kimi API error:", status, lastErrorText);
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
