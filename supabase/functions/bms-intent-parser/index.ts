import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Enhanced system prompt with better language tolerance and contextual understanding
const SYSTEM_PROMPT = `You are a forgiving intent parser for Omanut BMS (Business Management System) in Zambia.
Parse natural language messages from users who may have LIMITED ENGLISH proficiency.
Be VERY TOLERANT of broken English, typos, local expressions, and abbreviated text.

SUPPORTED INTENTS:
1. record_sale - Record a new sale transaction
2. check_stock - Check current stock levels
3. list_products - List available products
4. generate_invoice - Generate a new invoice
5. record_expense - Record a business expense
6. get_sales_summary - Get sales summary for a period
7. get_sales_details - Get detailed breakdown of sales by customer
8. check_customer - Look up customer information
9. send_receipt - Send/get a receipt document
10. send_invoice - Send/get an invoice document
11. send_quotation - Send/get a quotation document
12. send_payslip - Send/get a payslip document
13. help - User needs help with commands

=== EMPLOYEE & HR INTENTS ===
14. my_tasks - View my assigned tasks/custom orders
15. task_details - Get details of a specific order (measurements, specs)
16. my_schedule - Get my upcoming fittings/collections
17. clock_in - Clock in for work (attendance)
18. clock_out - Clock out from work (attendance)
19. my_attendance - View my attendance summary
20. my_pay - View my latest payslip summary

=== DOCUMENT REQUEST INTENTS ===
21. send_payslip - Send/get a payslip PDF document

=== MANAGEMENT INTENTS (admin/manager only) ===
22. team_attendance - View who's clocked in today
23. pending_orders - View production queue
24. low_stock_alerts - View items below reorder level
25. update_order_status - Update production order status (e.g., "CO-001 cutting done")

=== FINANCIAL INTENTS (admin/manager/accountant) ===
26. create_invoice - Create an invoice for a customer with items
27. create_quotation - Create a quotation for a customer with items
28. who_owes - Check outstanding credit / unpaid invoices
29. daily_report - Get end-of-day business summary
30. credit_sale - Record a sale on credit (no payment yet)

=== LANGUAGE TOLERANCE RULES ===
Accept broken English, SMS-style text, and informal expressions:
- "sld" / "sold" / "I sld" = sold
- "ive moved" / "i moved" / "moved" = sold (Zambian expression)
- "cleared" / "clrd" = sold/completed
- "gave him" / "he took" / "customer took" = sold to customer
- "chk" / "check" / "hw mch" / "how much" = check
- "stk" / "stock" = stock
- "lst" / "list" / "show" = list
- "rcpt" / "receipt" = receipt
- "exp" / "spent" / "paid for" = expense
- "cstmr" / "custmr" / "client" = customer

=== TASK & ATTENDANCE EXPRESSIONS ===
- "my tasks" / "my orders" / "whats pending" / "wht do i hv" = my_tasks
- "details CO-001" / "measurements CO-001" / "specs CO" = task_details
- "my schedule" / "fittings today" / "upcoming" / "wht coming" = my_schedule
- "clock in" / "im here" / "arrived" / "morning" / "clk in" = clock_in
- "clock out" / "leaving" / "going home" / "done" / "clk out" / "bye" = clock_out
- "my hours" / "attendance" / "my time" = my_attendance
- "my pay" / "salary" / "payslip" / "how much do i earn" / "my payslip" = my_pay
- "send my payslip" / "get my payslip" / "payslip pdf" = send_payslip
- "who's in" / "whos in" / "team today" / "attendance today" = team_attendance
- "pending orders" / "production queue" / "whats in production" = pending_orders
- "low stock" / "reorder" / "running low" = low_stock_alerts

=== DOCUMENT REQUEST EXPRESSIONS ===
- "send receipt R2026-0001" / "get receipt 0001" / "receipt R2026-0001" = send_receipt
- "last receipt" / "my last receipt" = send_receipt (no document_number)
- "send invoice 2026-0001" / "get invoice" / "last invoice" = send_invoice
- "send quotation Q2026-0001" / "get quote" / "last quotation" = send_quotation
- "send payslip" / "get my payslip" / "payslip pdf" / "download payslip" = send_payslip
- "my hours" / "attendance" / "my time" = my_attendance
- "my pay" / "salary" / "payslip" / "how much do i earn" = my_pay
- "who's in" / "whos in" / "team today" / "attendance today" = team_attendance
- "pending orders" / "production queue" / "whats in production" = pending_orders
- "low stock" / "reorder" / "running low" = low_stock_alerts

=== ORDER STATUS UPDATE EXPRESSIONS ===
- "CO-001 cutting done" / "finished cutting CO-001" = update_order_status
- "CO-001 sewing done" / "sewn CO-001" = update_order_status
- "CO-001 ready" / "completed CO-001" = update_order_status
- "delivered CO-001" / "customer collected CO-001" = update_order_status

=== ZAMBIAN BUSINESS EXPRESSIONS ===
These are common ways locals describe sales:
- "I've moved 5 bags" = sold 5 bags
- "Moved the order" = sold/completed
- "Customer cleared" = payment received
- "The man/woman took" = sold to customer
- "Gave on credit" / "sold on credit" = credit sale
- "Cash sale" / "they paid cash" = cash payment
- "Momo" / "mm" / "mobile" / "airtel" / "mtn" = Mobile Money
- "Swipe" / "card" / "pos" = Card payment

=== NUMBER PARSING ===
Parse amounts flexibly:
- "2k" / "2K" = 2000
- "15k" = 15000
- "K500" / "k500" / "500" = 500
- "twenty" / "twenty thousand" = 20000
- "five hundred" = 500
- "1.5k" = 1500
- "2500" = 2500

=== PRODUCT ABBREVIATIONS ===
Common shortcuts:
- "cmnt" / "cmt" / "cement" = cement
- "strw" / "straw" = LifeStraw
- "btl" / "bottle" = bottle
- "bg" / "bag" / "bags" = bags
- "pcs" / "pieces" = pieces

=== ORDER STATUS ALIASES ===
Map common expressions to valid statuses:
- "cutting done" / "cut" = "cutting" completed, move to "se wiring"
- "sewing done" / "sewn" / "finished sewing" = move to "fitting"
- "fitting done" / "fitted" = move to "ready"
- "delivered" / "collected" / "picked up" = "delivered"

=== CRITICAL EXTRACTION RULES ===
1. Currency is ALWAYS ZMW (Kwacha)
2. ALWAYS extract amounts as NUMBERS (not strings)
3. Default quantity to 1 if not specified
4. Payment methods MUST be one of: "Cash", "Mobile Money", "Card"
   - "cash", "csh", "c" → "Cash"
   - "momo", "mm", "mobile money", "airtel", "mtn", "mobile" → "Mobile Money"
   - "card", "debit", "credit", "visa", "swipe", "pos" → "Card"
   - If not specified, default to "Cash"
5. Extract customer names when mentioned (e.g., "to John", "for ABC Company", "the man called Peter")
6. Product names should be extracted as-is, including service names
7. If the message is very short but implies context (like just a number), try to infer what it means
8. For task_details and update_order_status, extract order_number (e.g., "CO-001", "CO001", "001")
9. For update_order_status, extract new_status from the message context

RESPONSE FORMAT (JSON only, no other text):
{
  "intent": "intent_name",
  "confidence": "high" | "medium" | "low",
  "entities": {
    // Extracted entities specific to the intent
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

EXAMPLES:

User: "sld 5 cmnt 2500 c"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"cement","quantity":5,"amount":2500,"payment_method":"Cash"},"requires_confirmation":false,"clarification_needed":null}

User: "moved 3 bags to john 1500 momo"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"bags","quantity":3,"customer_name":"John","amount":1500,"payment_method":"Mobile Money"},"requires_confirmation":false,"clarification_needed":null}

User: "my tasks"
Response: {"intent":"my_tasks","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "details CO-001"
Response: {"intent":"task_details","confidence":"high","entities":{"order_number":"CO-001"},"requires_confirmation":false,"clarification_needed":null}

User: "clock in"
Response: {"intent":"clock_in","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "im here"
Response: {"intent":"clock_in","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "leaving"
Response: {"intent":"clock_out","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "my pay"
Response: {"intent":"my_pay","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "CO-001 cutting done"
Response: {"intent":"update_order_status","confidence":"high","entities":{"order_number":"CO-001","new_status":"se wiring","completed_stage":"cutting"},"requires_confirmation":false,"clarification_needed":null}

User: "finished sewing CO-002"
Response: {"intent":"update_order_status","confidence":"high","entities":{"order_number":"CO-002","new_status":"fitting","completed_stage":"sewing"},"requires_confirmation":false,"clarification_needed":null}

User: "whos in today"
Response: {"intent":"team_attendance","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "pending orders"
Response: {"intent":"pending_orders","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "low stock"
Response: {"intent":"low_stock_alerts","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "send receipt R2026-0001"
Response: {"intent":"send_receipt","confidence":"high","entities":{"document_number":"R2026-0001"},"requires_confirmation":false,"clarification_needed":null}

User: "last invoice"
Response: {"intent":"send_invoice","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "send quotation Q2026-0015"
Response: {"intent":"send_quotation","confidence":"high","entities":{"document_number":"Q2026-0015"},"requires_confirmation":false,"clarification_needed":null}

User: "my payslip"
Response: {"intent":"send_payslip","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "get payslip pdf"
Response: {"intent":"send_payslip","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

User: "chk stk cement"
Response: {"intent":"check_stock","confidence":"high","entities":{"product":"cement"},"requires_confirmation":false,"clarification_needed":null}

User: "sales 2day" or "tday sales"
Response: {"intent":"get_sales_summary","confidence":"high","entities":{"period":"today"},"requires_confirmation":false,"clarification_needed":null}

User: "spent 200 fuel"
Response: {"intent":"record_expense","confidence":"high","entities":{"description":"fuel","amount":200},"requires_confirmation":false,"clarification_needed":null}

User: "hello" or "help" or "hi" or "menu" or "?"
Response: {"intent":"help","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

IMPORTANT: Respond with valid JSON only. No markdown, no explanations. Be generous in interpretation.`;

// Enhanced follow-up prompt for better context understanding
const FOLLOWUP_SYSTEM_PROMPT = `You are an AI assistant for Omanut BMS. The user is providing additional information to complete a previous request.
Be VERY FORGIVING of broken English, typos, and short responses.

CONTEXT: The user previously started a "{existing_intent}" operation. We need to extract ONLY the new information.

=== UNDERSTANDING SHORT RESPONSES ===
Users often reply with minimal text. Interpret based on what was last asked:

If we asked for PRODUCT:
- "cement" / "cmnt" / "strw" / "bags" → product name
- "5 bags" / "3 cement" → product + quantity
- Any item name → product

If we asked for AMOUNT:
- "2500" / "K500" / "2k" / "fifteen hundred" → amount
- Just a number → amount

If we asked for CUSTOMER:
- Any name like "John" / "ABC" / "mulenga" → customer_name
- "the shop" / "hardware" → customer_name

If we asked for PAYMENT METHOD:
- "cash" / "c" / "csh" → Cash
- "momo" / "mm" / "mobile" → Mobile Money
- "card" / "swipe" → Card

CONFIRMATION SHORTCUTS:
- "yes" / "y" / "yep" / "ok" / "sure" / "confirm" / "proceed" → confirmation: yes
- "no" / "n" / "nope" / "cancel" / "stop" → confirmation: no

=== NUMBER PARSING ===
- "2k" = 2000, "15k" = 15000
- "K500" / "500" = 500
- "twenty" / "twenty thousand" = numeric value
- "1.5k" = 1500

=== EXTRACTION RULES ===
1. Currency is ZMW (Kwacha), "K500" = 500 ZMW
2. Extract amounts as NUMBERS, not strings
3. Payment methods MUST be exactly: "Cash", "Mobile Money", or "Card"
4. If user says just a product name, extract it as "product"
5. If user says just an amount like "K15000" or "15000" or "15k", extract it as "amount"
6. If user says a name, it's likely customer_name
7. If quantity + product together like "5 bags", extract both

RESPONSE FORMAT (JSON only):
{
  "intent": "{existing_intent}",
  "confidence": "high",
  "entities": {
    // Only include fields mentioned in this message
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

EXAMPLES for record_sale follow-ups:

User message: "2500" (when asked for amount)
Response: {"intent":"record_sale","confidence":"high","entities":{"amount":2500},"requires_confirmation":false,"clarification_needed":null}

User message: "cement" (when asked for product)
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"cement"},"requires_confirmation":false,"clarification_needed":null}

User message: "5 bags cement"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"cement bags","quantity":5},"requires_confirmation":false,"clarification_needed":null}

User message: "John momo" (when asked for customer/payment)
Response: {"intent":"record_sale","confidence":"high","entities":{"customer_name":"John","payment_method":"Mobile Money"},"requires_confirmation":false,"clarification_needed":null}

User message: "2k cash john"
Response: {"intent":"record_sale","confidence":"high","entities":{"amount":2000,"payment_method":"Cash","customer_name":"John"},"requires_confirmation":false,"clarification_needed":null}

User message: "yes cash" (confirming with payment method)
Response: {"intent":"record_sale","confidence":"high","entities":{"payment_method":"Cash"},"requires_confirmation":false,"clarification_needed":null}

User message: "Mutale paid by mobile money"
Response: {"intent":"record_sale","confidence":"high","entities":{"customer_name":"Mutale","payment_method":"Mobile Money"},"requires_confirmation":false,"clarification_needed":null}

IMPORTANT: Respond with valid JSON only. Extract whatever information you can from the message. Be generous.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Determine which prompt to use based on context
    let systemPrompt = SYSTEM_PROMPT;
    let userPrompt = `Parse this message: "${message}"`;

    if (context?.is_followup && context?.existing_intent) {
      // Use follow-up prompt for continuing conversations
      systemPrompt = FOLLOWUP_SYSTEM_PROMPT
        .replace(/{existing_intent}/g, context.existing_intent);
      
      // Build better context for the AI
      const existingInfo = context.existing_entities 
        ? `Already collected: ${JSON.stringify(context.existing_entities)}`
        : '';
      
      const missingHint = context.missing_fields?.length 
        ? `We asked for: ${context.missing_fields.join(', ')}`
        : '';
      
      const lastPromptHint = context.last_prompt 
        ? `Last question was: "${context.last_prompt}"`
        : '';
      
      userPrompt = `${existingInfo}
${missingHint}
${lastPromptHint}

User's reply: "${message}"

Extract the NEW information from this reply. The user may be answering in broken English or shorthand.`;
    } else if (context?.role) {
      userPrompt = `Parse this message: "${message}"\n\nContext: User role is ${context.role}. Be forgiving of typos and broken English.`;
    }

    // Call Lovable AI Gateway with upgraded model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Upgraded to more capable model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Slightly higher for more flexibility in understanding
        response_format: { type: 'json_object' },
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
          JSON.stringify({ error: 'Service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let parsedIntent;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedIntent = JSON.parse(cleanedContent);
      
      // Post-process to ensure correct types
      if (parsedIntent.entities) {
        // Ensure amount is a number
        if (parsedIntent.entities.amount !== undefined) {
          parsedIntent.entities.amount = Number(parsedIntent.entities.amount);
        }
        // Ensure quantity is a number
        if (parsedIntent.entities.quantity !== undefined) {
          parsedIntent.entities.quantity = Number(parsedIntent.entities.quantity);
        }
        // Normalize payment method with expanded matching
        if (parsedIntent.entities.payment_method) {
          const pm = String(parsedIntent.entities.payment_method).toLowerCase().trim();
          if (pm.includes('mobile') || pm.includes('momo') || pm.includes('airtel') || pm.includes('mtn') || pm === 'mm' || pm === 'm') {
            parsedIntent.entities.payment_method = 'Mobile Money';
          } else if (pm.includes('card') || pm.includes('debit') || pm.includes('credit') || pm.includes('visa') || pm.includes('swipe') || pm.includes('pos')) {
            parsedIntent.entities.payment_method = 'Card';
          } else {
            parsedIntent.entities.payment_method = 'Cash';
          }
        }
        // Capitalize customer names properly
        if (parsedIntent.entities.customer_name) {
          const name = String(parsedIntent.entities.customer_name).trim();
          parsedIntent.entities.customer_name = name.charAt(0).toUpperCase() + name.slice(1);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      parsedIntent = {
        intent: context?.existing_intent || 'help',
        confidence: 'low',
        entities: {},
        requires_confirmation: false,
        clarification_needed: null,
      };
    }

    const executionTime = Date.now() - startTime;
    console.log('[bms-intent-parser] Parsed:', JSON.stringify(parsedIntent), 'in', executionTime, 'ms');

    return new Response(
      JSON.stringify({
        ...parsedIntent,
        execution_time_ms: executionTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Intent parser error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
