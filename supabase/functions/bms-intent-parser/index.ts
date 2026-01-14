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
- If unclear, set confidence to "low"

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

User: "Generate invoice for ABC Company"
Response: {
  "intent": "generate_invoice",
  "confidence": "medium",
  "entities": {
    "customer_name": "ABC Company"
  },
  "requires_confirmation": true,
  "clarification_needed": "What items should be included in the invoice?"
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Parse this message: "${message}"${context ? `\n\nContext: ${JSON.stringify(context)}` : ''}` }
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
        intent: 'help',
        confidence: 'low',
        entities: {},
        requires_confirmation: false,
        clarification_needed: 'I could not understand your request. Please try again.',
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
