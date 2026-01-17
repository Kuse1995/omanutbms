import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const HELP_MESSAGE = `👋 Welcome to Omanut BMS!

📋 Available Commands:
• "Check stock [product]" - View inventory levels
• "List products" - See all available products
• "I sold [qty] [product] to [customer] for K[amount]" - Record a sale
• "Sales today/this week/this month" - Get sales summary
• "Break down sales by client" - See detailed sales by customer
• "Find customer [name]" - Look up customer history
• "Expense K[amount] for [description]" - Record an expense

📄 Document Commands:
• "Send receipt [number]" - Get a receipt PDF
• "Last receipt" - Get your most recent receipt
• "Send invoice [number]" - Get an invoice PDF
• "Send quotation [number]" - Get a quotation PDF

💡 Examples:
"Check stock cement"
"I sold 5 bags of cement to ABC Hardware for K2500 cash"
"Break it down by clients" or "Who bought what today"
"Send me receipt R2025-0042"

⚠️ Important: Record each sale separately for accurate receipts!

Need help? Reply with "help" anytime.`;

const UNREGISTERED_MESSAGE = `❌ This WhatsApp number is not registered with Omanut BMS.

To use WhatsApp BMS:
1. Contact your company administrator
2. Ask them to add your WhatsApp number in Settings → WhatsApp
3. Once added, you can start managing your business via WhatsApp!

Questions? Contact support@omanut.co`;

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
 * Returns whether the action is allowed and the current usage stats
 */
async function checkAndIncrementUsage(
  supabase: any, 
  tenantId: string, 
  phoneNumber: string,
  userId: string | null
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    // Get business profile with billing plan
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('billing_plan, whatsapp_messages_used, whatsapp_usage_reset_date')
      .eq('tenant_id', tenantId)
      .single();

    if (!profile) {
      return { allowed: true, used: 0, limit: 0 }; // Allow if no profile found
    }

    // Get plan config for limits
    const { data: planConfig } = await supabase
      .from('billing_plan_configs')
      .select('whatsapp_monthly_limit, whatsapp_limit_enabled')
      .eq('plan_key', profile.billing_plan)
      .eq('is_active', true)
      .single();

    // Check if limits are enabled and get the limit
    const limitEnabled = planConfig?.whatsapp_limit_enabled ?? true;
    const monthlyLimit = planConfig?.whatsapp_monthly_limit ?? 100;

    // If limits not enabled (enterprise) or limit is 0 (unlimited), allow
    if (!limitEnabled || monthlyLimit === 0) {
      // Log usage but don't enforce
      await supabase.from('whatsapp_usage_logs').insert({
        tenant_id: tenantId,
        whatsapp_number: phoneNumber,
        user_id: userId,
        message_direction: 'inbound',
        success: true,
      });
      return { allowed: true, used: profile.whatsapp_messages_used || 0, limit: monthlyLimit };
    }

    // Check if we need to reset the monthly counter
    const today = new Date().toISOString().split('T')[0];
    const resetDate = profile.whatsapp_usage_reset_date;
    let currentUsed = profile.whatsapp_messages_used || 0;

    // Reset counter if it's a new month
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

    // Check if limit exceeded
    if (currentUsed >= monthlyLimit) {
      return { allowed: false, used: currentUsed, limit: monthlyLimit };
    }

    // Increment usage
    await supabase
      .from('business_profiles')
      .update({ 
        whatsapp_messages_used: currentUsed + 1,
        whatsapp_usage_reset_date: profile.whatsapp_usage_reset_date || today
      })
      .eq('tenant_id', tenantId);

    // Log the usage
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
    // On error, allow the action to proceed
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

    // Extract and validate phone number (remove whatsapp: prefix)
    const rawPhoneNumber = from.replace('whatsapp:', '');
    
    // Validate phone number format (E.164: starts with + followed by 7-15 digits)
    const phoneNumberRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneNumberRegex.test(rawPhoneNumber)) {
      console.error('Invalid phone number format:', rawPhoneNumber);
      return createTwiMLResponse('Invalid phone number format.');
    }
    
    const phoneNumber = rawPhoneNumber;

    // Validate message body (limit length, reject empty)
    if (!body || body.length > 1000) {
      return createTwiMLResponse('Invalid message received.');
    }

    // Look up user by phone number (phone number is validated above, safe for eq())
    const { data: mapping, error: mappingError } = await supabase
      .from('whatsapp_user_mappings')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .single();

    // Handle unregistered or inactive users
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

    // Check WhatsApp usage limits
    const usageLimitResult = await checkAndIncrementUsage(supabase, mapping.tenant_id, phoneNumber, mapping.user_id);
    if (!usageLimitResult.allowed) {
      const limitMessage = `⚠️ WhatsApp message limit reached for this month.

Your plan allows ${usageLimitResult.limit} messages/month.
Used: ${usageLimitResult.used}/${usageLimitResult.limit}

💡 To continue using WhatsApp BMS:
• Ask your admin to upgrade the plan
• Wait for next month's reset

Contact support@omanut.co for help.`;
      
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

    // Check for help command
    if (body.toLowerCase() === 'help' || body.toLowerCase() === 'hi' || body.toLowerCase() === 'hello') {
      // Clear any existing draft when user asks for help
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

    // Check for cancel command
    if (body.toLowerCase() === 'cancel' || body.toLowerCase() === 'reset' || body.toLowerCase() === 'start over') {
      await clearDraft(supabase, mapping.tenant_id, phoneNumber);
      const cancelMessage = '🔄 Cancelled. What would you like to do?';
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

    // Check for pending confirmation (yes/no responses)
    const lowerBody = body.toLowerCase();
    if (lowerBody === 'yes' || lowerBody === 'no' || lowerBody === 'y' || lowerBody === 'n') {
      const pendingResult = await handlePendingConfirmation(supabase, phoneNumber, lowerBody.startsWith('y'), mapping);
      if (pendingResult) {
        // Check if result contains media URL marker
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
      
      // Parse the follow-up message with context about what we're expecting
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
            last_prompt: existingDraft.last_prompt,
            is_followup: true
          }
        }),
      });

      if (!intentResponse.ok) {
        console.error('Intent parser error for follow-up');
        return createTwiMLResponse('⚠️ Sorry, I could not understand. Reply "help" for commands.');
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
        // Still missing fields, update draft and ask again
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

    // Handle document request intents (send_receipt, send_invoice, send_quotation)
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
          const errorMsg = `❌ Could not find that ${documentType}. Please check the number and try again.`;
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

        // Return TwiML with media attachment
        const successMsg = `📄 Here's your ${documentType} ${docResult.document_number}`;
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
        const errorMsg = `⚠️ Error generating ${documentType}. Please try again.`;
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
        // Create a draft and ask for missing info
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
      // Store pending action
      await supabase.from('whatsapp_pending_actions').insert({
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        message_sid: messageSid,
        intent: parsedIntent.intent,
        intent_data: mergedEntities,
        confirmation_message: body,
      });

      const confirmMessage = `⚠️ Please confirm:\n${getConfirmationMessage(parsedIntent.intent, mergedEntities)}\n\nReply YES to confirm or NO to cancel.`;
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
    let responseMessage = bridgeResult.message || (bridgeResult.success ? '✅ Done!' : '❌ Operation failed.');
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
            // PDF is sent above the message, no duplicate text needed
          } else {
            console.error('[whatsapp-bms-handler] Document generation failed:', docResult.error);
            responseMessage += `\n\n⚠️ Receipt saved but PDF could not be generated. View in dashboard.`;
          }
        } catch (docError) {
          console.error('[whatsapp-bms-handler] Auto-receipt generation error:', docError);
          responseMessage += `\n\n⚠️ Receipt saved but PDF generation failed.`;
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

    // Return with or without media attachment
    if (mediaUrl) {
      return createTwiMLResponseWithMedia(responseMessage, mediaUrl);
    }
    return createTwiMLResponse(responseMessage);

  } catch (error) {
    console.error('WhatsApp handler error:', error);
    const errorMessage = '⚠️ An error occurred. Please try again later.';
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
  // Upsert to handle race conditions
  await supabase
    .from('whatsapp_conversation_drafts')
    .upsert({
      tenant_id: tenantId,
      whatsapp_number: phoneNumber,
      user_id: userId,
      intent,
      entities,
      last_prompt: lastPrompt,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
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

function generatePromptForMissingFields(intent: string, missingFields: string[], currentEntities: Record<string, any>): string {
  // Build context of what we already have
  const haveList: string[] = [];
  if (currentEntities.product) haveList.push(`Product: ${currentEntities.product}`);
  if (currentEntities.quantity) haveList.push(`Qty: ${currentEntities.quantity}`);
  if (currentEntities.customer_name) haveList.push(`Customer: ${currentEntities.customer_name}`);
  if (currentEntities.amount) haveList.push(`Amount: K${currentEntities.amount}`);
  if (currentEntities.payment_method) haveList.push(`Payment: ${currentEntities.payment_method}`);
  if (currentEntities.description) haveList.push(`Description: ${currentEntities.description}`);

  const haveText = haveList.length > 0 ? `\n📝 Got: ${haveList.join(', ')}` : '';

  // Generate friendly prompts based on what's missing
  if (intent === 'record_sale') {
    if (missingFields.includes('product') && missingFields.includes('amount')) {
      return `❓ What product did you sell and for how much?${haveText}\n\nExample: "5 bags of cement for K2500"`;
    }
    if (missingFields.includes('product')) {
      return `❓ What product was sold?${haveText}\n\nExample: "5 bags of cement" or "LifeStraw Personal"`;
    }
    if (missingFields.includes('amount')) {
      return `❓ What was the total amount?${haveText}\n\nExample: "K2500" or "2500"`;
    }
  }

  if (intent === 'record_expense') {
    if (missingFields.includes('description') && missingFields.includes('amount')) {
      return `❓ What was the expense for and how much?${haveText}\n\nExample: "K500 for transport"`;
    }
    if (missingFields.includes('description')) {
      return `❓ What was the expense for?${haveText}\n\nExample: "Transport" or "Office supplies"`;
    }
    if (missingFields.includes('amount')) {
      return `❓ How much was the expense?${haveText}\n\nExample: "K500" or "500"`;
    }
  }

  if (intent === 'check_customer') {
    return `❓ What is the customer's name?${haveText}\n\nExample: "John" or "ABC Company"`;
  }

  // Generic fallback
  const fieldNames = missingFields.map(f => f.replace('_', ' ')).join(' and ');
  return `❓ Please provide the ${fieldNames}.${haveText}`;
}

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
  let responseMessage = result.message || (result.success ? '✅ Done!' : '❌ Operation failed.');

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
        // Return a special marker that the caller can detect
        return `${responseMessage}\n__MEDIA_URL__:${docResult.url}`;
      }
    } catch (docError) {
      console.error('Auto-receipt generation error (confirmation):', docError);
    }
  }

  return responseMessage;
}

function getConfirmationMessage(intent: string, entities: any): string {
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
