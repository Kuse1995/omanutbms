import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// System prompt for intent parsing
const SYSTEM_PROMPT = `You are an AI assistant for Omanut BMS (Business Management System) in Zambia. 
Your job is to parse natural language messages from users and extract structured business operations.

SUPPORTED INTENTS:
1. record_sale - Record a new sale transaction
2. check_stock - Check current stock levels
3. list_products - List available products
4. generate_invoice - Generate a new invoice
5. record_expense - Record a business expense
6. get_sales_summary - Get sales summary for a period
7. check_customer - Look up customer information
8. help - User needs help with commands

EXTRACTION RULES:
- Currency is always ZMW (Kwacha), users may say "K500" meaning 500 ZMW
- Extract quantities, product names, customer names, amounts
- For dates, "today", "yesterday", "this week", "this month" are valid
- Payment methods: cash, mobile_money, bank_transfer, credit
- Default quantity to 1 if not specified
- Default payment_method to "cash" if not specified
- If the message clearly provides info for a specific field, extract it even if other fields are missing

RESPONSE FORMAT (JSON only):
{
  "intent": "intent_name",
  "confidence": "high" | "medium" | "low",
  "entities": {
    // Extracted entities specific to the intent
  },
  "requires_confirmation": boolean,
  "clarification_needed": string | null
}

EXAMPLES:

User: "I sold 5 bags of cement to John for K2500 cash"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "product": "cement",
    "quantity": 5,
    "customer_name": "John",
    "amount": 2500,
    "payment_method": "cash"
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

User: "Check stock for LifeStraw"
Response: {
  "intent": "check_stock",
  "confidence": "high",
  "entities": {
    "product": "LifeStraw"
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

User: "How much did we sell this week?"
Response: {
  "intent": "get_sales_summary",
  "confidence": "high",
  "entities": {
    "period": "this_week"
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

User: "Software development for K15000"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "product": "Software development",
    "quantity": 1,
    "amount": 15000
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

User: "The customer was Mutale and paid cash"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "customer_name": "Mutale",
    "payment_method": "cash"
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

User: "hello"
Response: {
  "intent": "help",
  "confidence": "high",
  "entities": {},
  "requires_confirmation": false,
  "clarification_needed": null
}

Always respond with valid JSON only. No other text.`;

// System prompt for follow-up messages (when we have an existing draft)
const FOLLOWUP_SYSTEM_PROMPT = `You are an AI assistant for Omanut BMS. The user is providing additional information to complete a previous request.

CONTEXT: The user previously started a "{existing_intent}" operation. We already have some information and need more details.

YOUR TASK: Extract ONLY the new information from this message. Do not change the intent - we're completing the same operation.

EXTRACTION RULES:
- Currency is ZMW (Kwacha), "K500" means 500 ZMW
- Extract any quantities, product names, customer names, amounts, payment methods mentioned
- If user says just a product name, extract it as "product"
- If user says just an amount like "K15000" or "15000", extract it as "amount"
- If user says a name, try to determine if it's a customer_name or product based on context
- Payment methods: cash, mobile_money, mobile money, momo, bank_transfer, credit
- "paid cash" or "cash payment" means payment_method is "cash"
- "mobile money" or "momo" means payment_method is "mobile_money"

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

Already have: customer_name: "Mutale", payment_method: "cash"
User message: "Software development 1 quantity at K15000"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "product": "Software development",
    "quantity": 1,
    "amount": 15000
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

Already have: product: "Software development", amount: 15000
User message: "The customer was mutale and they paid cash"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "customer_name": "Mutale",
    "payment_method": "cash"
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

Already have: product: "cement", quantity: 5
User message: "K2500"
Response: {
  "intent": "record_sale",
  "confidence": "high",
  "entities": {
    "amount": 2500
  },
  "requires_confirmation": false,
  "clarification_needed": null
}

Always respond with valid JSON only. Extract whatever information you can from the message.`;

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

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent parsing
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
