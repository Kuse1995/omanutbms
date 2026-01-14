import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// System prompt for intent parsing - upgraded for better accuracy
const SYSTEM_PROMPT = `You are a precise intent parser for Omanut BMS (Business Management System) in Zambia.
Parse natural language messages and extract structured business operations with HIGH ACCURACY.

SUPPORTED INTENTS:
1. record_sale - Record a new sale transaction
2. check_stock - Check current stock levels
3. list_products - List available products
4. generate_invoice - Generate a new invoice
5. record_expense - Record a business expense
6. get_sales_summary - Get sales summary for a period
7. check_customer - Look up customer information
8. send_receipt - Send/get a receipt document
9. send_invoice - Send/get an invoice document
10. send_quotation - Send/get a quotation document
11. help - User needs help with commands

CRITICAL EXTRACTION RULES:
1. Currency is ALWAYS ZMW (Kwacha). "K500" = 500, "K15000" = 15000, "15k" = 15000
2. ALWAYS extract amounts as numbers (not strings)
3. Default quantity to 1 if not specified
4. Payment methods MUST be one of: "Cash", "Mobile Money", "Card"
   - "cash", "paid cash" → "Cash"
   - "momo", "mobile money", "airtel money", "mtn money" → "Mobile Money"  
   - "card", "debit", "credit", "visa" → "Card"
   - If not specified, default to "Cash"
5. Extract customer names when mentioned (e.g., "to John", "for ABC Company")
6. Product names should be extracted as-is, including service names

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

User: "I sold 5 bags of cement to John for K2500 cash"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"cement bags","quantity":5,"customer_name":"John","amount":2500,"payment_method":"Cash"},"requires_confirmation":false,"clarification_needed":null}

User: "Software development for K15000"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"Software development","quantity":1,"amount":15000},"requires_confirmation":false,"clarification_needed":null}

User: "Sold website design to Mulenga for 8000 mobile money"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"website design","quantity":1,"customer_name":"Mulenga","amount":8000,"payment_method":"Mobile Money"},"requires_confirmation":false,"clarification_needed":null}

User: "Check stock for LifeStraw"
Response: {"intent":"check_stock","confidence":"high","entities":{"product":"LifeStraw"},"requires_confirmation":false,"clarification_needed":null}

User: "How much did we sell this week?"
Response: {"intent":"get_sales_summary","confidence":"high","entities":{"period":"this_week"},"requires_confirmation":false,"clarification_needed":null}

User: "Sales today"
Response: {"intent":"get_sales_summary","confidence":"high","entities":{"period":"today"},"requires_confirmation":false,"clarification_needed":null}

User: "Send me receipt R2025-0042"
Response: {"intent":"send_receipt","confidence":"high","entities":{"document_number":"R2025-0042"},"requires_confirmation":false,"clarification_needed":null}

User: "Get my last receipt"
Response: {"intent":"send_receipt","confidence":"high","entities":{"last":true},"requires_confirmation":false,"clarification_needed":null}

User: "Send invoice 2025-0015"
Response: {"intent":"send_invoice","confidence":"high","entities":{"document_number":"2025-0015"},"requires_confirmation":false,"clarification_needed":null}

User: "Expense K500 for transport"
Response: {"intent":"record_expense","confidence":"high","entities":{"description":"transport","amount":500},"requires_confirmation":false,"clarification_needed":null}

User: "Find customer Mulenga"
Response: {"intent":"check_customer","confidence":"high","entities":{"customer_name":"Mulenga"},"requires_confirmation":false,"clarification_needed":null}

User: "hello" or "help" or "hi"
Response: {"intent":"help","confidence":"high","entities":{},"requires_confirmation":false,"clarification_needed":null}

IMPORTANT: Respond with valid JSON only. No markdown, no explanations.`;

// System prompt for follow-up messages (when we have an existing draft)
const FOLLOWUP_SYSTEM_PROMPT = `You are an AI assistant for Omanut BMS. The user is providing additional information to complete a previous request.

CONTEXT: The user previously started a "{existing_intent}" operation. We already have some information and need more details.

YOUR TASK: Extract ONLY the new information from this message. Do not change the intent - we're completing the same operation.

CRITICAL EXTRACTION RULES:
1. Currency is ZMW (Kwacha), "K500" = 500 ZMW, "15k" = 15000
2. Extract amounts as NUMBERS, not strings
3. Payment methods MUST be one of: "Cash", "Mobile Money", "Card"
   - "cash", "paid cash" → "Cash"
   - "momo", "mobile money" → "Mobile Money"  
   - "card", "debit" → "Card"
4. If user says just a product name, extract it as "product"
5. If user says just an amount like "K15000" or "15000", extract it as "amount"
6. If user says a name, determine if it's customer_name based on context

RESPONSE FORMAT (JSON only):
{
  "intent": "{existing_intent}",
  "confidence": "high",
  "entities": {
    // Only include fields that were mentioned in this message
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

EXAMPLES for record_sale follow-ups:

Already have: customer_name: "Mutale", payment_method: "Cash"
User message: "Software development 1 quantity at K15000"
Response: {"intent":"record_sale","confidence":"high","entities":{"product":"Software development","quantity":1,"amount":15000},"requires_confirmation":false,"clarification_needed":null}

Already have: product: "Software development", amount: 15000
User message: "The customer was Mutale and they paid cash"
Response: {"intent":"record_sale","confidence":"high","entities":{"customer_name":"Mutale","payment_method":"Cash"},"requires_confirmation":false,"clarification_needed":null}

Already have: product: "cement", quantity: 5
User message: "K2500"
Response: {"intent":"record_sale","confidence":"high","entities":{"amount":2500},"requires_confirmation":false,"clarification_needed":null}

Already have: product: "design services", amount: 8000
User message: "John paid by mobile money"
Response: {"intent":"record_sale","confidence":"high","entities":{"customer_name":"John","payment_method":"Mobile Money"},"requires_confirmation":false,"clarification_needed":null}

IMPORTANT: Respond with valid JSON only. Extract whatever information you can from the message.`;

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
      
      const existingInfo = context.existing_entities 
        ? `Already collected: ${JSON.stringify(context.existing_entities)}`
        : '';
      
      userPrompt = `${existingInfo}\n\nUser's follow-up message: "${message}"\n\nExtract only the NEW information from this message.`;
    } else if (context?.role) {
      userPrompt = `Parse this message: "${message}"\n\nContext: User role is ${context.role}`;
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
        temperature: 0.05, // Very low temperature for consistent parsing
        response_format: { type: 'json_object' }, // Request JSON response
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
        // Normalize payment method
        if (parsedIntent.entities.payment_method) {
          const pm = String(parsedIntent.entities.payment_method).toLowerCase();
          if (pm.includes('mobile') || pm.includes('momo') || pm.includes('airtel') || pm.includes('mtn')) {
            parsedIntent.entities.payment_method = 'Mobile Money';
          } else if (pm.includes('card') || pm.includes('debit') || pm.includes('credit') || pm.includes('visa')) {
            parsedIntent.entities.payment_method = 'Card';
          } else {
            parsedIntent.entities.payment_method = 'Cash';
          }
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
