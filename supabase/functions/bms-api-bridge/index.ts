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
  admin: ['record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 'get_sales_summary', 'check_customer'],
  manager: ['record_sale', 'check_stock', 'list_products', 'generate_invoice', 'record_expense', 'get_sales_summary', 'check_customer'],
  cashier: ['record_sale', 'check_stock', 'list_products', 'check_customer'],
  viewer: ['check_stock', 'list_products', 'get_sales_summary'],
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
    query = query.ilike('name', `%${product}%`);
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
        ? `No products found matching "${product}".`
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
  const { product, quantity = 1, customer_name, amount, payment_method = 'cash' } = entities;

  if (!product || !amount) {
    return { 
      success: false, 
      message: 'Please specify the product and amount. Example: "Sold 5 cement bags to John for K2500 cash"' 
    };
  }

  // Find the product
  const { data: products, error: productError } = await supabase
    .from('inventory')
    .select('id, name, unit_price, current_stock')
    .eq('tenant_id', context.tenant_id)
    .ilike('name', `%${product}%`)
    .limit(1);

  if (productError || !products || products.length === 0) {
    return { success: false, message: `Product "${product}" not found in inventory.` };
  }

  const productItem = products[0];

  if (productItem.current_stock < quantity) {
    return { 
      success: false, 
      message: `Insufficient stock for ${productItem.name}. Available: ${productItem.current_stock} units.` 
    };
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

  const nextNum = lastSale && lastSale[0] 
    ? parseInt(lastSale[0].sale_number.split('-')[1]) + 1 
    : 1;
  const saleNumber = `${yearPrefix}-${String(nextNum).padStart(4, '0')}`;

  // Create sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      tenant_id: context.tenant_id,
      sale_number: saleNumber,
      customer_name: customer_name || 'Walk-in Customer',
      payment_method: payment_method,
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

  // Create sale item
  await supabase.from('sale_items').insert({
    tenant_id: context.tenant_id,
    sale_id: sale.id,
    inventory_id: productItem.id,
    item_name: productItem.name,
    quantity,
    unit_price: productItem.unit_price,
    total_price: amount,
  });

  // Update inventory
  await supabase
    .from('inventory')
    .update({ current_stock: productItem.current_stock - quantity })
    .eq('id', productItem.id);

  return {
    success: true,
    message: `✅ Sale recorded!\n📝 ${saleNumber}\n📦 ${quantity}x ${productItem.name}\n👤 ${customer_name || 'Walk-in Customer'}\n💰 K${amount.toLocaleString()} (${payment_method})`,
    data: { sale_number: saleNumber, sale_id: sale.id },
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
  const cashSales = data?.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
  const mobileSales = data?.filter((s: any) => s.payment_method === 'mobile_money').reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;

  const periodLabel = period.replace('_', ' ');

  return {
    success: true,
    message: `📊 Sales Summary (${periodLabel}):\n\n📈 Total Sales: ${totalSales}\n💰 Revenue: K${totalRevenue.toLocaleString()}\n💵 Cash: K${cashSales.toLocaleString()}\n📱 Mobile: K${mobileSales.toLocaleString()}`,
    data: { total_sales: totalSales, total_revenue: totalRevenue },
  };
}

async function handleCheckCustomer(supabase: any, entities: Record<string, any>, context: ExecutionContext) {
  const { customer_name } = entities;

  if (!customer_name) {
    return { success: false, message: 'Please specify a customer name to search.' };
  }

  // Search in sales for customer history
  const { data, error } = await supabase
    .from('sales')
    .select('customer_name, total_amount, sale_date')
    .eq('tenant_id', context.tenant_id)
    .ilike('customer_name', `%${customer_name}%`)
    .order('sale_date', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Customer check error:', error);
    return { success: false, message: 'Failed to check customer.' };
  }

  if (!data || data.length === 0) {
    return { success: true, message: `No records found for customer "${customer_name}".`, data: [] };
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
