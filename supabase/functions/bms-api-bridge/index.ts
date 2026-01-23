import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] ?? '').trim() || null;
}

// Role-based permissions for WhatsApp BMS operations
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 
    'get_sales_summary', 'get_sales_details', 'check_customer',
    'my_tasks', 'task_details', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay',
    'team_attendance', 'pending_orders', 'low_stock_alerts', 'update_order_status'
  ],
  manager: [
    'record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 
    'get_sales_summary', 'get_sales_details', 'check_customer',
    'my_tasks', 'task_details', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay',
    'team_attendance', 'pending_orders', 'low_stock_alerts', 'update_order_status'
  ],
  accountant: [
    'check_stock', 'list_products', 'generate_invoice', 'record_expense', 'get_sales_summary', 'get_sales_details',
    'my_tasks', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay'
  ],
  hr_manager: [
    'check_stock', 'list_products', 'get_sales_summary',
    'my_tasks', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay',
    'team_attendance'
  ],
  sales_rep: [
    'record_sale', 'check_stock', 'list_products', 'get_sales_details', 'check_customer',
    'my_tasks', 'task_details', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay'
  ],
  cashier: [
    'record_sale', 'check_stock', 'list_products',
    'clock_in', 'clock_out', 'my_attendance', 'my_pay'
  ],
  staff: [
    'record_sale', 'check_stock', 'list_products', 'record_expense', 'get_sales_details',
    'my_tasks', 'task_details', 'my_schedule', 'clock_in', 'clock_out', 'my_attendance', 'my_pay',
    'update_order_status'
  ],
  viewer: [
    'check_stock', 'list_products', 'get_sales_summary', 'get_sales_details',
    'clock_in', 'clock_out', 'my_attendance'
  ],
};

// Confirmation thresholds (in ZMW)
const CONFIRMATION_THRESHOLDS = {
  record_sale: 10000,
  record_expense: 5000,
  generate_invoice: 0, // Always confirm
};

interface ExecutionContext {
  tenant_id: string;
  user_id: string;
  role: string;
  display_name: string;
}

const PAYMENT_METHOD_CANONICAL: Record<string, 'Cash' | 'Mobile Money' | 'Card'> = {
  cash: 'Cash',
  'cash payment': 'Cash',
  momo: 'Mobile Money',
  mobile_money: 'Mobile Money',
  'mobile money': 'Mobile Money',
  mobilemoney: 'Mobile Money',
  card: 'Card',
  debit: 'Card',
  credit: 'Card',
};

function normalizePaymentMethod(input: unknown): 'Cash' | 'Mobile Money' | 'Card' {
  const key = String(input ?? '').trim().toLowerCase();
  return PAYMENT_METHOD_CANONICAL[key] ?? 'Cash';
}

/**
 * Escapes SQL LIKE/ILIKE wildcards to prevent injection attacks.
 * PostgreSQL LIKE special characters: % (match any) and _ (match single)
 */
function escapeSqlLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_');   // Escape underscores
}

/**
 * Sanitizes user input for safe use in database queries.
 * Removes potentially dangerous characters and limits length.
 */
function sanitizeUserInput(input: unknown, maxLength = 200): string {
  const str = String(input ?? '').trim();
  // Remove null bytes and control characters, limit length
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, maxLength);
}

// Common abbreviation expansions for fuzzy matching
const PRODUCT_ABBREVIATIONS: Record<string, string[]> = {
  'cmnt': ['cement'],
  'cmt': ['cement'],
  'strw': ['straw', 'lifestraw'],
  'straw': ['lifestraw'],
  'btl': ['bottle'],
  'bg': ['bag', 'bags'],
  'bgs': ['bags'],
  'pcs': ['pieces'],
  'ltr': ['liter', 'liters'],
  'lts': ['liters'],
};

// Words to ignore when matching products (noise words)
const NOISE_WORDS = ['service', 'services', 'product', 'item', 'items', 'the', 'a', 'an', 'of', 'for', 'to', 'bag', 'bags', 'unit', 'units', 'piece', 'pieces'];

function normalizeProductQuery(input: unknown): { raw: string; pattern: string; searchTerms: string[] } {
  const raw = sanitizeUserInput(input, 100);
  
  // Normalize and tokenize
  let tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NOISE_WORDS.includes(t));

  // Expand abbreviations
  const expandedTokens: string[] = [];
  for (const token of tokens) {
    if (PRODUCT_ABBREVIATIONS[token]) {
      expandedTokens.push(...PRODUCT_ABBREVIATIONS[token]);
    } else {
      expandedTokens.push(token);
    }
  }

  // Create search pattern - use most significant tokens
  const significantTokens = expandedTokens.slice(0, 3); // Limit to 3 most important tokens
  const patternCore = significantTokens.length
    ? significantTokens.map(escapeSqlLikePattern).join('%')
    : escapeSqlLikePattern(raw.toLowerCase().replace(/\s+/g, ' '));

  return { 
    raw, 
    pattern: `%${patternCore}%`,
    searchTerms: significantTokens
  };
}

/**
 * Generates a sequential receipt number in the format RYYYY-XXXX
 * This matches the BMS payment_receipts format exactly.
 * Uses MAX numeric extraction to avoid duplicates.
 */
async function generateSequentialReceiptNumber(supabase: any, tenantId: string, attempt: number = 0): Promise<string> {
  if (attempt > 0) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  }

  const year = new Date().getFullYear();
  const prefix = `R${year}`;
  
  // Get the latest receipt number for this tenant and year, ordered by created_at
  const { data: lastReceipt } = await supabase
    .from('payment_receipts')
    .select('receipt_number, created_at')
    .eq('tenant_id', tenantId)
    .like('receipt_number', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(10);

  let maxNum = 0;
  if (lastReceipt) {
    for (const receipt of lastReceipt) {
      const match = receipt.receipt_number?.match(/R\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1 + attempt;
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generates a sequential sale number in the format SYYYY-XXXX.
 * Uses MAX numeric extraction + attempt offset to reduce race-condition collisions.
 */
async function generateSequentialSaleNumber(supabase: any, tenantId: string, attempt: number = 0): Promise<string> {
  if (attempt > 0) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  }

  const year = new Date().getFullYear();
  const prefix = `S${year}`;

  // Get the latest sale numbers for this tenant and year
  const { data: lastSales } = await supabase
    .from('sales')
    .select('sale_number, created_at')
    .eq('tenant_id', tenantId)
    .like('sale_number', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(10);

  let maxNum = 0;
  if (lastSales) {
    for (const sale of lastSales) {
      const match = String(sale.sale_number || '').match(/S\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  // Add attempt offset to avoid collision on retry
  const nextNum = maxNum + 1 + attempt;
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require auth: either an internal service-role call (from our own backend functions)
    // or an end-user JWT (dashboard).
    const authHeader = req.headers.get('Authorization');
    const bearer = getBearerToken(req);
    if (!authHeader || !bearer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const isInternal = bearer === SUPABASE_SERVICE_ROLE_KEY;
    let callerUserId: string | null = null;

    if (!isInternal) {
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      callerUserId = user.id;
    }

    const { intent, entities, context } = await req.json() as {
      intent: string;
      entities: Record<string, any>;
      context: ExecutionContext;
    };

    if (!intent || !context?.tenant_id || !context?.user_id || !context?.role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If this is a user JWT call, ensure the caller is the same user claimed in context.
    if (!isInternal && callerUserId && callerUserId !== context.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Defense-in-depth: validate user belongs to the tenant, and derive role from DB.
    const { data: tenantUser, error: tuErr } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', context.tenant_id)
      .eq('user_id', context.user_id)
      .maybeSingle();

    if (tuErr || !tenantUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: tenant access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Override role from DB (don’t trust client-supplied role)
    context.role = String(tenantUser.role);

    // Check role permissions
    const allowedIntents = ROLE_PERMISSIONS[context.role] || [];
    if (!allowedIntents.includes(intent)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `You don't have permission to ${intent.replace('_', ' ')}. Your role: ${context.role}` 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    let result;
    switch (intent) {
      case 'check_stock':
        result = await handleCheckStock(supabase, entities, context);
        break;
      case 'list_products':
        result = await handleListProducts(supabase, context);
        break;
      case 'record_sale':
        result = await handleRecordSale(supabase, entities, context);
        break;
      case 'get_sales_summary':
        result = await handleGetSalesSummary(supabase, entities, context);
        break;
      case 'get_sales_details':
        result = await handleGetSalesDetails(supabase, entities, context);
        break;
      case 'check_customer':
        result = await handleCheckCustomer(supabase, entities, context);
        break;
      case 'record_expense':
        result = await handleRecordExpense(supabase, entities, context);
        break;
      case 'generate_invoice':
        result = await handleGenerateInvoice(supabase, entities, context);
        break;
      // Employee task intents
      case 'my_tasks':
        result = await handleMyTasks(supabase, entities, context);
        break;
      case 'task_details':
        result = await handleTaskDetails(supabase, entities, context);
        break;
      case 'my_schedule':
        result = await handleMySchedule(supabase, entities, context);
        break;
      // Attendance intents
      case 'clock_in':
        result = await handleClockIn(supabase, entities, context);
        break;
      case 'clock_out':
        result = await handleClockOut(supabase, entities, context);
        break;
      case 'my_attendance':
        result = await handleMyAttendance(supabase, entities, context);
        break;
      // Payroll intent
      case 'my_pay':
        result = await handleMyPay(supabase, entities, context);
        break;
      // Management intents
      case 'team_attendance':
        result = await handleTeamAttendance(supabase, entities, context);
        break;
      case 'pending_orders':
        result = await handlePendingOrders(supabase, entities, context);
        break;
      case 'low_stock_alerts':
        result = await handleLowStockAlerts(supabase, entities, context);
        break;
      case 'update_order_status':
        result = await handleUpdateOrderStatus(supabase, entities, context);
        break;
      default:
        result = { success: false, message: `Unknown intent: ${intent}` };
    }

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...result,
        execution_time_ms: executionTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BMS API Bridge error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCheckStock(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { product } = entities;
  
  let query = supabase
    .from('inventory')
    .select('id, name, sku, current_stock, reorder_level, unit_price, status')
    .eq('tenant_id', context.tenant_id);

  if (product) {
    // Sanitize and escape user input for ILIKE query
    const sanitizedProduct = sanitizeUserInput(product, 100);
    const escapedPattern = `%${escapeSqlLikePattern(sanitizedProduct)}%`;
    query = query.ilike('name', escapedPattern);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('Stock check error:', error);
    return { success: false, message: 'Failed to check stock.' };
  }

  if (!data || data.length === 0) {
    return { 
      success: true, 
      message: product 
        ? `No products found matching "${sanitizeUserInput(product, 50)}".`
        : 'No products in inventory.',
      data: [] 
    };
  }

  const stockList = data.map((item: any) => {
    const status = item.current_stock <= 0 ? '🔴' : 
                   item.current_stock < item.reorder_level ? '🟡' : '🟢';
    return `${status} ${item.name}: ${item.current_stock} units (K${item.unit_price}/unit)`;
  }).join('\n');

  return {
    success: true,
    message: `📦 Stock Levels:\n${stockList}`,
    data,
  };
}

async function handleListProducts(supabase: any, context: ExecutionContext) {
  const { data, error } = await supabase
    .from('inventory')
    .select('id, name, unit_price, current_stock')
    .eq('tenant_id', context.tenant_id)
    .gt('current_stock', 0)
    .order('name')
    .limit(15);

  if (error) {
    console.error('List products error:', error);
    return { success: false, message: 'Failed to list products.' };
  }

  if (!data || data.length === 0) {
    return { success: true, message: 'No products available.', data: [] };
  }

  const productList = data.map((item: any) => 
    `• ${item.name} - K${item.unit_price} (${item.current_stock} in stock)`
  ).join('\n');

  return {
    success: true,
    message: `📋 Available Products:\n${productList}`,
    data,
  };
}

async function handleRecordSale(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { product, customer_name, customer_phone, customer_email } = entities;
  const quantity = Number.isFinite(Number(entities.quantity)) ? Number(entities.quantity) : 1;
  const amount = Number(entities.amount);
  const payment_method = normalizePaymentMethod(entities.payment_method);

  // Validate context
  if (!context.tenant_id) {
    console.error('Missing tenant_id in context:', context);
    return { success: false, message: 'Session error: tenant not identified. Please try again.' };
  }

  console.log('[record_sale] Starting with context:', { 
    tenant_id: context.tenant_id, 
    user_id: context.user_id,
    product, 
    amount, 
    customer_name, 
    payment_method 
  });

  if (!product || !Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      message:
        'Please specify the product and amount. Example: "Sold 5 cement bags to John for K2500 cash"',
    };
  }

  const { raw: productRaw, pattern: productPattern } = normalizeProductQuery(product);

  // Try to match an inventory item (optional: allow service sales even if not in inventory)
  const { data: products, error: productError } = await supabase
    .from('inventory')
    .select('id, name, unit_price, current_stock, liters_per_unit')
    .eq('tenant_id', context.tenant_id)
    .ilike('name', productPattern)
    .limit(1);

  if (productError) {
    console.error('Product lookup error:', productError);
    return { success: false, message: 'Failed to look up product. Please try again.' };
  }

  const productItem = products?.[0] ?? null;

  if (productItem) {
    if (productItem.current_stock < quantity) {
      return {
        success: false,
        message: `Insufficient stock for ${productItem.name}. Available: ${productItem.current_stock} units.`,
      };
    }
  }

  // Generate SEQUENTIAL sale number (SYYYY-XXXX)
  let saleNumber = await generateSequentialSaleNumber(supabase, context.tenant_id);

  // Generate SEQUENTIAL receipt number matching BMS format (RYYYY-XXXX)
  // We'll generate this inside the retry loop to handle collisions
  let receiptNumber = '';
  console.log('[record_sale] Starting sale recording...');

  // Create sale in sales table (retry on sale_number collisions)
  let sale: any = null;
  let saleError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('sales')
      .insert({
        tenant_id: context.tenant_id,
        sale_number: saleNumber,
        customer_name: customer_name || 'Walk-in Customer',
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        payment_method,
        subtotal: amount,
        tax_amount: 0,
        total_amount: amount,
        recorded_by: context.user_id,
      })
      .select()
      .single();

    if (error?.code === '23505') {
      console.log(`[record_sale] Sale number collision detected (${saleNumber}), retrying... (attempt ${attempt + 1})`);
      saleNumber = await generateSequentialSaleNumber(supabase, context.tenant_id, attempt + 1);
      saleError = error;
      continue;
    }

    sale = data;
    saleError = error;
    break;
  }

  if (saleError || !sale) {
    console.error('Sale creation error:', saleError);
    console.error('Sale error details:', JSON.stringify(saleError, null, 2));
    const errorMsg = saleError?.message || 'Unknown error';
    const errorCode = saleError?.code || 'N/A';
    return { 
      success: false, 
      message: `Failed to record sale: ${errorMsg} (Code: ${errorCode}). Please contact support if this persists.` 
    };
  }

  console.log('[record_sale] Sale created:', sale.sale_number);

  const resolvedItemName = productItem?.name ?? productRaw;
  const resolvedUnitPrice = productItem?.unit_price ?? amount / Math.max(1, quantity);
  const litersImpact = Math.floor(amount / 20); // Default impact calculation

  // Create sale item
  const { error: saleItemError } = await supabase.from('sale_items').insert({
    tenant_id: context.tenant_id,
    sale_id: sale.id,
    inventory_id: productItem?.id ?? null,
    item_name: resolvedItemName,
    quantity,
    unit_price: resolvedUnitPrice,
    total_price: amount,
  });

  if (saleItemError) {
    console.error('Sale item creation error:', saleItemError);
    // Continue - main sale record exists
  }

  // Generate receipt number with collision handling
  for (let attempt = 0; attempt < 3; attempt++) {
    receiptNumber = await generateSequentialReceiptNumber(supabase, context.tenant_id, attempt);
    console.log(`[record_sale] Trying receipt number: ${receiptNumber} (attempt ${attempt + 1})`);
    
    // Try to create payment receipt first (this is what determines the unique receipt number)
    const { error: receiptError } = await supabase.from('payment_receipts').insert({
      tenant_id: context.tenant_id,
      receipt_number: receiptNumber,
      client_name: customer_name || 'Walk-in Customer',
      client_email: customer_email || null,
      amount_paid: amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method,
      created_by: context.user_id,
      notes: `WhatsApp sale: ${saleNumber}`,
    });

    if (receiptError?.code === '23505') {
      console.log(`[record_sale] Receipt number collision (${receiptNumber}), retrying...`);
      continue;
    }

    if (receiptError) {
      console.error('Payment receipt creation error:', receiptError);
      return { 
        success: false, 
        message: `Sale recorded (${saleNumber}) but receipt creation failed: ${receiptError.message}. Please try again.` 
      };
    }

    // Receipt created successfully
    console.log('[record_sale] Payment receipt created:', receiptNumber);
    break;
  }

  if (!receiptNumber) {
    return { 
      success: false, 
      message: `Sale recorded (${saleNumber}) but could not generate unique receipt number. Please try again.` 
    };
  }

  // CRITICAL: Create sales_transactions for BMS visibility and real-time accounting updates
  const { error: txError } = await supabase.from('sales_transactions').insert({
    tenant_id: context.tenant_id,
    transaction_type: 'sale',
    customer_name: customer_name || 'Walk-in Customer',
    customer_phone: customer_phone || null,
    customer_email: customer_email || null,
    product_id: productItem?.id ?? null,
    product_name: resolvedItemName,
    quantity,
    unit_price_zmw: resolvedUnitPrice,
    total_amount_zmw: amount,
    liters_impact: litersImpact,
    payment_method,
    receipt_number: receiptNumber,
    recorded_by: context.user_id,
    item_type: productItem ? 'product' : 'service',
    notes: 'Recorded via WhatsApp',
  });

  if (txError) {
    console.error('Sales transaction creation error:', txError);
    // Non-critical - sale and receipt already exist
  }

  console.log('[record_sale] Sales transaction created with receipt:', receiptNumber);

  // Update inventory (only if linked to inventory)
  if (productItem) {
    const { error: invError } = await supabase
      .from('inventory')
      .update({ current_stock: productItem.current_stock - quantity })
      .eq('id', productItem.id);

    if (invError) {
      console.error('Inventory update error:', invError);
    }
  }

  // Format date for receipt
  const receiptDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  // Fetch business profile for dynamic branding
  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('company_name, slogan, tagline')
    .eq('tenant_id', context.tenant_id)
    .maybeSingle();

  // Prefer business profile company name; fallback to tenant name; then generic
  let companyName = (businessProfile?.company_name ?? '').trim();
  if (!companyName) {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', context.tenant_id)
      .maybeSingle();
    companyName = (tenantRow?.name ?? '').trim() || 'Your Business';
  }

  const companyTagline = (businessProfile?.slogan ?? businessProfile?.tagline ?? '').trim();
  
  // Create concise receipt message (PDF has full details)
  const receiptMessage = `✅ *Sale Recorded!*

*${companyName}*${companyTagline ? `\n${companyTagline}` : ''}

💰 *K ${amount.toLocaleString()}* paid by ${payment_method}

📋 ${receiptNumber}
👤 ${customer_name || 'Walk-in Customer'}
📦 ${quantity}x ${resolvedItemName}
📅 ${receiptDate}

📄 Receipt PDF attached above.`;

  return {
    success: true,
    message: receiptMessage,
    data: { 
      sale_number: saleNumber, 
      sale_id: sale.id,
      receipt_number: receiptNumber,
      tenant_id: context.tenant_id,
    },
  };
}

async function handleGetSalesSummary(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { period = 'today' } = entities;
  
  let startDate: Date;
  const endDate = new Date();
  
  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'this_week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
  }

  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, payment_method')
    .eq('tenant_id', context.tenant_id)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString());

  if (error) {
    console.error('Sales summary error:', error);
    return { success: false, message: 'Failed to get sales summary.' };
  }

  const totalSales = data?.length || 0;
  const totalRevenue = data?.reduce((sum: number, sale: any) => sum + sale.total_amount, 0) || 0;
  const cashSales =
    data?.filter((s: any) => s.payment_method === 'Cash').reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
  const mobileSales =
    data?.filter((s: any) => s.payment_method === 'Mobile Money').reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
  const cardSales =
    data?.filter((s: any) => s.payment_method === 'Card').reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;

  const periodLabel = period.replace('_', ' ');

  return {
    success: true,
    message: `📊 Sales Summary (${periodLabel}):\n\n📈 Total Sales: ${totalSales}\n💰 Revenue: K${totalRevenue.toLocaleString()}\n💵 Cash: K${cashSales.toLocaleString()}\n📱 Mobile Money: K${mobileSales.toLocaleString()}\n💳 Card: K${cardSales.toLocaleString()}`,
    data: { total_sales: totalSales, total_revenue: totalRevenue },
  };
}

async function handleGetSalesDetails(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { period = 'today' } = entities;
  
  let startDate: Date;
  const endDate = new Date();
  
  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'this_week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
  }

  // Get individual sales with customer details
  const { data: sales, error } = await supabase
    .from('sales')
    .select('sale_number, customer_name, total_amount, payment_method, sale_date')
    .eq('tenant_id', context.tenant_id)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .order('sale_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Sales details error:', error);
    return { success: false, message: 'Failed to get sales details.' };
  }

  if (!sales || sales.length === 0) {
    const periodLabel = period.replace('_', ' ');
    return { 
      success: true, 
      message: `📊 No sales found for ${periodLabel}.`,
      data: [] 
    };
  }

  const periodLabel = period.replace('_', ' ');
  const totalRevenue = sales.reduce((sum: number, sale: any) => sum + sale.total_amount, 0);
  
  // Format each sale with customer details
  const salesList = sales.map((sale: any, index: number) => {
    const saleDate = new Date(sale.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${index + 1}. ${sale.sale_number}\n   👤 ${sale.customer_name}\n   💰 K${sale.total_amount.toLocaleString()} (${sale.payment_method})\n   📅 ${saleDate}`;
  }).join('\n\n');

  return {
    success: true,
    message: `📊 Sales Breakdown (${periodLabel}):\n\n${salesList}\n\n━━━━━━━━━━━━━━━━\n💵 Total: K${totalRevenue.toLocaleString()} | ${sales.length} sales`,
    data: sales,
  };
}

async function handleCheckCustomer(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { customer_name } = entities;

  if (!customer_name) {
    return { success: false, message: 'Please specify a customer name to search.' };
  }

  // Sanitize and escape user input for ILIKE query
  const sanitizedName = sanitizeUserInput(customer_name, 100);
  const escapedPattern = `%${escapeSqlLikePattern(sanitizedName)}%`;

  // Search in sales for customer history
  const { data, error } = await supabase
    .from('sales')
    .select('customer_name, total_amount, sale_date')
    .eq('tenant_id', context.tenant_id)
    .ilike('customer_name', escapedPattern)
    .order('sale_date', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Customer check error:', error);
    return { success: false, message: 'Failed to check customer.' };
  }

  if (!data || data.length === 0) {
    return { success: true, message: `No records found for customer "${sanitizedName}".`, data: [] };
  }

  const totalSpent = data.reduce((sum: number, sale: any) => sum + sale.total_amount, 0);
  const recentPurchases = data.slice(0, 3).map((sale: any) => 
    `• K${sale.total_amount.toLocaleString()} on ${new Date(sale.sale_date).toLocaleDateString()}`
  ).join('\n');

  return {
    success: true,
    message: `👤 Customer: ${data[0].customer_name}\n💰 Total Spent: K${totalSpent.toLocaleString()}\n📝 Recent Purchases:\n${recentPurchases}`,
    data,
  };
}

// Valid expense categories that match the database CHECK constraint
const VALID_EXPENSE_CATEGORIES = [
  'Cost of Goods Sold - Vestergaard',
  'Salaries',
  'Salaries & Wages',
  'Marketing',
  'Operations/Rent',
  'Other'
];

// Map common expense keywords to valid categories
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'transport': 'Operations/Rent',
  'fuel': 'Operations/Rent',
  'rent': 'Operations/Rent',
  'office': 'Operations/Rent',
  'utilities': 'Operations/Rent',
  'electricity': 'Operations/Rent',
  'water': 'Operations/Rent',
  'internet': 'Operations/Rent',
  'supplies': 'Operations/Rent',
  'maintenance': 'Operations/Rent',
  'repair': 'Operations/Rent',
  'salary': 'Salaries & Wages',
  'wages': 'Salaries & Wages',
  'staff': 'Salaries & Wages',
  'payroll': 'Salaries & Wages',
  'marketing': 'Marketing',
  'advertising': 'Marketing',
  'ads': 'Marketing',
  'promo': 'Marketing',
  'promotion': 'Marketing',
  'stock': 'Cost of Goods Sold - Vestergaard',
  'inventory': 'Cost of Goods Sold - Vestergaard',
  'goods': 'Cost of Goods Sold - Vestergaard',
  'purchase': 'Cost of Goods Sold - Vestergaard',
  'cogs': 'Cost of Goods Sold - Vestergaard',
};

function normalizeExpenseCategory(inputCategory: string | undefined, description: string): string {
  // If a valid category is provided, use it
  if (inputCategory && VALID_EXPENSE_CATEGORIES.includes(inputCategory)) {
    return inputCategory;
  }

  // Try to infer category from the input category name
  if (inputCategory) {
    const lowerInput = inputCategory.toLowerCase();
    for (const [keyword, category] of Object.entries(EXPENSE_CATEGORY_MAP)) {
      if (lowerInput.includes(keyword)) {
        return category;
      }
    }
  }

  // Try to infer category from description
  const lowerDesc = description.toLowerCase();
  for (const [keyword, category] of Object.entries(EXPENSE_CATEGORY_MAP)) {
    if (lowerDesc.includes(keyword)) {
      return category;
    }
  }

  // Default to 'Other' which is a valid category
  return 'Other';
}

async function handleRecordExpense(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { description, amount, category: rawCategory } = entities;

  if (!description || !amount) {
    return { 
      success: false, 
      message: 'Please specify the expense description and amount. Example: "Paid K500 for transport"' 
    };
  }

  // Normalize to a valid category
  const category = normalizeExpenseCategory(rawCategory, description);

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      tenant_id: context.tenant_id,
      vendor_name: description,
      amount_zmw: amount,
      category,
      recorded_by: context.user_id,
      date_incurred: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Expense recording error:', error);
    return { success: false, message: 'Failed to record expense. Please try again.' };
  }

  return {
    success: true,
    message: `✅ Expense recorded!\n📝 ${description}\n💰 K${amount.toLocaleString()}\n📁 Category: ${category}`,
    data: { expense_id: data.id },
  };
}

async function handleGenerateInvoice(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { customer_name, items } = entities;

  if (!customer_name) {
    return { 
      success: false, 
      message: 'Please specify the customer name for the invoice.' 
    };
  }

  // For now, return a message that invoice generation requires the dashboard
  return {
    success: true,
    message: `📋 To generate an invoice for ${customer_name}, please use the BMS dashboard.\n\nGo to: Dashboard → Accounts → Invoices → New Invoice`,
    data: null,
  };
}

// ========== EMPLOYEE TASK HANDLERS ==========

async function handleMyTasks(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  // Get the employee ID linked to this user (via whatsapp_user_mappings or employees table)
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  // Query custom orders assigned to this user or employee
  let query = supabase
    .from('custom_orders')
    .select('order_number, customer_name, design_type, status, due_date, created_at')
    .eq('tenant_id', context.tenant_id)
    .not('status', 'in', '("delivered","cancelled")')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(10);

  // Filter by assigned_to (user_id) or assigned_tailor_id (employee_id)
  if (employee?.id) {
    query = query.or(`assigned_to.eq.${context.user_id},assigned_tailor_id.eq.${employee.id}`);
  } else {
    query = query.eq('assigned_to', context.user_id);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error('My tasks error:', error);
    return { success: false, message: 'Failed to fetch your tasks.' };
  }

  if (!orders || orders.length === 0) {
    return { 
      success: true, 
      message: '📋 No pending tasks assigned to you.\n\nYou\'re all caught up! 🎉',
      data: [] 
    };
  }

  const taskList = orders.map((order: any, idx: number) => {
    const dueDate = order.due_date 
      ? new Date(order.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : 'No date';
    const statusEmoji = getStatusEmoji(order.status);
    return `${idx + 1}. ${order.order_number}\n   ${statusEmoji} ${order.status}\n   👤 ${order.customer_name || 'N/A'}\n   📅 ${dueDate}`;
  }).join('\n\n');

  return {
    success: true,
    message: `📋 Your Tasks (${orders.length}):\n\n${taskList}\n\n💡 Reply "details CO-XXX" for measurements`,
    data: orders,
  };
}

async function handleTaskDetails(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  let { order_number } = entities;
  
  if (!order_number) {
    return { success: false, message: 'Please specify the order number. Example: "details CO-001"' };
  }

  // Normalize order number format
  order_number = String(order_number).toUpperCase();
  if (!order_number.startsWith('CO-')) {
    order_number = `CO-${order_number.replace(/\D/g, '').padStart(3, '0')}`;
  }

  const { data: order, error } = await supabase
    .from('custom_orders')
    .select('*')
    .eq('tenant_id', context.tenant_id)
    .eq('order_number', order_number)
    .maybeSingle();

  if (error || !order) {
    return { success: false, message: `Order ${order_number} not found.` };
  }

  // Format measurements if available
  let measurementsText = '';
  if (order.measurements) {
    const m = order.measurements;
    const measurementLines: string[] = [];
    if (m.chest) measurementLines.push(`Chest: ${m.chest}cm`);
    if (m.waist) measurementLines.push(`Waist: ${m.waist}cm`);
    if (m.hips) measurementLines.push(`Hips: ${m.hips}cm`);
    if (m.shoulder) measurementLines.push(`Shoulder: ${m.shoulder}cm`);
    if (m.sleeve) measurementLines.push(`Sleeve: ${m.sleeve}cm`);
    if (m.length || m.dress_length) measurementLines.push(`Length: ${m.length || m.dress_length}cm`);
    if (m.inseam) measurementLines.push(`Inseam: ${m.inseam}cm`);
    if (m.neck) measurementLines.push(`Neck: ${m.neck}cm`);
    measurementsText = measurementLines.length > 0 
      ? `\n\n📏 MEASUREMENTS:\n${measurementLines.join('\n')}` 
      : '';
  }

  const dueDate = order.due_date 
    ? new Date(order.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not set';
  
  const fittingDate = order.fitting_date
    ? new Date(order.fitting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : 'Not set';

  return {
    success: true,
    message: `📋 ${order.order_number}\n\n👤 Customer: ${order.customer_name || 'N/A'}\n👗 Design: ${order.design_type || 'Custom'}\n🎨 Fabric: ${order.fabric_type || 'N/A'}\n🌈 Color: ${order.color_preference || 'N/A'}\n\n📊 Status: ${order.status}\n📅 Due: ${dueDate}\n🪡 Fitting: ${fittingDate}${measurementsText}\n\n📝 Notes: ${order.style_notes || 'None'}`,
    data: order,
  };
}

async function handleMySchedule(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get employee ID
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  let query = supabase
    .from('custom_orders')
    .select('order_number, customer_name, fitting_date, collection_date, status')
    .eq('tenant_id', context.tenant_id)
    .or(`fitting_date.gte.${today.toISOString()},collection_date.gte.${today.toISOString()}`)
    .order('fitting_date', { ascending: true })
    .limit(10);

  if (employee?.id) {
    query = query.or(`assigned_to.eq.${context.user_id},assigned_tailor_id.eq.${employee.id}`);
  } else {
    query = query.eq('assigned_to', context.user_id);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error('My schedule error:', error);
    return { success: false, message: 'Failed to fetch your schedule.' };
  }

  if (!orders || orders.length === 0) {
    return { 
      success: true, 
      message: '📅 No upcoming fittings or collections scheduled.',
      data: [] 
    };
  }

  const scheduleList = orders.map((order: any) => {
    const lines: string[] = [`📌 ${order.order_number} - ${order.customer_name || 'N/A'}`];
    if (order.fitting_date) {
      const fd = new Date(order.fitting_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
      lines.push(`   🪡 Fitting: ${fd}`);
    }
    if (order.collection_date) {
      const cd = new Date(order.collection_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
      lines.push(`   📦 Collection: ${cd}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  return {
    success: true,
    message: `📅 Upcoming Schedule:\n\n${scheduleList}`,
    data: orders,
  };
}

// ========== ATTENDANCE HANDLERS ==========

async function handleClockIn(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  // Find employee by user_id
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  if (empError || !employee) {
    return { 
      success: false, 
      message: '❌ You\'re not registered as an employee. Contact HR.' 
    };
  }

  // Check if already clocked in today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingAttendance } = await supabase
    .from('employee_attendance')
    .select('id, clock_in')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .is('clock_out', null)
    .maybeSingle();

  if (existingAttendance) {
    const clockInTime = new Date(existingAttendance.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return { 
      success: false, 
      message: `⚠️ Already clocked in at ${clockInTime}.\n\nSay "clock out" when leaving.` 
    };
  }

  // Create attendance record
  const now = new Date();
  const { error: insertError } = await supabase
    .from('employee_attendance')
    .insert({
      employee_id: employee.id,
      date: today,
      clock_in: now.toISOString(),
      status: 'present',
    });

  if (insertError) {
    console.error('Clock in error:', insertError);
    return { success: false, message: 'Failed to clock in. Try again.' };
  }

  const clockInTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return {
    success: true,
    message: `✅ Clocked in at ${clockInTime}\n\n👋 Good morning, ${employee.full_name?.split(' ')[0] || context.display_name}!\n\nHave a productive day! 💪`,
    data: { clock_in: now.toISOString() },
  };
}

async function handleClockOut(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  // Find employee by user_id
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  if (empError || !employee) {
    return { 
      success: false, 
      message: '❌ You\'re not registered as an employee. Contact HR.' 
    };
  }

  // Find today's open attendance record
  const today = new Date().toISOString().split('T')[0];
  const { data: attendance, error: attError } = await supabase
    .from('employee_attendance')
    .select('id, clock_in')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .is('clock_out', null)
    .maybeSingle();

  if (attError || !attendance) {
    return { 
      success: false, 
      message: '⚠️ No clock-in found for today.\n\nSay "clock in" first.' 
    };
  }

  // Calculate work hours
  const now = new Date();
  const clockIn = new Date(attendance.clock_in);
  const workHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

  // Update attendance record
  const { error: updateError } = await supabase
    .from('employee_attendance')
    .update({
      clock_out: now.toISOString(),
      work_hours: Math.round(workHours * 100) / 100,
    })
    .eq('id', attendance.id);

  if (updateError) {
    console.error('Clock out error:', updateError);
    return { success: false, message: 'Failed to clock out. Try again.' };
  }

  const clockOutTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const hoursFormatted = workHours.toFixed(1);

  return {
    success: true,
    message: `✅ Clocked out at ${clockOutTime}\n\n⏱️ You worked ${hoursFormatted} hours today.\n\nSee you tomorrow! 👋`,
    data: { clock_out: now.toISOString(), work_hours: workHours },
  };
}

async function handleMyAttendance(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  // Find employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  if (!employee) {
    return { 
      success: false, 
      message: '❌ You\'re not registered as an employee.' 
    };
  }

  // Get last 7 days of attendance
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: records, error } = await supabase
    .from('employee_attendance')
    .select('date, clock_in, clock_out, work_hours, status')
    .eq('employee_id', employee.id)
    .gte('date', weekAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    console.error('My attendance error:', error);
    return { success: false, message: 'Failed to fetch attendance.' };
  }

  if (!records || records.length === 0) {
    return { 
      success: true, 
      message: '📊 No attendance records for the past week.',
      data: [] 
    };
  }

  const totalHours = records.reduce((sum: number, r: any) => sum + (r.work_hours || 0), 0);
  const daysWorked = records.filter((r: any) => r.status === 'present').length;

  const recordsList = records.slice(0, 5).map((r: any) => {
    const date = new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    const hours = r.work_hours ? `${r.work_hours.toFixed(1)}h` : 'In progress';
    return `• ${date}: ${hours}`;
  }).join('\n');

  return {
    success: true,
    message: `📊 Your Attendance (Last 7 Days)\n\n${recordsList}\n\n━━━━━━━━━━━━━━━━\n📅 Days: ${daysWorked}\n⏱️ Total: ${totalHours.toFixed(1)} hours`,
    data: records,
  };
}

// ========== PAYROLL HANDLER ==========

async function handleMyPay(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  // Find employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, base_salary')
    .eq('tenant_id', context.tenant_id)
    .eq('user_id', context.user_id)
    .maybeSingle();

  if (!employee) {
    return { 
      success: false, 
      message: '❌ You\'re not registered as an employee.' 
    };
  }

  // Get latest payroll record
  const { data: payroll, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employee.id)
    .order('pay_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('My pay error:', error);
    return { success: false, message: 'Failed to fetch pay information.' };
  }

  if (!payroll) {
    // Return base salary info if no payroll record
    if (employee.base_salary) {
      return {
        success: true,
        message: `💰 Pay Information\n\n📋 Base Salary: K${employee.base_salary.toLocaleString()}/month\n\n⚠️ No payroll records yet.\nContact HR for details.`,
        data: null,
      };
    }
    return { 
      success: true, 
      message: '📊 No payroll records found.\n\nContact HR for pay details.',
      data: null 
    };
  }

  const periodEnd = new Date(payroll.pay_period_end).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const statusEmoji = payroll.status === 'paid' ? '✅' : payroll.status === 'approved' ? '🟡' : '⏳';

  return {
    success: true,
    message: `💰 Payslip - ${periodEnd}\n\n💵 Gross: K${(payroll.gross_salary || 0).toLocaleString()}\n➖ Deductions: K${(payroll.total_deductions || 0).toLocaleString()}\n━━━━━━━━━━━━━━━━\n💰 Net Pay: K${(payroll.net_salary || 0).toLocaleString()}\n\n${statusEmoji} Status: ${payroll.status}\n${payroll.payment_date ? `📅 Paid: ${new Date(payroll.payment_date).toLocaleDateString('en-GB')}` : ''}`,
    data: payroll,
  };
}

// ========== MANAGEMENT HANDLERS ==========

async function handleTeamAttendance(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const today = new Date().toISOString().split('T')[0];

  // Get today's attendance with employee names
  const { data: attendance, error } = await supabase
    .from('employee_attendance')
    .select('clock_in, clock_out, employees(full_name)')
    .eq('date', today)
    .order('clock_in', { ascending: true });

  if (error) {
    console.error('Team attendance error:', error);
    return { success: false, message: 'Failed to fetch team attendance.' };
  }

  // Also get total employee count
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', context.tenant_id)
    .eq('employment_status', 'active');

  const clockedIn = attendance?.filter((a: any) => !a.clock_out) || [];
  const clockedOut = attendance?.filter((a: any) => a.clock_out) || [];

  let message = `👥 Team Attendance - Today\n\n`;
  message += `✅ Clocked In: ${clockedIn.length}/${totalEmployees || '?'}\n`;

  if (clockedIn.length > 0) {
    message += `\n🟢 Currently Working:\n`;
    message += clockedIn.map((a: any) => {
      const time = new Date(a.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `• ${a.employees?.full_name || 'Unknown'} (${time})`;
    }).join('\n');
  }

  if (clockedOut.length > 0) {
    message += `\n\n🔴 Left for the day:\n`;
    message += clockedOut.slice(0, 5).map((a: any) => {
      return `• ${a.employees?.full_name || 'Unknown'}`;
    }).join('\n');
    if (clockedOut.length > 5) {
      message += `\n  ...and ${clockedOut.length - 5} more`;
    }
  }

  return {
    success: true,
    message,
    data: { clocked_in: clockedIn.length, total: totalEmployees },
  };
}

async function handlePendingOrders(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { data: orders, error } = await supabase
    .from('custom_orders')
    .select('order_number, customer_name, status, due_date, assigned_to')
    .eq('tenant_id', context.tenant_id)
    .not('status', 'in', '("delivered","cancelled")')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(15);

  if (error) {
    console.error('Pending orders error:', error);
    return { success: false, message: 'Failed to fetch pending orders.' };
  }

  if (!orders || orders.length === 0) {
    return { 
      success: true, 
      message: '📋 No pending orders in production.\n\n🎉 All caught up!',
      data: [] 
    };
  }

  // Group by status
  const byStatus: Record<string, any[]> = {};
  orders.forEach((o: any) => {
    const status = o.status || 'pending';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(o);
  });

  let message = `📋 Production Queue (${orders.length} orders)\n\n`;
  
  for (const [status, statusOrders] of Object.entries(byStatus)) {
    const emoji = getStatusEmoji(status);
    message += `${emoji} ${status.toUpperCase()} (${statusOrders.length}):\n`;
    message += statusOrders.slice(0, 3).map((o: any) => {
      const due = o.due_date 
        ? new Date(o.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : 'No date';
      return `  • ${o.order_number} - ${o.customer_name || 'N/A'} (${due})`;
    }).join('\n');
    if (statusOrders.length > 3) {
      message += `\n  ...+${statusOrders.length - 3} more`;
    }
    message += '\n\n';
  }

  return {
    success: true,
    message: message.trim(),
    data: orders,
  };
}

async function handleLowStockAlerts(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { data: items, error } = await supabase
    .from('inventory')
    .select('name, current_stock, reorder_level, unit_price')
    .eq('tenant_id', context.tenant_id)
    .lt('current_stock', supabase.raw('reorder_level'))
    .order('current_stock', { ascending: true })
    .limit(15);

  if (error) {
    // Fallback: manual comparison since raw() might not work
    const { data: allItems, error: allError } = await supabase
      .from('inventory')
      .select('name, current_stock, reorder_level, unit_price')
      .eq('tenant_id', context.tenant_id);

    if (allError) {
      console.error('Low stock error:', allError);
      return { success: false, message: 'Failed to check stock levels.' };
    }

    const lowStock = (allItems || [])
      .filter((i: any) => i.current_stock < i.reorder_level)
      .sort((a: any, b: any) => a.current_stock - b.current_stock)
      .slice(0, 15);

    if (lowStock.length === 0) {
      return { 
        success: true, 
        message: '✅ All stock levels are healthy!\n\nNo items below reorder level.',
        data: [] 
      };
    }

    const alertsList = lowStock.map((item: any) => {
      const emoji = item.current_stock <= 0 ? '🔴' : '🟡';
      return `${emoji} ${item.name}\n   Stock: ${item.current_stock} / Reorder at: ${item.reorder_level}`;
    }).join('\n\n');

    return {
      success: true,
      message: `⚠️ Low Stock Alert (${lowStock.length} items)\n\n${alertsList}`,
      data: lowStock,
    };
  }

  if (!items || items.length === 0) {
    return { 
      success: true, 
      message: '✅ All stock levels are healthy!\n\nNo items below reorder level.',
      data: [] 
    };
  }

  const alertsList = items.map((item: any) => {
    const emoji = item.current_stock <= 0 ? '🔴' : '🟡';
    return `${emoji} ${item.name}\n   Stock: ${item.current_stock} / Reorder at: ${item.reorder_level}`;
  }).join('\n\n');

  return {
    success: true,
    message: `⚠️ Low Stock Alert (${items.length} items)\n\n${alertsList}`,
    data: items,
  };
}

async function handleUpdateOrderStatus(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  let { order_number, new_status, completed_stage } = entities;

  if (!order_number) {
    return { success: false, message: 'Please specify the order number. Example: "CO-001 cutting done"' };
  }

  // Normalize order number
  order_number = String(order_number).toUpperCase();
  if (!order_number.startsWith('CO-')) {
    order_number = `CO-${order_number.replace(/\D/g, '').padStart(3, '0')}`;
  }

  // Get current order
  const { data: order, error: fetchError } = await supabase
    .from('custom_orders')
    .select('id, status, order_number')
    .eq('tenant_id', context.tenant_id)
    .eq('order_number', order_number)
    .maybeSingle();

  if (fetchError || !order) {
    return { success: false, message: `Order ${order_number} not found.` };
  }

  // Map completed stage to new status if not explicitly provided
  if (!new_status && completed_stage) {
    const statusMap: Record<string, string> = {
      'cutting': 'se wiring',
      'sewing': 'fitting',
      'se wiring': 'fitting',
      'fitting': 'ready',
      'ready': 'delivered',
    };
    new_status = statusMap[completed_stage.toLowerCase()] || completed_stage;
  }

  if (!new_status) {
    return { success: false, message: 'Please specify the new status. Example: "CO-001 sewing done"' };
  }

  // Normalize status
  new_status = String(new_status).toLowerCase();
  const validStatuses = ['pending', 'confirmed', 'cutting', 'se wiring', 'fitting', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(new_status)) {
    // Try to match partial
    const matched = validStatuses.find(s => s.includes(new_status) || new_status.includes(s));
    if (matched) {
      new_status = matched;
    } else {
      return { 
        success: false, 
        message: `Invalid status "${new_status}".\n\nValid: ${validStatuses.join(', ')}` 
      };
    }
  }

  // Update the order
  const { error: updateError } = await supabase
    .from('custom_orders')
    .update({ 
      status: new_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('Update order status error:', updateError);
    return { success: false, message: 'Failed to update order status.' };
  }

  const statusEmoji = getStatusEmoji(new_status);

  return {
    success: true,
    message: `✅ ${order_number} updated!\n\n${statusEmoji} New status: ${new_status}\n\n💡 Reply "pending orders" to see the queue.`,
    data: { order_number, new_status },
  };
}

// ========== HELPER FUNCTIONS ==========

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    'pending': '⏳',
    'confirmed': '✅',
    'cutting': '✂️',
    'se wiring': '🧵',
    'sewing': '🧵',
    'fitting': '👔',
    'ready': '🎁',
    'delivered': '📦',
    'cancelled': '❌',
    'draft': '📝',
  };
  return map[status?.toLowerCase()] || '📋';
}
