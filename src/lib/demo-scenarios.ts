import { supabase } from "@/integrations/supabase/client";
import { BusinessType } from "@/lib/business-type-config";
import { DemoScenario } from "@/contexts/DemoModeContext";
import { subDays, format } from "date-fns";

interface ScenarioConfig {
  scenario: DemoScenario;
  tenantId: string;
  sessionId: string;
  businessType: BusinessType;
}

export const scenarioDescriptions: Record<DemoScenario, {
  name: string;
  description: string;
  icon: string;
}> = {
  'busy-sales-day': {
    name: 'Busy Sales Day',
    description: 'Simulate a high-traffic day with many transactions',
    icon: 'TrendingUp',
  },
  'month-end-closing': {
    name: 'Month-End Closing',
    description: 'Full month of data for financial reporting',
    icon: 'Calendar',
  },
  'low-stock-alert': {
    name: 'Low Stock Alert',
    description: 'Multiple items below reorder level',
    icon: 'AlertTriangle',
  },
  'new-business': {
    name: 'New Business',
    description: 'Fresh start with minimal data',
    icon: 'Sparkles',
  },
  'overdue-invoices': {
    name: 'Overdue Invoices',
    description: 'Several unpaid invoices past due date',
    icon: 'Clock',
  },
  'payroll-day': {
    name: 'Payroll Day',
    description: 'Ready to process monthly payroll',
    icon: 'Wallet',
  },
  'custom-order-rush': {
    name: 'Custom Order Rush',
    description: 'Multiple orders in production (fashion only)',
    icon: 'Shirt',
  },
};

async function applyBusySalesDay(config: ScenarioConfig) {
  // Add 15-20 transactions from today
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', config.tenantId)
    .eq('demo_session_id', config.sessionId)
    .limit(10);

  if (!inventory?.length) return;

  const transactions = [];
  const today = new Date();

  for (let i = 0; i < 18; i++) {
    const item = inventory[Math.floor(Math.random() * inventory.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;

    transactions.push({
      tenant_id: config.tenantId,
      product_id: item.id,
      quantity,
      unit_price: item.unit_price,
      total_amount: item.unit_price * quantity,
      payment_method: ['cash', 'mobile_money', 'card'][Math.floor(Math.random() * 3)],
      transaction_date: format(today, 'yyyy-MM-dd'),
      created_at: new Date(today.getTime() - Math.random() * 8 * 60 * 60 * 1000).toISOString(),
      is_demo: true,
      demo_session_id: config.sessionId,
    });
  }

  await supabase.from('sales_transactions').insert(transactions);
}

async function applyLowStockAlert(config: ScenarioConfig) {
  // Set 5-8 products below reorder level
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', config.tenantId)
    .eq('demo_session_id', config.sessionId)
    .gt('reorder_level', 0)
    .limit(8);

  if (!inventory?.length) return;

  const updates = inventory.slice(0, 6).map(item => ({
    id: item.id,
    newStock: Math.max(0, (item.reorder_level || 5) - Math.floor(Math.random() * 5) - 1),
  }));

  for (const update of updates) {
    await supabase
      .from('inventory')
      .update({ current_stock: update.newStock })
      .eq('id', update.id);
  }
}

async function applyOverdueInvoices(config: ScenarioConfig) {
  // Create overdue invoices
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', config.tenantId)
    .eq('demo_session_id', config.sessionId)
    .limit(5);

  const invoices = [];
  const today = new Date();

  for (let i = 0; i < 8; i++) {
    const customer = customers?.[i % (customers?.length || 1)];
    const daysOverdue = Math.floor(Math.random() * 30) + 7;
    const dueDate = subDays(today, daysOverdue);
    const invoiceDate = subDays(dueDate, 30);
    const total = Math.floor(Math.random() * 5000) + 500;

    invoices.push({
      tenant_id: config.tenantId,
      invoice_number: `INV-OVD-${String(i + 1).padStart(4, '0')}`,
      client_name: customer?.name || 'Customer',
      client_phone: customer?.phone,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      status: 'overdue',
      subtotal: total,
      tax_rate: 16,
      tax_amount: total * 0.16,
      total_amount: total * 1.16,
      paid_amount: Math.random() > 0.5 ? total * 0.3 : 0,
      is_demo: true,
      demo_session_id: config.sessionId,
    });
  }

  await supabase.from('invoices').insert(invoices);
}

async function applyCustomOrderRush(config: ScenarioConfig) {
  if (config.businessType !== 'fashion') return;

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', config.tenantId)
    .eq('demo_session_id', config.sessionId)
    .limit(8);

  const statuses = ['pending', 'cutting', 'sewing', 'fitting', 'finishing'];
  const designTypes = ['Wedding Gown', 'Business Suit', 'Evening Dress', 'Chitenge Dress', 'School Uniform'];

  const orders = [];

  for (let i = 0; i < 8; i++) {
    const customer = customers?.[i % (customers?.length || 1)];
    const daysAgo = Math.floor(Math.random() * 14);
    const orderDate = subDays(new Date(), daysAgo);
    const dueDate = subDays(new Date(), daysAgo - 14);

    orders.push({
      tenant_id: config.tenantId,
      order_number: `ORD-DEMO-${String(i + 1).padStart(4, '0')}`,
      customer_id: customer?.id,
      design_type: designTypes[i % designTypes.length],
      fabric: ['Chitenge', 'Silk', 'Cotton', 'Lace', 'Ankara'][i % 5],
      color: ['Blue', 'Red', 'Green', 'Gold', 'Black'][i % 5],
      status: statuses[i % statuses.length],
      order_date: format(orderDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      estimated_cost: Math.floor(Math.random() * 3000) + 1000,
      deposit_paid: Math.floor(Math.random() * 1000) + 500,
      is_demo: true,
      demo_session_id: config.sessionId,
    });
  }

  await supabase.from('custom_orders').insert(orders);
}

async function applyNewBusiness(config: ScenarioConfig) {
  // Delete most demo data, keep minimal
  const tables = ['sales_transactions', 'invoices', 'expenses'];
  
  for (const table of tables) {
    await supabase
      .from(table as any)
      .delete()
      .eq('demo_session_id', config.sessionId);
  }

  // Keep only 3 customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('demo_session_id', config.sessionId)
    .limit(100);

  if (customers && customers.length > 3) {
    const toDelete = customers.slice(3).map(c => c.id);
    await supabase
      .from('customers')
      .delete()
      .in('id', toDelete);
  }
}

export async function applyDemoScenario(config: ScenarioConfig) {
  switch (config.scenario) {
    case 'busy-sales-day':
      await applyBusySalesDay(config);
      break;
    case 'low-stock-alert':
      await applyLowStockAlert(config);
      break;
    case 'overdue-invoices':
      await applyOverdueInvoices(config);
      break;
    case 'custom-order-rush':
      await applyCustomOrderRush(config);
      break;
    case 'new-business':
      await applyNewBusiness(config);
      break;
    case 'month-end-closing':
      // Data already seeded with full month
      break;
    case 'payroll-day':
      // Employees already seeded
      break;
  }
}
