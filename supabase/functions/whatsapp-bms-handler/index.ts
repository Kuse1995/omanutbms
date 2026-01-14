import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

const HELP_MESSAGE = `👋 Welcome to Omanut BMS!

📋 Available Commands:
• "Check stock [product]" - View inventory levels
• "List products" - See all available products
• "I sold [qty] [product] to [customer] for K[amount]" - Record a sale
• "Sales today/this week/this month" - Get sales summary
• "Find customer [name]" - Look up customer history
• "Expense K[amount] for [description]" - Record an expense

💡 Examples:
"Check stock cement"
"I sold 5 bags of cement to ABC Hardware for K2500 cash"
"Sales this week"

Need help? Reply with "help" anytime.`;

const UNREGISTERED_MESSAGE = `❌ This WhatsApp number is not registered with Omanut BMS.

To use WhatsApp BMS:
1. Contact your company administrator
2. Ask them to add your WhatsApp number in Settings → WhatsApp
3. Once added, you can start managing your business via WhatsApp!

Questions? Contact support@omanut.co`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Parse Twilio webhook payload
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString()?.trim() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log(`Received WhatsApp message from ${from}: ${body}`);

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = from.replace('whatsapp:', '');

    if (!phoneNumber || !body) {
      return createTwiMLResponse('Invalid message received.');
    }

    // Look up user by phone number
    const { data: mapping, error: mappingError } = await supabase
      .from('whatsapp_user_mappings')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .single();

    // Handle unregistered or inactive users
    if (mappingError || !mapping) {
      await logAudit(supabase, {
        whatsapp_number: phoneNumber,
        original_message: body,
        response_message: UNREGISTERED_MESSAGE,
        success: false,
        error_message: 'Unregistered number',
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(UNREGISTERED_MESSAGE);
    }

    if (!mapping.is_active) {
      const inactiveMessage = '⚠️ Your WhatsApp access has been disabled. Please contact your administrator.';
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        original_message: body,
        response_message: inactiveMessage,
        success: false,
        error_message: 'Inactive user',
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(inactiveMessage);
    }

    // Update last_used_at
    await supabase
      .from('whatsapp_user_mappings')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', mapping.id);

    // Check for help command
    if (body.toLowerCase() === 'help' || body.toLowerCase() === 'hi' || body.toLowerCase() === 'hello') {
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'help',
        original_message: body,
        response_message: HELP_MESSAGE,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(HELP_MESSAGE);
    }

    // Check for pending confirmation (yes/no responses)
    const lowerBody = body.toLowerCase();
    if (lowerBody === 'yes' || lowerBody === 'no' || lowerBody === 'y' || lowerBody === 'n') {
      const pendingResult = await handlePendingConfirmation(supabase, phoneNumber, lowerBody.startsWith('y'), mapping);
      if (pendingResult) {
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: 'confirmation',
          original_message: body,
          response_message: pendingResult,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponse(pendingResult);
      }
    }

    // Call intent parser
    const intentResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-intent-parser`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: body,
        context: { role: mapping.role }
      }),
    });

    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error('Intent parser error:', errorText);
      const errorMessage = '⚠️ Sorry, I could not understand your request. Reply "help" for available commands.';
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        original_message: body,
        response_message: errorMessage,
        success: false,
        error_message: 'Intent parser failed',
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(errorMessage);
    }

    const parsedIntent = await intentResponse.json();
    console.log('Parsed intent:', parsedIntent);

    // Handle help intent
    if (parsedIntent.intent === 'help') {
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'help',
        original_message: body,
        response_message: HELP_MESSAGE,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(HELP_MESSAGE);
    }

    // Handle low confidence or clarification needed
    if (parsedIntent.confidence === 'low' || parsedIntent.clarification_needed) {
      const clarifyMessage = parsedIntent.clarification_needed || 
        '❓ I\'m not sure what you mean. Could you please rephrase? Reply "help" for examples.';
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: parsedIntent.intent,
        original_message: body,
        response_message: clarifyMessage,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(clarifyMessage);
    }

    // Check if confirmation is required
    if (parsedIntent.requires_confirmation) {
      // Store pending action
      await supabase.from('whatsapp_pending_actions').insert({
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        message_sid: messageSid,
        intent: parsedIntent.intent,
        intent_data: parsedIntent.entities,
        confirmation_message: body,
      });

      const confirmMessage = `⚠️ Please confirm:\n${getConfirmationMessage(parsedIntent)}\n\nReply YES to confirm or NO to cancel.`;
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: parsedIntent.intent,
        original_message: body,
        response_message: confirmMessage,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(confirmMessage);
    }

    // Execute the intent via BMS API Bridge
    const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: parsedIntent.intent,
        entities: parsedIntent.entities,
        context: {
          tenant_id: mapping.tenant_id,
          user_id: mapping.user_id,
          role: mapping.role,
          display_name: mapping.display_name,
        },
      }),
    });

    const bridgeResult = await bridgeResponse.json();
    const responseMessage = bridgeResult.message || (bridgeResult.success ? '✅ Done!' : '❌ Operation failed.');

    await logAudit(supabase, {
      tenant_id: mapping.tenant_id,
      whatsapp_number: phoneNumber,
      user_id: mapping.user_id,
      display_name: mapping.display_name,
      intent: parsedIntent.intent,
      original_message: body,
      response_message: responseMessage,
      success: bridgeResult.success,
      error_message: bridgeResult.error,
      execution_time_ms: Date.now() - startTime,
    });

    return createTwiMLResponse(responseMessage);

  } catch (error) {
    console.error('WhatsApp handler error:', error);
    const errorMessage = '⚠️ An error occurred. Please try again later.';
    return createTwiMLResponse(errorMessage);
  }
});

async function handlePendingConfirmation(supabase: any, phoneNumber: string, confirmed: boolean, mapping: any) {
  // Check for pending action
  const { data: pending, error } = await supabase
    .from('whatsapp_pending_actions')
    .select('*')
    .eq('whatsapp_number', phoneNumber)
    .is('processed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !pending) {
    return null; // No pending action
  }

  // Mark as processed
  await supabase
    .from('whatsapp_pending_actions')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', pending.id);

  if (!confirmed) {
    return '❌ Action cancelled.';
  }

  // Execute the confirmed action
  const bridgeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bms-api-bridge`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: pending.intent,
      entities: pending.intent_data,
      context: {
        tenant_id: mapping.tenant_id,
        user_id: mapping.user_id,
        role: mapping.role,
        display_name: mapping.display_name,
      },
    }),
  });

  const result = await bridgeResponse.json();
  return result.message || (result.success ? '✅ Done!' : '❌ Operation failed.');
}

function getConfirmationMessage(parsedIntent: any): string {
  const { intent, entities } = parsedIntent;
  
  switch (intent) {
    case 'record_sale':
      return `Record sale of ${entities.quantity || 1}x ${entities.product} for K${entities.amount?.toLocaleString()} to ${entities.customer_name || 'Walk-in'}?`;
    case 'record_expense':
      return `Record expense of K${entities.amount?.toLocaleString()} for "${entities.description}"?`;
    case 'generate_invoice':
      return `Generate invoice for ${entities.customer_name}?`;
    default:
      return `Proceed with ${intent.replace('_', ' ')}?`;
  }
}

async function logAudit(supabase: any, data: any) {
  try {
    await supabase.from('whatsapp_audit_logs').insert(data);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

function createTwiMLResponse(message: string): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(twiml, {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'text/xml' 
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
