import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Simplified, conversational help message
const HELP_MESSAGE = `👋 Hi! I'm your BMS assistant.

📌 Quick Examples:
• "sold 5 cement 2500 cash" - Record sale
• "chk stock cement" - Check stock
• "sales today" - Today's total
• "break down by clients" - Sales details
• "exp 200 transport" - Log expense
• "last receipt" - Get receipt

💡 Just tell me what happened!
I understand broken English & shorthand.

Type "help" anytime. Say "cancel" to start over.`;

const UNREGISTERED_MESSAGE = `❌ This number is not registered.

To use WhatsApp BMS:
1. Contact your admin
2. Ask them to add your number in Settings → WhatsApp

Questions? support@omanut.co`;

// Required fields for each intent
const REQUIRED_FIELDS: Record<string, string[]> = {
  record_sale: ['product', 'amount'],
  record_expense: ['description', 'amount'],
  generate_invoice: ['customer_name'],
  check_stock: [],
  list_products: [],
  get_sales_summary: [],
  get_sales_details: [],
  check_customer: ['customer_name'],
  send_receipt: [],
  send_invoice: [],
  send_quotation: [],
};

/**
 * Check and increment WhatsApp usage for a tenant
 */
async function checkAndIncrementUsage(
  supabase: any, 
  tenantId: string, 
  phoneNumber: string,
  userId: string | null
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('billing_plan, whatsapp_messages_used, whatsapp_usage_reset_date')
      .eq('tenant_id', tenantId)
      .single();

    if (!profile) {
      return { allowed: true, used: 0, limit: 0 };
    }

    const { data: planConfig } = await supabase
      .from('billing_plan_configs')
      .select('whatsapp_monthly_limit, whatsapp_limit_enabled')
      .eq('plan_key', profile.billing_plan)
      .eq('is_active', true)
      .single();

    const limitEnabled = planConfig?.whatsapp_limit_enabled ?? true;
    const monthlyLimit = planConfig?.whatsapp_monthly_limit ?? 100;

    if (!limitEnabled || monthlyLimit === 0) {
      await supabase.from('whatsapp_usage_logs').insert({
        tenant_id: tenantId,
        whatsapp_number: phoneNumber,
        user_id: userId,
        message_direction: 'inbound',
        success: true,
      });
      return { allowed: true, used: profile.whatsapp_messages_used || 0, limit: monthlyLimit };
    }

    const today = new Date().toISOString().split('T')[0];
    const resetDate = profile.whatsapp_usage_reset_date;
    let currentUsed = profile.whatsapp_messages_used || 0;

    if (resetDate) {
      const resetDateObj = new Date(resetDate);
      const todayObj = new Date(today);
      if (resetDateObj.getMonth() !== todayObj.getMonth() || resetDateObj.getFullYear() !== todayObj.getFullYear()) {
        currentUsed = 0;
        await supabase
          .from('business_profiles')
          .update({ whatsapp_messages_used: 0, whatsapp_usage_reset_date: today })
          .eq('tenant_id', tenantId);
      }
    }

    if (currentUsed >= monthlyLimit) {
      return { allowed: false, used: currentUsed, limit: monthlyLimit };
    }

    await supabase
      .from('business_profiles')
      .update({ 
        whatsapp_messages_used: currentUsed + 1,
        whatsapp_usage_reset_date: profile.whatsapp_usage_reset_date || today
      })
      .eq('tenant_id', tenantId);

    await supabase.from('whatsapp_usage_logs').insert({
      tenant_id: tenantId,
      whatsapp_number: phoneNumber,
      user_id: userId,
      message_direction: 'inbound',
      success: true,
    });

    return { allowed: true, used: currentUsed + 1, limit: monthlyLimit };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return { allowed: true, used: 0, limit: 0 };
  }
}

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

    console.log(`Received WhatsApp message from ${from}: ${body.substring(0, 100)}`);

    // Extract and validate phone number
    const rawPhoneNumber = from.replace('whatsapp:', '');
    const phoneNumberRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneNumberRegex.test(rawPhoneNumber)) {
      console.error('Invalid phone number format:', rawPhoneNumber);
      return createTwiMLResponse('Invalid phone number.');
    }
    
    const phoneNumber = rawPhoneNumber;

    if (!body || body.length > 1000) {
      return createTwiMLResponse('Message too long or empty.');
    }

    // Look up user by phone number
    const { data: mapping, error: mappingError } = await supabase
      .from('whatsapp_user_mappings')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .single();

    if (mappingError || !mapping) {
      await logAudit(supabase, {
        whatsapp_number: phoneNumber,
        original_message: body.substring(0, 500),
        response_message: UNREGISTERED_MESSAGE,
        success: false,
        error_message: 'Unregistered number',
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(UNREGISTERED_MESSAGE);
    }

    if (!mapping.is_active) {
      const inactiveMessage = '⚠️ Your access is disabled. Contact your admin.';
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

    // Check usage limits
    const usageLimitResult = await checkAndIncrementUsage(supabase, mapping.tenant_id, phoneNumber, mapping.user_id);
    if (!usageLimitResult.allowed) {
      const limitMessage = `⚠️ Monthly limit reached (${usageLimitResult.used}/${usageLimitResult.limit}).

Upgrade your plan or wait for reset.
Contact: support@omanut.co`;
      
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        original_message: body,
        response_message: limitMessage,
        success: false,
        error_message: 'Usage limit exceeded',
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(limitMessage);
    }

    // Update last_used_at
    await supabase
      .from('whatsapp_user_mappings')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', mapping.id);

    // Normalize message for command detection
    const lowerBody = body.toLowerCase().trim();

    // Check for help command (expanded patterns)
    const helpPatterns = ['help', 'hi', 'hello', 'menu', '?', 'helo', 'hlp', 'start', 'hey'];
    if (helpPatterns.includes(lowerBody)) {
      await clearDraft(supabase, mapping.tenant_id, phoneNumber);
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

    // Check for cancel command (expanded patterns)
    const cancelPatterns = ['cancel', 'reset', 'start over', 'stop', 'quit', 'exit', 'clear', 'nevermind', 'nvm'];
    if (cancelPatterns.includes(lowerBody)) {
      await clearDraft(supabase, mapping.tenant_id, phoneNumber);
      const cancelMessage = '🔄 OK, cancelled. What next?';
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'cancel',
        original_message: body,
        response_message: cancelMessage,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(cancelMessage);
    }

    // Check for yes/no confirmations (expanded patterns)
    const yesPatterns = ['yes', 'y', 'yep', 'yeah', 'ok', 'okay', 'sure', 'confirm', 'proceed', 'do it', 'go ahead', 'correct', 'right'];
    const noPatterns = ['no', 'n', 'nope', 'nah', 'wrong', 'cancel', 'stop'];
    
    const isYes = yesPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '));
    const isNo = noPatterns.some(p => lowerBody === p);

    if (isYes || isNo) {
      const pendingResult = await handlePendingConfirmation(supabase, phoneNumber, isYes, mapping);
      if (pendingResult) {
        let responseMessage = pendingResult;
        let mediaUrl: string | null = null;
        
        if (pendingResult.includes('__MEDIA_URL__:')) {
          const parts = pendingResult.split('__MEDIA_URL__:');
          responseMessage = parts[0].trim();
          mediaUrl = parts[1]?.trim() || null;
        }

        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: 'confirmation',
          original_message: body,
          response_message: responseMessage,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        
        if (mediaUrl) {
          return createTwiMLResponseWithMedia(responseMessage, mediaUrl);
        }
        return createTwiMLResponse(responseMessage);
      }
    }

    // Check for existing draft conversation
    const existingDraft = await getDraft(supabase, mapping.tenant_id, phoneNumber);
    
    let parsedIntent;
    let mergedEntities;

    if (existingDraft) {
      console.log('Found existing draft:', existingDraft);
      
      // Get missing fields to provide better context
      const currentMissing = getMissingFields(existingDraft.intent, existingDraft.entities);
      
      // Parse the follow-up message with enhanced context
      const intentResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-intent-parser`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: body,
          context: { 
            role: mapping.role,
            existing_intent: existingDraft.intent,
            existing_entities: existingDraft.entities,
            missing_fields: currentMissing,
            last_prompt: existingDraft.last_prompt,
            is_followup: true
          }
        }),
      });

      if (!intentResponse.ok) {
        console.error('Intent parser error for follow-up');
        return createTwiMLResponse('⚠️ Sorry, didn\'t get that. Try again or say "help".');
      }

      const followUpParsed = await intentResponse.json();
      console.log('Follow-up parsed:', followUpParsed);

      // Merge entities from draft and new message
      mergedEntities = { ...existingDraft.entities, ...followUpParsed.entities };
      parsedIntent = {
        intent: existingDraft.intent,
        confidence: 'high',
        entities: mergedEntities,
        requires_confirmation: false,
        clarification_needed: null,
      };

      // Check if we now have all required fields
      const missingFields = getMissingFields(existingDraft.intent, mergedEntities);
      
      if (missingFields.length > 0) {
        const prompt = generatePromptForMissingFields(existingDraft.intent, missingFields, mergedEntities);
        await updateDraft(supabase, existingDraft.id, mergedEntities, prompt);
        
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: existingDraft.intent,
          original_message: body,
          response_message: prompt,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponse(prompt);
      }

      // All fields present, clear draft and proceed
      await clearDraft(supabase, mapping.tenant_id, phoneNumber);
      
    } else {
      // No existing draft - parse as new intent
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
        const errorMessage = '⚠️ Didn\'t understand. Say "help" for examples.';
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

      parsedIntent = await intentResponse.json();
      console.log('Parsed intent:', parsedIntent);
      mergedEntities = parsedIntent.entities;
    }

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

    // Handle document request intents
    if (['send_receipt', 'send_invoice', 'send_quotation'].includes(parsedIntent.intent)) {
      const docTypeMap: Record<string, string> = {
        send_receipt: 'receipt',
        send_invoice: 'invoice',
        send_quotation: 'quotation',
      };
      const documentType = docTypeMap[parsedIntent.intent];

      try {
        const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type: documentType,
            document_number: mergedEntities.document_number || null,
            tenant_id: mapping.tenant_id,
          }),
        });

        const docResult = await docResponse.json();

        if (!docResponse.ok || !docResult.success) {
          const errorMsg = `❌ ${documentType} not found. Check number?`;
          await logAudit(supabase, {
            tenant_id: mapping.tenant_id,
            whatsapp_number: phoneNumber,
            user_id: mapping.user_id,
            display_name: mapping.display_name,
            intent: parsedIntent.intent,
            original_message: body,
            response_message: errorMsg,
            success: false,
            error_message: docResult.error,
            execution_time_ms: Date.now() - startTime,
          });
          return createTwiMLResponse(errorMsg);
        }

        const successMsg = `📄 Here's ${documentType} ${docResult.document_number}`;
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: parsedIntent.intent,
          original_message: body,
          response_message: successMsg,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponseWithMedia(successMsg, docResult.url);

      } catch (docError) {
        console.error('Document generation error:', docError);
        const errorMsg = `⚠️ Error getting ${documentType}. Try again.`;
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: parsedIntent.intent,
          original_message: body,
          response_message: errorMsg,
          success: false,
          error_message: docError instanceof Error ? docError.message : 'Unknown error',
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponse(errorMsg);
      }
    }

    // Check for missing required fields (for new intents without drafts)
    if (!existingDraft) {
      const missingFields = getMissingFields(parsedIntent.intent, mergedEntities);
      
      if (missingFields.length > 0) {
        const prompt = generatePromptForMissingFields(parsedIntent.intent, missingFields, mergedEntities);
        await createDraft(supabase, mapping.tenant_id, phoneNumber, mapping.user_id, parsedIntent.intent, mergedEntities, prompt);
        
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: parsedIntent.intent,
          original_message: body,
          response_message: prompt,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponse(prompt);
      }
    }

    // Check if confirmation is required for high-value transactions
    const amount = mergedEntities.amount || 0;
    const needsConfirmation = (parsedIntent.intent === 'record_sale' && amount >= 10000) ||
                              (parsedIntent.intent === 'record_expense' && amount >= 5000) ||
                              parsedIntent.intent === 'generate_invoice';

    if (needsConfirmation) {
      await supabase.from('whatsapp_pending_actions').insert({
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        message_sid: messageSid,
        intent: parsedIntent.intent,
        intent_data: mergedEntities,
        confirmation_message: body,
      });

      const confirmMessage = getConfirmationMessage(parsedIntent.intent, mergedEntities);
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
        entities: mergedEntities,
        context: {
          tenant_id: mapping.tenant_id,
          user_id: mapping.user_id,
          role: mapping.role,
          display_name: mapping.display_name,
        },
      }),
    });

    const bridgeResult = await bridgeResponse.json();
    let responseMessage = bridgeResult.message || (bridgeResult.success ? '✅ Done!' : '❌ Failed.');
    let mediaUrl: string | null = null;

    console.log('[whatsapp-bms-handler] Bridge result:', JSON.stringify({
      success: bridgeResult.success,
      intent: parsedIntent.intent,
      receipt_number: bridgeResult.data?.receipt_number,
      tenant_id: bridgeResult.data?.tenant_id || mapping.tenant_id,
    }));

    // Auto-send receipt for ALL successful WhatsApp sales
    if (bridgeResult.success && parsedIntent.intent === 'record_sale') {
      const receiptNumber = bridgeResult.data?.receipt_number;
      const tenantId = bridgeResult.data?.tenant_id || mapping.tenant_id;
      
      if (receiptNumber && tenantId) {
        console.log('[whatsapp-bms-handler] Generating receipt PDF for:', receiptNumber);
        
        try {
          const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              document_type: 'receipt',
              document_number: receiptNumber,
              tenant_id: tenantId,
            }),
          });

          const docResult = await docResponse.json();
          console.log('[whatsapp-bms-handler] Document generation result:', JSON.stringify({
            ok: docResponse.ok,
            success: docResult.success,
            url: docResult.url ? 'present' : 'missing',
            error: docResult.error,
          }));

          if (docResponse.ok && docResult.success && docResult.url) {
            mediaUrl = docResult.url;
          } else {
            console.error('[whatsapp-bms-handler] Document generation failed:', docResult.error);
            responseMessage += `\n\n⚠️ Receipt saved. PDF failed.`;
          }
        } catch (docError) {
          console.error('[whatsapp-bms-handler] Auto-receipt generation error:', docError);
          responseMessage += `\n\n⚠️ Receipt saved. PDF failed.`;
        }
      } else {
        console.warn('[whatsapp-bms-handler] Missing receipt_number or tenant_id for PDF generation');
      }
    }

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

    if (mediaUrl) {
      return createTwiMLResponseWithMedia(responseMessage, mediaUrl);
    }
    return createTwiMLResponse(responseMessage);

  } catch (error) {
    console.error('WhatsApp handler error:', error);
    const errorMessage = '⚠️ Error. Try again.';
    return createTwiMLResponse(errorMessage);
  }
});

// Draft management functions
async function getDraft(supabase: any, tenantId: string, phoneNumber: string) {
  const { data, error } = await supabase
    .from('whatsapp_conversation_drafts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('whatsapp_number', phoneNumber)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !data) return null;
  return data;
}

async function createDraft(supabase: any, tenantId: string, phoneNumber: string, userId: string, intent: string, entities: any, lastPrompt: string) {
  await supabase
    .from('whatsapp_conversation_drafts')
    .upsert({
      tenant_id: tenantId,
      whatsapp_number: phoneNumber,
      user_id: userId,
      intent,
      entities,
      last_prompt: lastPrompt,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, {
      onConflict: 'tenant_id,whatsapp_number'
    });
}

async function updateDraft(supabase: any, draftId: string, entities: any, lastPrompt: string) {
  await supabase
    .from('whatsapp_conversation_drafts')
    .update({
      entities,
      last_prompt: lastPrompt,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .eq('id', draftId);
}

async function clearDraft(supabase: any, tenantId: string, phoneNumber: string) {
  await supabase
    .from('whatsapp_conversation_drafts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('whatsapp_number', phoneNumber);
}

function getMissingFields(intent: string, entities: Record<string, any>): string[] {
  const required = REQUIRED_FIELDS[intent] || [];
  return required.filter(field => {
    const value = entities[field];
    return value === undefined || value === null || value === '';
  });
}

// Simplified, friendlier prompts for missing fields
function generatePromptForMissingFields(intent: string, missingFields: string[], currentEntities: Record<string, any>): string {
  // Build what we have so far
  const haveList: string[] = [];
  if (currentEntities.product) haveList.push(`📦 ${currentEntities.product}`);
  if (currentEntities.quantity && currentEntities.quantity > 1) haveList.push(`x${currentEntities.quantity}`);
  if (currentEntities.customer_name) haveList.push(`👤 ${currentEntities.customer_name}`);
  if (currentEntities.amount) haveList.push(`💰 K${currentEntities.amount}`);
  if (currentEntities.payment_method) haveList.push(`💳 ${currentEntities.payment_method}`);
  if (currentEntities.description) haveList.push(`📝 ${currentEntities.description}`);

  const haveText = haveList.length > 0 ? `\n✅ Got: ${haveList.join(' • ')}` : '';

  // Simplified prompts based on what's missing
  if (intent === 'record_sale') {
    if (missingFields.includes('product') && missingFields.includes('amount')) {
      return `❓ What did you sell and for how much?${haveText}\n\nExample: "5 bags cement 2500"`;
    }
    if (missingFields.includes('product')) {
      return `❓ What item?${haveText}\n\nExample: "cement" or "5 bags"`;
    }
    if (missingFields.includes('amount')) {
      return `❓ How much? (K)${haveText}\n\nExample: "2500" or "2k"`;
    }
  }

  if (intent === 'record_expense') {
    if (missingFields.includes('description') && missingFields.includes('amount')) {
      return `❓ What expense and how much?${haveText}\n\nExample: "500 transport"`;
    }
    if (missingFields.includes('description')) {
      return `❓ What for?${haveText}\n\nExample: "fuel" or "supplies"`;
    }
    if (missingFields.includes('amount')) {
      return `❓ How much? (K)${haveText}\n\nExample: "500"`;
    }
  }

  if (intent === 'check_customer') {
    return `❓ Customer name?${haveText}\n\nExample: "John" or "ABC Shop"`;
  }

  // Generic fallback
  const fieldNames = missingFields.map(f => f.replace('_', ' ')).join(' & ');
  return `❓ Need: ${fieldNames}${haveText}`;
}

async function handlePendingConfirmation(supabase: any, phoneNumber: string, confirmed: boolean, mapping: any) {
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
    return null;
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', pending.id);

  if (!confirmed) {
    return '❌ Cancelled.';
  }

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
  let responseMessage = result.message || (result.success ? '✅ Done!' : '❌ Failed.');

  // Auto-send receipt for confirmed sales
  if (result.success && pending.intent === 'record_sale' && result.data?.receipt_number) {
    try {
      const docResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-whatsapp-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: 'receipt',
          document_number: result.data.receipt_number,
          tenant_id: mapping.tenant_id,
        }),
      });

      const docResult = await docResponse.json();
      if (docResponse.ok && docResult.success && docResult.url) {
        return `${responseMessage}\n__MEDIA_URL__:${docResult.url}`;
      }
    } catch (docError) {
      console.error('Auto-receipt generation error (confirmation):', docError);
    }
  }

  return responseMessage;
}

// Simplified confirmation messages
function getConfirmationMessage(intent: string, entities: any): string {
  const qty = entities.quantity || 1;
  const product = entities.product || 'item';
  const amount = entities.amount?.toLocaleString() || '0';
  const customer = entities.customer_name || 'Walk-in';

  switch (intent) {
    case 'record_sale':
      return `⚠️ Confirm sale:\n${qty}x ${product} → K${amount}\nCustomer: ${customer}\n\nReply Y or N`;
    case 'record_expense':
      return `⚠️ Confirm expense:\nK${amount} for "${entities.description}"\n\nReply Y or N`;
    case 'generate_invoice':
      return `⚠️ Create invoice for ${customer}?\n\nReply Y or N`;
    default:
      return `⚠️ Confirm ${intent.replace('_', ' ')}?\n\nReply Y or N`;
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

function createTwiMLResponseWithMedia(message: string, mediaUrl: string): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${escapeXml(message)}</Body>
    <Media>${escapeXml(mediaUrl)}</Media>
  </Message>
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
