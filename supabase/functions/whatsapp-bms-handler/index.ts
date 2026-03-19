import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Friendly, conversational help message
const HELP_MESSAGE = `Hey there! 👋 I'm your business assistant.

Here's what I can help with:

📦 *Sales & Stock*
"sold 5 cement 2500 cash" or "check stock cement" or "list products"

💳 *Credit Sales*
"sold 3 bags to John on credit 1500" or "who owes me"

📋 *Invoices & Quotes*
"invoice John 5 bags cement 2500" or "quote for ABC 10 bags 5000"

📊 *Reports*
"daily report" or "sales today" or "sales this week"

👔 *Your Work*
"my tasks", "clock in", "my pay"

📄 *Documents*
"last receipt" or "send invoice 2026-0001"

💰 *Expenses*
"spent 200 on transport"

📸 *Stock Upload*
Send a photo of your price list to add products!

Just chat naturally - I understand shortcuts! Say "cancel" anytime to start fresh.`;

const UNREGISTERED_MESSAGE = `Hi! I don't recognize this number yet.

Would you like to register your business? Just say "register" or "sign up" to get started!

Already have an account? Ask your admin to add your WhatsApp number in Settings → WhatsApp.`;

// Required fields for each intent
const REQUIRED_FIELDS: Record<string, string[]> = {
  record_sale: ['product', 'amount'],
  record_expense: ['description', 'amount'],
  generate_invoice: ['customer_name'],
  create_invoice: ['customer_name', 'items'],
  create_quotation: ['customer_name', 'items'],
  credit_sale: ['product', 'amount', 'customer_name'],
  who_owes: [],
  daily_report: [],
  check_stock: [],
  list_products: [],
  get_sales_summary: [],
  get_sales_details: [],
  check_customer: ['customer_name'],
  send_receipt: [],
  send_invoice: [],
  send_quotation: [],
  send_payslip: [],
  my_tasks: [],
  task_details: ['order_number'],
  my_schedule: [],
  clock_in: [],
  clock_out: [],
  my_attendance: [],
  my_pay: [],
  team_attendance: [],
  pending_orders: [],
  low_stock_alerts: [],
  update_order_status: ['order_number', 'new_status'],
};

// ===================== WORKFLOW ENGINE =====================

interface WorkflowRecord {
  id: string;
  phone: string;
  tenant_id: string | null;
  current_workflow: string;
  workflow_step: string;
  workflow_state: Record<string, any>;
  pending_fields: string[];
  completed_fields: string[];
  expires_at: string;
}

async function getActiveWorkflow(supabase: any, phone: string): Promise<WorkflowRecord | null> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function startWorkflow(supabase: any, phone: string, tenantId: string | null, workflow: string, step: string, state: Record<string, any> = {}): Promise<WorkflowRecord> {
  // Delete any existing workflow for this phone
  await supabase.from('whatsapp_conversations').delete().eq('phone', phone);
  
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone,
      tenant_id: tenantId,
      current_workflow: workflow,
      workflow_step: step,
      workflow_state: state,
      pending_fields: [],
      completed_fields: [],
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw new Error('Failed to start workflow: ' + error.message);
  return data;
}

async function advanceWorkflow(supabase: any, id: string, step: string, newState: Record<string, any>, completedField?: string): Promise<void> {
  const updateData: any = {
    workflow_step: step,
    workflow_state: newState,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  
  await supabase
    .from('whatsapp_conversations')
    .update(updateData)
    .eq('id', id);
}

async function completeWorkflow(supabase: any, id: string): Promise<void> {
  await supabase.from('whatsapp_conversations').delete().eq('id', id);
}

async function cancelWorkflow(supabase: any, phone: string): Promise<void> {
  await supabase.from('whatsapp_conversations').delete().eq('phone', phone);
}

// ===================== ONBOARDING WORKFLOW (Phase 2) =====================

const BUSINESS_TYPES = ['Retail', 'Services', 'Manufacturing', 'Food & Beverage', 'Agriculture', 'Other'];
const CURRENCIES = ['ZMW', 'USD', 'KES', 'NGN', 'ZAR', 'GHS', 'TZS', 'UGX'];

async function processOnboardingWorkflow(supabase: any, workflow: WorkflowRecord, body: string, phone: string): Promise<string> {
  const state = workflow.workflow_state || {};
  const step = workflow.workflow_step;
  const lowerBody = body.toLowerCase().trim();

  switch (step) {
    case 'ask_business_name': {
      if (body.length < 2 || body.length > 100) {
        return "Please enter a valid business name (2-100 characters).";
      }
      state.business_name = body.trim();
      await advanceWorkflow(supabase, workflow.id, 'ask_business_type', state);
      return `Great! "${state.business_name}" 👍

What type of business is it?
1️⃣ Retail
2️⃣ Services
3️⃣ Manufacturing
4️⃣ Food & Beverage
5️⃣ Agriculture
6️⃣ Other

Just send the number or name.`;
    }

    case 'ask_business_type': {
      const num = parseInt(body);
      let businessType: string;
      if (num >= 1 && num <= 6) {
        businessType = BUSINESS_TYPES[num - 1];
      } else {
        const match = BUSINESS_TYPES.find(t => t.toLowerCase().includes(lowerBody));
        if (match) {
          businessType = match;
        } else {
          return "I didn't get that. Send a number (1-6) or type the business type.";
        }
      }
      state.business_type = businessType;
      await advanceWorkflow(supabase, workflow.id, 'ask_currency', state);
      return `${businessType} business, got it! 🏪

Which currency do you use?
1️⃣ ZMW (Kwacha)
2️⃣ USD (US Dollar)
3️⃣ KES (Kenya Shilling)
4️⃣ NGN (Nigerian Naira)
5️⃣ ZAR (South African Rand)
6️⃣ GHS (Ghana Cedi)
7️⃣ TZS (Tanzania Shilling)
8️⃣ UGX (Uganda Shilling)

Send the number.`;
    }

    case 'ask_currency': {
      const num = parseInt(body);
      let currency: string;
      if (num >= 1 && num <= CURRENCIES.length) {
        currency = CURRENCIES[num - 1];
      } else {
        const upperBody = body.toUpperCase().trim();
        const match = CURRENCIES.find(c => c === upperBody);
        if (match) {
          currency = match;
        } else if (lowerBody.includes('kwacha') || lowerBody.includes('zmw')) {
          currency = 'ZMW';
        } else if (lowerBody.includes('dollar') || lowerBody.includes('usd')) {
          currency = 'USD';
        } else {
          return "Send a number (1-8) or the currency code (e.g., ZMW).";
        }
      }
      state.currency = currency;
      await advanceWorkflow(supabase, workflow.id, 'ask_owner_name', state);
      return `${currency} it is! 💰

What's your full name? (This will be the account owner name)`;
    }

    case 'ask_owner_name': {
      if (body.length < 2 || body.length > 100) {
        return "Please enter a valid name (2-100 characters).";
      }
      state.owner_name = body.trim();
      await advanceWorkflow(supabase, workflow.id, 'confirm_details', state);
      return `Perfect! Here's your registration summary:

🏢 *Business:* ${state.business_name}
📋 *Type:* ${state.business_type}
💰 *Currency:* ${state.currency}
👤 *Owner:* ${state.owner_name}
📱 *Phone:* ${phone}

Everything look correct? Say *yes* to create your account or *no* to start over.`;
    }

    case 'confirm_details': {
      const yesPatterns = ['yes', 'y', 'yep', 'yeah', 'ok', 'okay', 'sure', 'confirm', 'correct', 'right', 'sha', 'iyee', 'eya'];
      const noPatterns = ['no', 'n', 'nope', 'nah', 'wrong', 'cancel', 'start over'];
      
      if (noPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        await completeWorkflow(supabase, workflow.id);
        return "No problem, registration cancelled. Say \"register\" anytime to start again!";
      }
      
      if (!yesPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        return "Just say *yes* to confirm or *no* to start over.";
      }

      // Create the tenant via bridge
      try {
        const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_tenant_from_whatsapp',
            business_name: state.business_name,
            business_type: state.business_type,
            currency: state.currency,
            owner_name: state.owner_name,
            phone: phone,
          }),
        });

        const result = await bridgeResponse.json();
        
        if (result.success) {
          await completeWorkflow(supabase, workflow.id);
          return `🎉 Welcome to Omanut BMS, ${state.owner_name}!

Your business "${state.business_name}" is now set up. Here's what you can do right away:

📦 "add stock" - Add your products
💰 "sold 5 cement 2500" - Record a sale
📊 "daily report" - Get your summary
📋 "invoice John 5000" - Create an invoice

Say "help" anytime to see all commands!`;
        } else {
          await completeWorkflow(supabase, workflow.id);
          return `❌ Registration failed: ${result.error || 'Unknown error'}. Please try again later or contact support@omanut.co`;
        }
      } catch (err) {
        console.error('Onboarding bridge error:', err);
        await completeWorkflow(supabase, workflow.id);
        return "⚠️ Something went wrong creating your account. Please try again or contact support@omanut.co";
      }
    }

    default:
      await completeWorkflow(supabase, workflow.id);
      return "Something went wrong with the registration. Say \"register\" to start again.";
  }
}

// ===================== STOCK UPLOAD WORKFLOW (Phase 3) =====================

async function processStockUploadWorkflow(supabase: any, workflow: WorkflowRecord, body: string, phone: string, formData?: FormData): Promise<string> {
  const state = workflow.workflow_state || {};
  const step = workflow.workflow_step;
  const lowerBody = body.toLowerCase().trim();

  switch (step) {
    case 'waiting_for_image': {
      // Check if they sent text instead
      if (body && !formData?.get('MediaUrl0')) {
        // Try to parse as text-based product list
        if (lowerBody === 'cancel' || lowerBody === 'nevermind') {
          await completeWorkflow(supabase, workflow.id);
          return "No problem, cancelled! What else can I help with?";
        }
        
        // Try parsing comma/newline separated product list
        return "Please send a *photo* of your product list, or say \"cancel\" to stop.\n\nTip: You can also type products like:\n\"Cement 250, Blocks 15, Sand 800\"";
      }
      
      const mediaUrl = formData?.get('MediaUrl0')?.toString();
      const mediaType = formData?.get('MediaContentType0')?.toString() || '';
      
      if (!mediaUrl) {
        return "I'm waiting for a photo of your product list. Just snap a pic and send it! 📸";
      }
      
      if (!mediaType.startsWith('image/')) {
        return "That doesn't look like an image. Please send a photo of your price list or inventory sheet.";
      }

      state.media_url = mediaUrl;
      state.media_type = mediaType;
      await advanceWorkflow(supabase, workflow.id, 'extracting', state);

      // Call the stock extractor
      try {
        const extractResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-stock-extractor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_url: mediaUrl,
            media_type: mediaType,
            tenant_id: workflow.tenant_id,
          }),
        });

        const extractResult = await extractResponse.json();
        
        if (!extractResult.success || !extractResult.products?.length) {
          await completeWorkflow(supabase, workflow.id);
          return "😕 I couldn't find any products in that image. Try a clearer photo, or type your products like:\n\"Cement 250, Blocks 15, Sand 800\"";
        }

        state.extracted_products = extractResult.products;
        await advanceWorkflow(supabase, workflow.id, 'confirm_extracted', state);

        const productList = extractResult.products.map((p: any, i: number) => 
          `${i + 1}. ${p.name} - ${p.quantity || '?'} units @ K${p.price || '?'}`
        ).join('\n');

        return `📸 I found *${extractResult.products.length} products* in your image:\n\n${productList}\n\nLook correct? Say *yes* to add them all, or *no* to cancel.`;
      } catch (err) {
        console.error('Stock extraction error:', err);
        await completeWorkflow(supabase, workflow.id);
        return "⚠️ Image processing failed. Try again or type products manually.";
      }
    }

    case 'confirm_extracted': {
      const yesPatterns = ['yes', 'y', 'yep', 'yeah', 'ok', 'okay', 'sure', 'confirm', 'correct', 'sha'];
      const noPatterns = ['no', 'n', 'nope', 'nah', 'wrong', 'cancel'];

      if (noPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        await completeWorkflow(supabase, workflow.id);
        return "Cancelled. Send another photo or type your products to try again!";
      }

      if (!yesPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        return "Say *yes* to add the products or *no* to cancel.";
      }

      // Bulk insert via bridge
      try {
        const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: 'bulk_add_inventory',
            entities: { products: state.extracted_products },
            context: {
              tenant_id: workflow.tenant_id,
              user_id: null,
              role: 'admin',
              display_name: 'WhatsApp Stock Upload',
            },
          }),
        });

        const result = await bridgeResponse.json();
        await completeWorkflow(supabase, workflow.id);

        if (result.success) {
          return `✅ Added *${result.data?.added || state.extracted_products.length} products* to your inventory!\n\nSay "list products" to see them all, or "check stock" to verify.`;
        } else {
          return `⚠️ Some products may not have been added: ${result.error || 'Unknown error'}`;
        }
      } catch (err) {
        console.error('Bulk inventory error:', err);
        await completeWorkflow(supabase, workflow.id);
        return "⚠️ Failed to save products. Please try again.";
      }
    }

    default:
      await completeWorkflow(supabase, workflow.id);
      return "Stock upload cancelled. Send a photo anytime to try again!";
  }
}

// ===================== GUIDED INVOICE WORKFLOW (Phase 4) =====================

async function processGuidedInvoiceWorkflow(supabase: any, workflow: WorkflowRecord, body: string, phone: string): Promise<string> {
  const state = workflow.workflow_state || {};
  const step = workflow.workflow_step;
  const lowerBody = body.toLowerCase().trim();
  const docType = workflow.current_workflow === 'guided_invoice' ? 'invoice' : 'quotation';
  const docLabel = docType === 'invoice' ? 'Invoice' : 'Quotation';

  switch (step) {
    case 'ask_customer': {
      if (body.length < 1 || body.length > 200) {
        return "Please enter the customer's name.";
      }
      state.customer_name = body.trim();
      state.items = [];
      await advanceWorkflow(supabase, workflow.id, 'add_item', state);
      return `👤 Customer: *${state.customer_name}*

Now let's add items. Tell me the first item:
Format: *quantity name price*
Example: "5 bags cement 500" or "1 service consultation 2000"`;
    }

    case 'add_item': {
      if (lowerBody === 'done' || lowerBody === 'finish' || lowerBody === 'thats all' || lowerBody === "that's all") {
        if (!state.items?.length) {
          return "You haven't added any items yet! Tell me an item like: \"5 bags cement 500\"";
        }
        await advanceWorkflow(supabase, workflow.id, 'review', state);
        return formatInvoiceReview(state, docLabel);
      }

      // Try to parse item from the message via intent parser
      try {
        const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-intent-parser`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: body,
            context: {
              role: 'admin',
              existing_intent: 'create_invoice',
              is_followup: true,
              missing_fields: ['items'],
              last_prompt: 'What item do you want to add?',
            },
          }),
        });

        const parsed = await parseResponse.json();
        const entities = parsed?.entities || {};

        // Try to extract item info
        let itemName = entities.product || entities.description || body.split(/\d/)[0]?.trim() || body;
        let quantity = entities.quantity || 1;
        let unitPrice = entities.amount || entities.unit_price || 0;

        // If items were returned in array format
        if (entities.items?.length) {
          const item = entities.items[0];
          itemName = item.description || item.product || itemName;
          quantity = item.quantity || quantity;
          unitPrice = item.unit_price || item.amount || unitPrice;
        }

        // Smart item matching against inventory
        if (workflow.tenant_id && unitPrice === 0) {
          const { data: matchedItem } = await supabase
            .from('inventory')
            .select('name, unit_price')
            .eq('tenant_id', workflow.tenant_id)
            .ilike('name', `%${itemName.substring(0, 20)}%`)
            .limit(1)
            .maybeSingle();
          
          if (matchedItem?.unit_price) {
            unitPrice = matchedItem.unit_price;
            itemName = matchedItem.name; // Use exact inventory name
          }
        }

        if (unitPrice === 0) {
          state.pending_item = { description: itemName, quantity };
          await advanceWorkflow(supabase, workflow.id, 'ask_item_price', state);
          return `Got *${quantity}x ${itemName}*. What's the unit price?`;
        }

        const newItem = {
          description: itemName,
          quantity,
          unit_price: unitPrice,
          amount: quantity * unitPrice,
        };
        state.items = [...(state.items || []), newItem];
        await advanceWorkflow(supabase, workflow.id, 'add_item', state);

        const total = state.items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
        return `✅ Added: ${quantity}x ${itemName} @ K${unitPrice.toLocaleString()} = K${newItem.amount.toLocaleString()}

Running total: *K${total.toLocaleString()}* (${state.items.length} items)

Add another item or say *done* to finish.`;
      } catch (err) {
        console.error('Item parsing error:', err);
        return "I didn't understand that item. Try: \"5 bags cement 500\" or \"1 consultation 2000\"";
      }
    }

    case 'ask_item_price': {
      const price = parseFloat(body.replace(/[kK,\s]/g, ''));
      if (isNaN(price) || price <= 0) {
        return "Please enter a valid price (e.g., 500 or K500).";
      }

      const pending = state.pending_item;
      const newItem = {
        description: pending.description,
        quantity: pending.quantity,
        unit_price: price,
        amount: pending.quantity * price,
      };
      state.items = [...(state.items || []), newItem];
      delete state.pending_item;
      await advanceWorkflow(supabase, workflow.id, 'add_item', state);

      const total = state.items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
      return `✅ Added: ${pending.quantity}x ${pending.description} @ K${price.toLocaleString()} = K${newItem.amount.toLocaleString()}

Running total: *K${total.toLocaleString()}* (${state.items.length} items)

Add another item or say *done* to finish.`;
    }

    case 'review': {
      const yesPatterns = ['yes', 'y', 'yep', 'ok', 'okay', 'sure', 'confirm', 'correct', 'sha', 'create', 'send'];
      const noPatterns = ['no', 'n', 'nope', 'cancel', 'wrong'];

      if (noPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        await completeWorkflow(supabase, workflow.id);
        return `${docLabel} cancelled. Start again anytime!`;
      }

      if (!yesPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '))) {
        return `Say *yes* to create the ${docLabel.toLowerCase()} or *no* to cancel.`;
      }

      // Create via bridge
      try {
        const intent = docType === 'invoice' ? 'create_invoice' : 'create_quotation';
        const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent,
            entities: {
              customer_name: state.customer_name,
              items: state.items,
            },
            context: {
              tenant_id: workflow.tenant_id,
              user_id: null,
              role: 'admin',
              display_name: 'WhatsApp Guided',
            },
          }),
        });

        const result = await bridgeResponse.json();
        await completeWorkflow(supabase, workflow.id);

        if (result.success) {
          let responseMsg = result.message || `✅ ${docLabel} created!`;
          
          // Try to auto-send PDF
          const docNumber = result.data?.invoice_number || result.data?.quotation_number;
          if (docNumber) {
            try {
              const pdfResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  document_type: docType,
                  document_number: docNumber,
                  tenant_id: workflow.tenant_id,
                }),
              });
              const pdfResult = await pdfResponse.json();
              if (pdfResult.success && pdfResult.url) {
                return `${responseMsg}\n__MEDIA_URL__:${pdfResult.url}`;
              }
            } catch (pdfErr) {
              console.error('PDF generation error:', pdfErr);
            }
          }
          
          return responseMsg;
        } else {
          return `❌ Failed to create ${docLabel.toLowerCase()}: ${result.error || 'Unknown error'}`;
        }
      } catch (err) {
        console.error('Guided doc creation error:', err);
        await completeWorkflow(supabase, workflow.id);
        return `⚠️ Something went wrong. Please try again.`;
      }
    }

    default:
      await completeWorkflow(supabase, workflow.id);
      return `${docLabel} workflow cancelled. Start again anytime!`;
  }
}

function formatInvoiceReview(state: Record<string, any>, docLabel: string): string {
  const itemList = (state.items || []).map((item: any, i: number) => 
    `  ${i + 1}. ${item.quantity}x ${item.description} @ K${item.unit_price?.toLocaleString()} = K${item.amount?.toLocaleString()}`
  ).join('\n');
  const total = (state.items || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  return `📋 *${docLabel} Summary*

👤 Customer: ${state.customer_name}
${itemList}
━━━━━━━━━━━━━━━
💵 *Total: K${total.toLocaleString()}*

Say *yes* to create or *no* to cancel.`;
}

// ===================== WORKFLOW ROUTER =====================

async function processWorkflow(supabase: any, workflow: WorkflowRecord, body: string, phone: string, formData?: FormData): Promise<string> {
  switch (workflow.current_workflow) {
    case 'onboarding':
      return processOnboardingWorkflow(supabase, workflow, body, phone);
    case 'stock_upload':
      return processStockUploadWorkflow(supabase, workflow, body, phone, formData);
    case 'guided_invoice':
    case 'guided_quotation':
      return processGuidedInvoiceWorkflow(supabase, workflow, body, phone);
    default:
      await completeWorkflow(supabase, workflow.id);
      return "Workflow expired. What would you like to do?";
  }
}

// ===================== USAGE TRACKING =====================

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

// ===================== MAIN HANDLER =====================

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
    
    // Extract media info (Phase 3: image uploads)
    const mediaUrl0 = formData.get('MediaUrl0')?.toString() || '';
    const mediaContentType0 = formData.get('MediaContentType0')?.toString() || '';
    const hasMedia = !!mediaUrl0;
    
    // Extract location data
    const latitude = parseFloat(formData.get('Latitude')?.toString() || '');
    const longitude = parseFloat(formData.get('Longitude')?.toString() || '');
    const hasLocation = !isNaN(latitude) && !isNaN(longitude);

    console.log(`Received WhatsApp message from ${from}: ${body.substring(0, 100)}${hasLocation ? ` [Location]` : ''}${hasMedia ? ` [Media: ${mediaContentType0}]` : ''}`);

    // Extract and validate phone number
    const rawPhoneNumber = from.replace('whatsapp:', '');
    const phoneNumberRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneNumberRegex.test(rawPhoneNumber)) {
      console.error('Invalid phone number format:', rawPhoneNumber);
      return createTwiMLResponse('Invalid phone number.');
    }
    
    const phoneNumber = rawPhoneNumber;

    if (body.length > 1000) {
      return createTwiMLResponse('Message too long.');
    }
    
    if (!body && !hasLocation && !hasMedia) {
      return createTwiMLResponse('Please send a text message, share your location, or send a photo.');
    }

    // ===== PHASE 1: Check for active workflow FIRST =====
    const activeWorkflow = await getActiveWorkflow(supabase, phoneNumber);
    
    if (activeWorkflow) {
      // Cancel commands always work
      const lowerBody = body.toLowerCase().trim();
      const cancelPatterns = ['cancel', 'reset', 'start over', 'stop', 'quit', 'exit', 'clear', 'nevermind', 'nvm', 'forget it', 'scratch that'];
      if (cancelPatterns.includes(lowerBody)) {
        await cancelWorkflow(supabase, phoneNumber);
        // Also clear any drafts
        const mapping = await getMapping(supabase, phoneNumber);
        if (mapping) {
          await clearDraft(supabase, mapping.tenant_id, phoneNumber);
        }
        const cancelMessage = 'No problem, cancelled! What would you like to do instead?';
        await logAudit(supabase, {
          tenant_id: activeWorkflow.tenant_id,
          whatsapp_number: phoneNumber,
          intent: 'cancel',
          original_message: body,
          response_message: cancelMessage,
          success: true,
          execution_time_ms: Date.now() - startTime,
        });
        return createTwiMLResponse(cancelMessage);
      }

      // Process the workflow
      const workflowResponse = await processWorkflow(supabase, activeWorkflow, body, phoneNumber, formData);
      
      let responseMessage = workflowResponse;
      let mediaResponseUrl: string | null = null;
      
      if (workflowResponse.includes('__MEDIA_URL__:')) {
        const parts = workflowResponse.split('__MEDIA_URL__:');
        responseMessage = parts[0].trim();
        mediaResponseUrl = parts[1]?.trim() || null;
      }

      await logAudit(supabase, {
        tenant_id: activeWorkflow.tenant_id,
        whatsapp_number: phoneNumber,
        intent: `workflow:${activeWorkflow.current_workflow}`,
        original_message: body,
        response_message: responseMessage,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });

      if (mediaResponseUrl) {
        return createTwiMLResponseWithMedia(responseMessage, mediaResponseUrl);
      }
      return createTwiMLResponse(responseMessage);
    }

    // ===== Look up user by phone number =====
    const mapping = await getMapping(supabase, phoneNumber);

    if (!mapping) {
      // PHASE 2: Check if unregistered user wants to register
      const lowerBody = body.toLowerCase().trim();
      const registerPatterns = ['register', 'sign up', 'signup', 'new business', 'create account', 'i want to register', 'join', 'start business'];
      
      if (registerPatterns.some(p => lowerBody.includes(p))) {
        // Rate limit: check if recently attempted
        const { data: recentWorkflow } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('phone', phoneNumber)
          .eq('current_workflow', 'onboarding')
          .maybeSingle();
        
        if (recentWorkflow) {
          return createTwiMLResponse("You already have a registration in progress. Say \"cancel\" first if you want to start over.");
        }

        // Start onboarding workflow
        await startWorkflow(supabase, phoneNumber, null, 'onboarding', 'ask_business_name');
        
        await logAudit(supabase, {
          whatsapp_number: phoneNumber,
          original_message: body,
          response_message: 'Starting onboarding',
          success: true,
          intent: 'register',
          execution_time_ms: Date.now() - startTime,
        });
        
        return createTwiMLResponse(`Welcome! Let's set up your business on Omanut BMS 🚀

What's your business name?`);
      }

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
      const inactiveMessage = "Your access has been paused. Please check with your admin to get it sorted!";
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
      const limitMessage = `You've hit the monthly message limit (${usageLimitResult.used}/${usageLimitResult.limit}).

Your admin can upgrade the plan to keep chatting, or it'll reset next month. Contact support@omanut.co if you need help!`;
      
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

    const lowerBody = body.toLowerCase().trim();

    // ===== PHASE 3: Image message → start stock upload workflow =====
    if (hasMedia && mediaContentType0.startsWith('image/')) {
      // Start stock upload workflow with the image
      const workflow = await startWorkflow(supabase, phoneNumber, mapping.tenant_id, 'stock_upload', 'waiting_for_image');
      const response = await processStockUploadWorkflow(supabase, workflow, body, phoneNumber, formData);
      
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'stock_upload',
        original_message: `[Image: ${mediaContentType0}]`,
        response_message: response,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(response);
    }

    // Check for help command
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

    // Check for cancel command
    const cancelPatterns = ['cancel', 'reset', 'start over', 'stop', 'quit', 'exit', 'clear', 'nevermind', 'nvm', 'forget it', 'scratch that'];
    if (cancelPatterns.includes(lowerBody)) {
      await clearDraft(supabase, mapping.tenant_id, phoneNumber);
      const cancelMessage = 'No problem, cancelled! What would you like to do instead?';
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

    // Handle location-only messages (for clock-in/clock-out)
    if (!body && hasLocation) {
      console.log('Location-only message received, checking for pending attendance action');
      
      const { data: pendingConfirmation } = await supabase
        .from('whatsapp_pending_confirmations')
        .select('*')
        .eq('tenant_id', mapping.tenant_id)
        .eq('whatsapp_number', phoneNumber)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (pendingConfirmation && ['clock_in', 'clock_out'].includes(pendingConfirmation.intent)) {
        console.log('Found pending clock action, processing with location');
        
        await supabase
          .from('whatsapp_pending_confirmations')
          .delete()
          .eq('id', pendingConfirmation.id);
        
        const contextData: any = {
          tenant_id: mapping.tenant_id,
          user_id: mapping.user_id,
          employee_id: mapping.employee_id,
          role: mapping.role,
          display_name: mapping.display_name,
          is_self_service: mapping.is_employee_self_service,
          location: { latitude, longitude },
        };
        
        const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: pendingConfirmation.intent,
            entities: pendingConfirmation.entities || {},
            context: contextData,
          }),
        });
        
        const bridgeResult = await bridgeResponse.json();
        const responseMessage = bridgeResult.message || (bridgeResult.success ? 'Done!' : 'Something went wrong.');
        
        await logAudit(supabase, {
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          display_name: mapping.display_name,
          intent: pendingConfirmation.intent,
          original_message: `[Location: ${latitude}, ${longitude}]`,
          response_message: responseMessage,
          success: bridgeResult.success,
          execution_time_ms: Date.now() - startTime,
        });
        
        return createTwiMLResponse(responseMessage);
      }
      
      const noContextMessage = "I see you shared your location! 📍 To clock in, just say 'clock in' first, then share your location when I ask.";
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        original_message: `[Location: ${latitude}, ${longitude}]`,
        response_message: noContextMessage,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(noContextMessage);
    }

    // ===== PHASE 4: Check for guided invoice/quotation triggers =====
    const guidedInvoicePatterns = ['guided invoice', 'step by step invoice', 'create invoice step', 'new invoice'];
    const guidedQuotationPatterns = ['guided quote', 'guided quotation', 'step by step quote', 'new quotation', 'new quote'];
    const stockUploadPatterns = ['add stock', 'upload stock', 'upload products', 'add products', 'add my products', 'bulk stock', 'add items'];
    
    if (guidedInvoicePatterns.some(p => lowerBody.includes(p))) {
      await startWorkflow(supabase, phoneNumber, mapping.tenant_id, 'guided_invoice', 'ask_customer');
      const msg = "Let's create an invoice step by step! 📋\n\nWho is the customer?";
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'guided_invoice',
        original_message: body,
        response_message: msg,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(msg);
    }

    if (guidedQuotationPatterns.some(p => lowerBody.includes(p))) {
      await startWorkflow(supabase, phoneNumber, mapping.tenant_id, 'guided_quotation', 'ask_customer');
      const msg = "Let's create a quotation step by step! 📋\n\nWho is the customer?";
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'guided_quotation',
        original_message: body,
        response_message: msg,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(msg);
    }

    if (stockUploadPatterns.some(p => lowerBody.includes(p))) {
      await startWorkflow(supabase, phoneNumber, mapping.tenant_id, 'stock_upload', 'waiting_for_image');
      const msg = "📸 Send me a photo of your price list, product sheet, or handwritten stock list!\n\nI'll read it and add the products for you. Or say \"cancel\" to stop.";
      await logAudit(supabase, {
        tenant_id: mapping.tenant_id,
        whatsapp_number: phoneNumber,
        user_id: mapping.user_id,
        display_name: mapping.display_name,
        intent: 'stock_upload',
        original_message: body,
        response_message: msg,
        success: true,
        execution_time_ms: Date.now() - startTime,
      });
      return createTwiMLResponse(msg);
    }

    // ===== Yes/No confirmation handling =====
    const yesPatterns = [
      'yes', 'y', 'yep', 'yeah', 'yea', 'yah', 'yup', 'ya',
      'ok', 'okay', 'k', 'okey', 'oki',
      'sure', 'sure thing', 'of course', 'absolutely', 'definitely',
      'confirm', 'confirmed', 'proceed', 'continue', 'go', 'go ahead', 'do it', 'lets go',
      'correct', 'right', 'thats right', 'thats correct', 'exactly', 'spot on', 'bingo',
      'perfect', 'great', 'good', 'fine', 'alright', 'all good', 'sounds good', 'looks good',
      'affirmative', 'approved', 'accept', 'agreed', 'done',
      'sha', 'iyee', 'eya', 'eh', 'ehh', 'ehe',
      'sure boss', 'yes boss', 'okay boss', 'alright boss',
      'sharp', 'sharp sharp', 'shap', 'aight', 'bet', 'cool', 'nice',
      'yass', 'yep yep', 'mhm', 'mmhm', 'uh huh', 'for sure'
    ];
    const noPatterns = [
      'no', 'n', 'nope', 'nah', 'nay', 'negative', 'not', 
      'wrong', 'incorrect', 'cancel', 'stop', 'abort', 'dont', "don't",
      'wait', 'hold on', 'nevermind', 'never mind', 'forget it', 'scratch that'
    ];
    
    const isYes = yesPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' ') || lowerBody.startsWith(p + ','));
    const isNo = noPatterns.some(p => lowerBody === p || lowerBody.startsWith(p + ' '));

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

    // ===== Check for existing draft conversation =====
    const existingDraft = await getDraft(supabase, mapping.tenant_id, phoneNumber);
    
    let parsedIntent;
    let mergedEntities;

    if (existingDraft) {
      console.log('Found existing draft:', existingDraft);
      
      const currentMissing = getMissingFields(existingDraft.intent, existingDraft.entities);
      
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
        return createTwiMLResponse("Hmm, I didn't quite get that. Can you try saying it differently, or say \"help\" to see what I can do?");
      }

      const followUpParsed = await intentResponse.json();
      console.log('Follow-up parsed:', followUpParsed);

      mergedEntities = { ...existingDraft.entities, ...followUpParsed.entities };
      parsedIntent = {
        intent: existingDraft.intent,
        confidence: 'high',
        entities: mergedEntities,
        requires_confirmation: false,
        clarification_needed: null,
      };

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
        const errorMessage = "I'm not sure what you mean. Try telling me in simpler words, or say \"help\" to see examples!";
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
    if (['send_receipt', 'send_invoice', 'send_quotation', 'send_payslip'].includes(parsedIntent.intent)) {
      const docTypeMap: Record<string, string> = {
        send_receipt: 'receipt',
        send_invoice: 'invoice',
        send_quotation: 'quotation',
        send_payslip: 'payslip',
      };
      const documentType = docTypeMap[parsedIntent.intent];

      try {
        let documentId: string | null = null;
        
        if (documentType === 'payslip' && mapping.employee_id) {
          const { data: payroll } = await supabase
            .from('payroll_records')
            .select('id')
            .eq('tenant_id', mapping.tenant_id)
            .eq('employee_id', mapping.employee_id)
            .order('pay_period_end', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (payroll) {
            documentId = payroll.id;
          }
        }

        const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type: documentType,
            document_id: documentId,
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

    // Check if confirmation is required
    const amount = mergedEntities.amount || 0;
    const needsConfirmation = (parsedIntent.intent === 'record_sale' && amount >= 10000) ||
                              (parsedIntent.intent === 'credit_sale') ||
                              (parsedIntent.intent === 'create_invoice') ||
                              (parsedIntent.intent === 'create_quotation') ||
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
    const contextData: any = {
      tenant_id: mapping.tenant_id,
      user_id: mapping.user_id,
      role: mapping.role,
      display_name: mapping.display_name,
    };
    
    if (mapping.employee_id) {
      contextData.employee_id = mapping.employee_id;
    }
    if (mapping.is_employee_self_service) {
      contextData.is_self_service = true;
    }
    
    if ((parsedIntent.intent === 'clock_in' || parsedIntent.intent === 'clock_out') && hasLocation) {
      contextData.location = { latitude, longitude };
    }
    
    const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: parsedIntent.intent,
        entities: mergedEntities,
        context: contextData,
      }),
    });

    const bridgeResult = await bridgeResponse.json();
    let responseMessage = bridgeResult.message || bridgeResult.error || (bridgeResult.success ? '✅ Done!' : '❌ Failed.');
    let mediaUrl: string | null = null;

    // Store pending location for clock-in/out
    if (!bridgeResult.success && 
        ['clock_in', 'clock_out'].includes(parsedIntent.intent) &&
        bridgeResult.message?.includes('location')) {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await supabase
        .from('whatsapp_pending_confirmations')
        .upsert({
          tenant_id: mapping.tenant_id,
          whatsapp_number: phoneNumber,
          user_id: mapping.user_id,
          intent: parsedIntent.intent,
          entities: mergedEntities || {},
          pending_data: { awaiting_location: true },
          expires_at: expiresAt,
        }, {
          onConflict: 'tenant_id,whatsapp_number'
        });
    }

    // Auto-send receipt for ALL successful WhatsApp sales
    if (bridgeResult.success && parsedIntent.intent === 'record_sale') {
      const receiptNumber = bridgeResult.data?.receipt_number;
      const tenantId = bridgeResult.data?.tenant_id || mapping.tenant_id;
      
      if (receiptNumber && tenantId) {
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
          if (docResponse.ok && docResult.success && docResult.url) {
            mediaUrl = docResult.url;
          } else {
            responseMessage += `\n\n⚠️ Receipt saved. PDF failed.`;
          }
        } catch (docError) {
          console.error('Auto-receipt generation error:', docError);
          responseMessage += `\n\n⚠️ Receipt saved. PDF failed.`;
        }
      }
    }

    // Auto-send payslip PDF for my_pay intent
    if (bridgeResult.success && parsedIntent.intent === 'my_pay' && bridgeResult.data?.payroll_id) {
      try {
        const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type: 'payslip',
            document_id: bridgeResult.data.payroll_id,
            tenant_id: bridgeResult.data.tenant_id || mapping.tenant_id,
          }),
        });

        const docResult = await docResponse.json();
        if (docResponse.ok && docResult.success && docResult.url) {
          mediaUrl = docResult.url;
        }
      } catch (docError) {
        console.error('Payslip PDF generation error:', docError);
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
    const errorMessage = "Oops, something went wrong on my end. Give it another try in a moment!";
    return createTwiMLResponse(errorMessage);
  }
});

// ===================== UTILITY FUNCTIONS =====================

async function getMapping(supabase: any, phoneNumber: string) {
  const { data, error } = await supabase
    .from('whatsapp_user_mappings')
    .select('*')
    .eq('whatsapp_number', phoneNumber)
    .single();
  if (error || !data) return null;
  return data;
}

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

function generatePromptForMissingFields(intent: string, missingFields: string[], currentEntities: Record<string, any>): string {
  const haveList: string[] = [];
  if (currentEntities.product) {
    const qty = currentEntities.quantity && currentEntities.quantity > 1 ? `${currentEntities.quantity} ` : '';
    haveList.push(`${qty}${currentEntities.product}`);
  }
  if (currentEntities.customer_name) haveList.push(`to ${currentEntities.customer_name}`);
  if (currentEntities.amount) haveList.push(`for K${currentEntities.amount.toLocaleString()}`);
  if (currentEntities.payment_method) haveList.push(`by ${currentEntities.payment_method}`);
  if (currentEntities.description) haveList.push(currentEntities.description);

  const haveSummary = haveList.length > 0 ? `\n\nGot it: ${haveList.join(', ')}.` : '';

  if (intent === 'record_sale') {
    if (missingFields.includes('product') && missingFields.includes('amount')) {
      return `What did you sell and for how much?${haveSummary}`;
    }
    if (missingFields.includes('product')) return `What did you sell?${haveSummary}`;
    if (missingFields.includes('amount')) return `How much was it?${haveSummary}`;
  }

  if (intent === 'record_expense') {
    if (missingFields.includes('description') && missingFields.includes('amount')) {
      return `What did you spend on and how much?${haveSummary}`;
    }
    if (missingFields.includes('description')) return `What was it for?${haveSummary}`;
    if (missingFields.includes('amount')) return `How much did you spend?${haveSummary}`;
  }

  if (intent === 'check_customer') return `Which customer are you looking for?${haveSummary}`;
  if (intent === 'task_details' && missingFields.includes('order_number')) return `Which order? Just give me the number like CO-001.${haveSummary}`;

  if (intent === 'update_order_status') {
    if (missingFields.includes('order_number')) return `Which order are you updating?${haveSummary}`;
    if (missingFields.includes('new_status')) return `What's the new status? (e.g., cutting done, sewing done, ready)${haveSummary}`;
  }

  if (intent === 'generate_invoice' && missingFields.includes('customer_name')) return `Who should I create the invoice for?${haveSummary}`;

  if (intent === 'create_invoice') {
    if (missingFields.includes('customer_name') && missingFields.includes('items')) return `Who is the invoice for and what items? Example: "invoice John 5 bags cement 2500"${haveSummary}`;
    if (missingFields.includes('customer_name')) return `Who is the invoice for?${haveSummary}`;
    if (missingFields.includes('items')) return `What items should I include? E.g. "5 bags cement at 500 each"${haveSummary}`;
  }

  if (intent === 'create_quotation') {
    if (missingFields.includes('customer_name') && missingFields.includes('items')) return `Who is the quotation for and what items? Example: "quote John 10 bags at 500"${haveSummary}`;
    if (missingFields.includes('customer_name')) return `Who is the quotation for?${haveSummary}`;
    if (missingFields.includes('items')) return `What items should I quote? E.g. "10 bags cement at 500"${haveSummary}`;
  }

  if (intent === 'credit_sale') {
    if (missingFields.includes('customer_name')) return `Who are you selling to on credit?${haveSummary}`;
    if (missingFields.includes('product') && missingFields.includes('amount')) return `What did you sell on credit and for how much?${haveSummary}`;
    if (missingFields.includes('product')) return `What product was sold on credit?${haveSummary}`;
    if (missingFields.includes('amount')) return `How much was the credit sale for?${haveSummary}`;
  }

  const fieldNames = missingFields.map(f => f.replace(/_/g, ' ')).join(' and ');
  return `Just need the ${fieldNames} to continue.${haveSummary}`;
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

  if (error || !pending) return null;

  await supabase
    .from('whatsapp_pending_actions')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', pending.id);

  if (!confirmed) return 'No worries, cancelled! Let me know what else you need.';

  const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/bms-api-bridge`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
      const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

function getConfirmationMessage(intent: string, entities: any): string {
  const qty = entities.quantity || 1;
  const product = entities.product || 'item';
  const amount = entities.amount?.toLocaleString() || '0';
  const customer = entities.customer_name || 'Walk-in';
  const paymentMethod = entities.payment_method || 'cash';

  switch (intent) {
    case 'record_sale': {
      const qtyText = qty > 1 ? `${qty}x ` : '';
      const customerText = customer !== 'Walk-in' ? ` to ${customer}` : '';
      return `Quick check - selling ${qtyText}${product}${customerText} for K${amount}, ${paymentMethod.toLowerCase()} payment.\n\nSound right? Just say yes or make any corrections.`;
    }
    case 'record_expense':
      return `Recording K${amount} expense for "${entities.description}".\n\nLooks good? Say yes to confirm.`;
    case 'generate_invoice':
      return `I'll create an invoice for ${customer}.\n\nGood to go?`;
    case 'create_invoice': {
      const itemList = (entities.items || []).map((item: any) => 
        `  • ${item.quantity || 1}x ${item.description || item.product || 'Item'} @ K${(item.unit_price || 0).toLocaleString()}`
      ).join('\n');
      const total = (entities.items || []).reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
      return `Creating invoice for ${customer}:\n${itemList}\n💵 Total: K${total.toLocaleString()}\n\nLooks right? Say yes to create.`;
    }
    case 'create_quotation': {
      const itemList = (entities.items || []).map((item: any) => 
        `  • ${item.quantity || 1}x ${item.description || item.product || 'Item'} @ K${(item.unit_price || 0).toLocaleString()}`
      ).join('\n');
      const total = (entities.items || []).reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
      return `Creating quotation for ${customer}:\n${itemList}\n💵 Total: K${total.toLocaleString()}\n\nLooks right? Say yes to create.`;
    }
    case 'credit_sale': {
      const cQty = qty > 1 ? `${qty}x ` : '';
      return `Recording credit sale: ${cQty}${product} to ${customer} for K${amount}.\n\nAn invoice will be created. Say yes to confirm.`;
    }
    default:
      return `Just confirming - ${intent.replace(/_/g, ' ')}?\n\nSay yes to proceed.`;
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
