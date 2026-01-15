import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Role-based permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 'get_sales_summary', 'get_sales_details', 'check_customer'],
  manager: ['record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 'get_sales_summary', 'get_sales_details', 'check_customer'],
  staff: ['record_sale', 'check_stock', 'list_products', 'record_expense', 'get_sales_details'],
  viewer: ['check_stock', 'list_products', 'get_sales_summary', 'get_sales_details'],
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

function normalizeProductQuery(input: unknown): { raw: string; pattern: string } {
  const raw = sanitizeUserInput(input, 100);
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !['service', 'services', 'product', 'item', 'items'].includes(t));

  const patternCore = tokens.length
    ? tokens.map(escapeSqlLikePattern).join('%')
    : escapeSqlLikePattern(raw.toLowerCase().replace(/\s+/g, ' '));

  return { raw, pattern: `%${patternCore}%` };
}

/**
 * Generates a sequential receipt number in the format RYYYY-XXXX
 * This matches the BMS payment_receipts format exactly.
 */
async function generateSequentialReceiptNumber(supabase: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `R${year}`;
  
  // Get the latest receipt number for this tenant and year
  const { data: lastReceipt } = await supabase
    .from('payment_receipts')
    .select('receipt_number')
    .eq('tenant_id', tenantId)
    .like('receipt_number', `${prefix}-%`)
    .order('receipt_number', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (lastReceipt && lastReceipt[0]) {
    const match = lastReceipt[0].receipt_number.match(/R\d{4}-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

  // Generate sale number
  const yearPrefix = 'S' + new Date().getFullYear();
  const { data: lastSale } = await supabase
    .from('sales')
    .select('sale_number')
    .eq('tenant_id', context.tenant_id)
    .like('sale_number', `${yearPrefix}-%`)
    .order('sale_number', { ascending: false })
    .limit(1);

  const nextNum = lastSale && lastSale[0] ? parseInt(lastSale[0].sale_number.split('-')[1]) + 1 : 1;
  const saleNumber = `${yearPrefix}-${String(nextNum).padStart(4, '0')}`;

  // Generate SEQUENTIAL receipt number matching BMS format (RYYYY-XXXX)
  const receiptNumber = await generateSequentialReceiptNumber(supabase, context.tenant_id);
  console.log('[record_sale] Generated receipt number:', receiptNumber);

  // Create sale in sales table
  const { data: sale, error: saleError } = await supabase
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

  if (saleError) {
    console.error('Sale creation error:', saleError);
    return { success: false, message: 'Failed to record sale. Please try again.' };
  }

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

  // CRITICAL: Create sales_transactions for BMS visibility and real-time accounting updates
  // Use 'sale' transaction_type to match BMS UI expectations
  const { error: txError } = await supabase.from('sales_transactions').insert({
    tenant_id: context.tenant_id,
    transaction_type: 'sale', // Use 'sale' to match BMS UI
    customer_name: customer_name || 'Walk-in Customer',
    customer_phone: customer_phone || null,
    customer_email: customer_email || null,
    product_id: productItem?.id ?? null,
    product_name: resolvedItemName,
    quantity,
    unit_price_zmw: resolvedUnitPrice,
    total_amount_zmw: amount,
    liters_impact: litersImpact,
    payment_method, // Use canonical form: 'Cash', 'Mobile Money', 'Card'
    receipt_number: receiptNumber,
    recorded_by: context.user_id,
    item_type: productItem ? 'product' : 'service',
    notes: 'Recorded via WhatsApp',
  });

  if (txError) {
    console.error('Sales transaction creation error:', txError);
    // This is critical - return failure if accounting record fails
    return { 
      success: false, 
      message: `Sale recorded (${saleNumber}) but accounting update failed. Please record manually in dashboard or retry.` 
    };
  }

  console.log('[record_sale] Sales transaction created successfully with receipt:', receiptNumber);

  // CRITICAL: Create payment receipt for document generation and receipts manager
  const { error: receiptError } = await supabase.from('payment_receipts').insert({
    tenant_id: context.tenant_id,
    receipt_number: receiptNumber,
    client_name: customer_name || 'Walk-in Customer',
    client_email: customer_email || null,
    amount_paid: amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method, // Use canonical form
    created_by: context.user_id,
    notes: `WhatsApp sale: ${saleNumber}`,
  });

  if (receiptError) {
    console.error('Payment receipt creation error:', receiptError);
    // This is also critical for PDF generation
    return { 
      success: false, 
      message: `Sale recorded (${saleNumber}) but receipt creation failed. Please generate receipt manually.` 
    };
  }

  console.log('[record_sale] Payment receipt created successfully:', receiptNumber);

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
  
  // Create professional receipt message
  const receiptMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OMANUT BUSINESS CENTRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PAYMENT RECEIPT
Receipt #: ${receiptNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Amount Paid: K ${amount.toLocaleString()}

👤 Customer: ${customer_name || 'Walk-in Customer'}
📅 Date: ${receiptDate}
💳 Payment: ${payment_method}

📦 Items:
  • ${resolvedItemName} (${quantity}x) - K ${amount.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your business!

📄 Full receipt PDF will be attached below.`;

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

async function handleRecordExpense(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { description, amount, category = 'General' } = entities;

  if (!description || !amount) {
    return { 
      success: false, 
      message: 'Please specify the expense description and amount. Example: "Paid K500 for transport"' 
    };
  }

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
    return { success: false, message: 'Failed to record expense.' };
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
