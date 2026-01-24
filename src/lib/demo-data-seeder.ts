import { supabase } from "@/integrations/supabase/client";
import { BusinessType } from "@/lib/business-type-config";
import { 
  generateZambianName, 
  generateZambianPhone, 
  generateZambianEmail, 
  generateZambianAddress 
} from "./demo-zambian-data";
import { subDays, format } from "date-fns";

interface SeedConfig {
  businessType: BusinessType;
  tenantId: string;
  sessionId: string;
  onProgress?: (progress: number) => void;
}

// Industry-specific inventory templates
const inventoryTemplates: Record<string, Array<{
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  reorder_level: number;
}>> = {
  fashion: [
    { name: "Chitenge Fabric (6 yards)", sku: "FAB-CHT-001", category: "Fabrics", unit_price: 250, cost_price: 180, quantity: 45, reorder_level: 10 },
    { name: "Italian Silk (per meter)", sku: "FAB-SLK-001", category: "Fabrics", unit_price: 450, cost_price: 320, quantity: 20, reorder_level: 5 },
    { name: "Cotton Blend (per meter)", sku: "FAB-COT-001", category: "Fabrics", unit_price: 150, cost_price: 100, quantity: 80, reorder_level: 20 },
    { name: "Ankara Print (6 yards)", sku: "FAB-ANK-001", category: "Fabrics", unit_price: 350, cost_price: 250, quantity: 35, reorder_level: 10 },
    { name: "Lace Material (per meter)", sku: "FAB-LAC-001", category: "Fabrics", unit_price: 280, cost_price: 200, quantity: 25, reorder_level: 8 },
    { name: "Suit Buttons (pack of 10)", sku: "ACC-BTN-001", category: "Accessories", unit_price: 45, cost_price: 25, quantity: 100, reorder_level: 30 },
    { name: "Zipper 20cm", sku: "ACC-ZIP-001", category: "Accessories", unit_price: 25, cost_price: 12, quantity: 150, reorder_level: 50 },
    { name: "Thread Spool (Mixed)", sku: "ACC-THR-001", category: "Accessories", unit_price: 35, cost_price: 20, quantity: 200, reorder_level: 50 },
    { name: "Custom Suit Tailoring", sku: "SVC-SUIT-001", category: "Services", unit_price: 1500, cost_price: 800, quantity: 999, reorder_level: 0 },
    { name: "Wedding Dress Design", sku: "SVC-WED-001", category: "Services", unit_price: 3500, cost_price: 1500, quantity: 999, reorder_level: 0 },
    { name: "Dress Alteration", sku: "SVC-ALT-001", category: "Services", unit_price: 200, cost_price: 80, quantity: 999, reorder_level: 0 },
    { name: "School Uniform Set", sku: "RTW-UNI-001", category: "Ready-to-Wear", unit_price: 450, cost_price: 280, quantity: 50, reorder_level: 15 },
  ],
  salon: [
    { name: "Ladies Haircut & Styling", sku: "SVC-HAIR-001", category: "Hair Services", unit_price: 150, cost_price: 30, quantity: 999, reorder_level: 0 },
    { name: "Braiding (Full Head)", sku: "SVC-BRAID-001", category: "Hair Services", unit_price: 350, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Relaxer Treatment", sku: "SVC-RELAX-001", category: "Hair Services", unit_price: 280, cost_price: 80, quantity: 999, reorder_level: 0 },
    { name: "Weave Installation", sku: "SVC-WEAVE-001", category: "Hair Services", unit_price: 500, cost_price: 100, quantity: 999, reorder_level: 0 },
    { name: "Manicure & Pedicure Set", sku: "SVC-NAILS-001", category: "Nail Services", unit_price: 200, cost_price: 40, quantity: 999, reorder_level: 0 },
    { name: "Gel Nails (Full Set)", sku: "SVC-GEL-001", category: "Nail Services", unit_price: 350, cost_price: 80, quantity: 999, reorder_level: 0 },
    { name: "Facial Treatment", sku: "SVC-FACIAL-001", category: "Spa Services", unit_price: 250, cost_price: 60, quantity: 999, reorder_level: 0 },
    { name: "Hair Relaxer Cream", sku: "PRD-RLX-001", category: "Products", unit_price: 85, cost_price: 45, quantity: 30, reorder_level: 10 },
    { name: "Shampoo (500ml)", sku: "PRD-SHP-001", category: "Products", unit_price: 65, cost_price: 35, quantity: 40, reorder_level: 15 },
    { name: "Hair Extensions Pack", sku: "PRD-EXT-001", category: "Products", unit_price: 180, cost_price: 100, quantity: 25, reorder_level: 8 },
    { name: "Nail Polish Set", sku: "PRD-NAIL-001", category: "Products", unit_price: 45, cost_price: 20, quantity: 50, reorder_level: 15 },
  ],
  healthcare: [
    { name: "General Consultation", sku: "SVC-CONSULT-001", category: "Consultations", unit_price: 200, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Specialist Consultation", sku: "SVC-SPEC-001", category: "Consultations", unit_price: 400, cost_price: 100, quantity: 999, reorder_level: 0 },
    { name: "Malaria Test", sku: "SVC-TEST-MAL", category: "Lab Tests", unit_price: 80, cost_price: 25, quantity: 999, reorder_level: 0 },
    { name: "Blood Pressure Check", sku: "SVC-BP-001", category: "Vitals", unit_price: 50, cost_price: 10, quantity: 999, reorder_level: 0 },
    { name: "Blood Sugar Test", sku: "SVC-GLU-001", category: "Lab Tests", unit_price: 100, cost_price: 30, quantity: 999, reorder_level: 0 },
    { name: "Paracetamol (100 tablets)", sku: "MED-PARA-100", category: "Medication", unit_price: 35, cost_price: 15, quantity: 200, reorder_level: 50 },
    { name: "Coartem (6 tablets)", sku: "MED-COART-6", category: "Medication", unit_price: 120, cost_price: 70, quantity: 100, reorder_level: 30 },
    { name: "Amoxicillin (21 capsules)", sku: "MED-AMOX-21", category: "Medication", unit_price: 85, cost_price: 45, quantity: 80, reorder_level: 25 },
    { name: "Bandages (pack)", sku: "SUP-BAND-001", category: "Supplies", unit_price: 25, cost_price: 12, quantity: 100, reorder_level: 30 },
    { name: "Disposable Gloves (box)", sku: "SUP-GLOVE-001", category: "Supplies", unit_price: 150, cost_price: 80, quantity: 50, reorder_level: 20 },
  ],
  retail: [
    { name: "Cooking Oil (2L)", sku: "GRO-OIL-2L", category: "Groceries", unit_price: 95, cost_price: 75, quantity: 100, reorder_level: 30 },
    { name: "Mealie Meal (25kg)", sku: "GRO-MEAL-25", category: "Groceries", unit_price: 280, cost_price: 220, quantity: 50, reorder_level: 15 },
    { name: "Sugar (2kg)", sku: "GRO-SUG-2", category: "Groceries", unit_price: 65, cost_price: 50, quantity: 80, reorder_level: 25 },
    { name: "Rice (5kg)", sku: "GRO-RICE-5", category: "Groceries", unit_price: 120, cost_price: 90, quantity: 60, reorder_level: 20 },
    { name: "Bread Loaf", sku: "BAK-BREAD-001", category: "Bakery", unit_price: 22, cost_price: 15, quantity: 40, reorder_level: 15 },
    { name: "Eggs (tray of 30)", sku: "DAI-EGG-30", category: "Dairy", unit_price: 85, cost_price: 65, quantity: 25, reorder_level: 10 },
    { name: "Milk (1L)", sku: "DAI-MILK-1L", category: "Dairy", unit_price: 28, cost_price: 20, quantity: 50, reorder_level: 20 },
    { name: "Soft Drink (2L)", sku: "BEV-SODA-2L", category: "Beverages", unit_price: 35, cost_price: 25, quantity: 100, reorder_level: 30 },
    { name: "Washing Powder (1kg)", sku: "HOU-WASH-1K", category: "Household", unit_price: 55, cost_price: 40, quantity: 60, reorder_level: 20 },
    { name: "Dish Soap (500ml)", sku: "HOU-DISH-500", category: "Household", unit_price: 25, cost_price: 15, quantity: 80, reorder_level: 25 },
  ],
  agriculture: [
    { name: "Maize Seed (10kg)", sku: "SED-MAIZE-10", category: "Seeds", unit_price: 350, cost_price: 250, quantity: 100, reorder_level: 30 },
    { name: "Groundnut Seed (5kg)", sku: "SED-GNUT-5", category: "Seeds", unit_price: 180, cost_price: 120, quantity: 80, reorder_level: 25 },
    { name: "Fertilizer D-Compound (50kg)", sku: "FER-DCOM-50", category: "Fertilizers", unit_price: 850, cost_price: 650, quantity: 50, reorder_level: 15 },
    { name: "Urea Fertilizer (50kg)", sku: "FER-UREA-50", category: "Fertilizers", unit_price: 750, cost_price: 580, quantity: 40, reorder_level: 12 },
    { name: "Pesticide (5L)", sku: "CHE-PEST-5L", category: "Chemicals", unit_price: 280, cost_price: 200, quantity: 30, reorder_level: 10 },
    { name: "Herbicide (5L)", sku: "CHE-HERB-5L", category: "Chemicals", unit_price: 320, cost_price: 240, quantity: 25, reorder_level: 8 },
    { name: "Chicken Feed (50kg)", sku: "FED-CHK-50", category: "Animal Feed", unit_price: 380, cost_price: 300, quantity: 60, reorder_level: 20 },
    { name: "Day Old Chicks (box of 100)", sku: "LIV-CHICK-100", category: "Livestock", unit_price: 650, cost_price: 480, quantity: 20, reorder_level: 5 },
  ],
  services: [
    { name: "Consulting (per hour)", sku: "SVC-CONS-HR", category: "Consulting", unit_price: 500, cost_price: 100, quantity: 999, reorder_level: 0 },
    { name: "Project Management", sku: "SVC-PM-001", category: "Projects", unit_price: 2500, cost_price: 500, quantity: 999, reorder_level: 0 },
    { name: "Training Session (half day)", sku: "SVC-TRAIN-HD", category: "Training", unit_price: 1500, cost_price: 300, quantity: 999, reorder_level: 0 },
    { name: "Document Preparation", sku: "SVC-DOC-001", category: "Admin", unit_price: 200, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Website Development", sku: "SVC-WEB-001", category: "IT Services", unit_price: 5000, cost_price: 1000, quantity: 999, reorder_level: 0 },
    { name: "IT Support (monthly)", sku: "SVC-IT-MON", category: "IT Services", unit_price: 1200, cost_price: 300, quantity: 999, reorder_level: 0 },
  ],
  autoshop: [
    { name: "Oil Change Service", sku: "SVC-OIL-001", category: "Services", unit_price: 350, cost_price: 150, quantity: 999, reorder_level: 0 },
    { name: "Tyre Rotation", sku: "SVC-TYRE-ROT", category: "Services", unit_price: 200, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Brake Pad Replacement", sku: "SVC-BRAKE-001", category: "Services", unit_price: 800, cost_price: 400, quantity: 999, reorder_level: 0 },
    { name: "Engine Diagnostics", sku: "SVC-DIAG-001", category: "Services", unit_price: 300, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Engine Oil (5L)", sku: "PRT-OIL-5L", category: "Parts", unit_price: 280, cost_price: 180, quantity: 40, reorder_level: 15 },
    { name: "Brake Pads (set)", sku: "PRT-BRAKE-SET", category: "Parts", unit_price: 450, cost_price: 280, quantity: 20, reorder_level: 8 },
    { name: "Air Filter", sku: "PRT-AIRF-001", category: "Parts", unit_price: 150, cost_price: 80, quantity: 30, reorder_level: 10 },
    { name: "Battery (12V)", sku: "PRT-BATT-12V", category: "Parts", unit_price: 1200, cost_price: 850, quantity: 15, reorder_level: 5 },
  ],
  hospitality: [
    { name: "Standard Room (per night)", sku: "ROM-STD-001", category: "Rooms", unit_price: 450, cost_price: 150, quantity: 10, reorder_level: 0 },
    { name: "Deluxe Room (per night)", sku: "ROM-DLX-001", category: "Rooms", unit_price: 750, cost_price: 250, quantity: 5, reorder_level: 0 },
    { name: "Executive Suite (per night)", sku: "ROM-EXE-001", category: "Rooms", unit_price: 1200, cost_price: 400, quantity: 2, reorder_level: 0 },
    { name: "Continental Breakfast", sku: "FNB-BRK-001", category: "Food & Beverage", unit_price: 120, cost_price: 45, quantity: 999, reorder_level: 0 },
    { name: "Lunch Buffet", sku: "FNB-LUN-001", category: "Food & Beverage", unit_price: 180, cost_price: 70, quantity: 999, reorder_level: 0 },
    { name: "Dinner (3 course)", sku: "FNB-DIN-001", category: "Food & Beverage", unit_price: 250, cost_price: 100, quantity: 999, reorder_level: 0 },
    { name: "Conference Room (per day)", sku: "CNF-ROOM-001", category: "Conference", unit_price: 2500, cost_price: 500, quantity: 3, reorder_level: 0 },
  ],
  ngo: [
    { name: "Community Training Session", sku: "PRG-TRAIN-001", category: "Programs", unit_price: 0, cost_price: 500, quantity: 999, reorder_level: 0 },
    { name: "Health Outreach Visit", sku: "PRG-HEALTH-001", category: "Programs", unit_price: 0, cost_price: 300, quantity: 999, reorder_level: 0 },
    { name: "School Supplies Kit", sku: "SUP-SCHOOL-001", category: "Supplies", unit_price: 150, cost_price: 100, quantity: 200, reorder_level: 50 },
    { name: "First Aid Kit", sku: "SUP-FAID-001", category: "Supplies", unit_price: 250, cost_price: 180, quantity: 50, reorder_level: 15 },
    { name: "Water Purification Tablets", sku: "SUP-WATER-001", category: "Supplies", unit_price: 35, cost_price: 20, quantity: 500, reorder_level: 100 },
    { name: "Mosquito Nets (pack of 10)", sku: "SUP-NET-010", category: "Supplies", unit_price: 200, cost_price: 120, quantity: 100, reorder_level: 30 },
  ],
  school: [
    { name: "Tuition Fee (per term)", sku: "FEE-TUIT-001", category: "Fees", unit_price: 2500, cost_price: 1500, quantity: 999, reorder_level: 0 },
    { name: "Boarding Fee (per term)", sku: "FEE-BOARD-001", category: "Fees", unit_price: 3500, cost_price: 2500, quantity: 999, reorder_level: 0 },
    { name: "Exam Fee", sku: "FEE-EXAM-001", category: "Fees", unit_price: 350, cost_price: 200, quantity: 999, reorder_level: 0 },
    { name: "School Uniform (complete)", sku: "UNI-FULL-001", category: "Uniform", unit_price: 450, cost_price: 280, quantity: 100, reorder_level: 30 },
    { name: "Exercise Books (pack of 10)", sku: "SUP-BOOK-010", category: "Supplies", unit_price: 65, cost_price: 40, quantity: 200, reorder_level: 50 },
    { name: "Textbook Set (per grade)", sku: "SUP-TEXT-001", category: "Supplies", unit_price: 350, cost_price: 250, quantity: 50, reorder_level: 20 },
  ],
  distribution: [
    { name: "Coca-Cola (case of 24)", sku: "BEV-COKE-24", category: "Beverages", unit_price: 180, cost_price: 140, quantity: 200, reorder_level: 50 },
    { name: "Fanta (case of 24)", sku: "BEV-FANT-24", category: "Beverages", unit_price: 180, cost_price: 140, quantity: 150, reorder_level: 40 },
    { name: "Castle Lager (crate)", sku: "BEV-BEER-001", category: "Beverages", unit_price: 280, cost_price: 220, quantity: 100, reorder_level: 30 },
    { name: "Mosi Lager (crate)", sku: "BEV-MOSI-001", category: "Beverages", unit_price: 260, cost_price: 200, quantity: 80, reorder_level: 25 },
    { name: "Maheu (case of 12)", sku: "BEV-MAHE-12", category: "Beverages", unit_price: 120, cost_price: 90, quantity: 100, reorder_level: 30 },
    { name: "Cooking Oil (case of 12)", sku: "GRO-OIL-12", category: "Groceries", unit_price: 960, cost_price: 780, quantity: 50, reorder_level: 15 },
    { name: "Soap Bar (carton)", sku: "HOU-SOAP-CT", category: "Household", unit_price: 350, cost_price: 280, quantity: 80, reorder_level: 25 },
  ],
  hybrid: [
    { name: "Consultation Service", sku: "SVC-CONS-001", category: "Services", unit_price: 300, cost_price: 50, quantity: 999, reorder_level: 0 },
    { name: "Product A - Basic", sku: "PRD-A-001", category: "Products", unit_price: 150, cost_price: 100, quantity: 50, reorder_level: 15 },
    { name: "Product B - Premium", sku: "PRD-B-001", category: "Products", unit_price: 350, cost_price: 220, quantity: 30, reorder_level: 10 },
    { name: "Installation Service", sku: "SVC-INST-001", category: "Services", unit_price: 500, cost_price: 100, quantity: 999, reorder_level: 0 },
    { name: "Maintenance Package", sku: "SVC-MAINT-001", category: "Services", unit_price: 800, cost_price: 200, quantity: 999, reorder_level: 0 },
    { name: "Accessory Pack", sku: "PRD-ACC-001", category: "Products", unit_price: 80, cost_price: 45, quantity: 100, reorder_level: 30 },
  ],
};

// Get the right template or fall back to retail
function getInventoryTemplate(businessType: BusinessType) {
  return inventoryTemplates[businessType] || inventoryTemplates.retail;
}

// Generate customers for demo
async function seedCustomers(config: SeedConfig, count: number = 10) {
  console.log('[Demo Seeder] Seeding customers...');
  const customers = [];
  
  for (let i = 0; i < count; i++) {
    const name = generateZambianName();
    const address = generateZambianAddress();
    
    customers.push({
      tenant_id: config.tenantId,
      name: name.fullName,
      phone: generateZambianPhone(),
      email: generateZambianEmail(name),
      address: `${address.address}, ${address.city}`,
      is_demo: true,
      demo_session_id: config.sessionId,
    });
  }
  
  const { data, error } = await supabase.from('customers').insert(customers).select();
  if (error) {
    console.error('[Demo Seeder] Error seeding customers:', error);
    throw error;
  }
  
  console.log(`[Demo Seeder] Seeded ${data?.length || 0} customers`);
  return data || [];
}

// Generate inventory items for demo
async function seedInventory(config: SeedConfig) {
  console.log('[Demo Seeder] Seeding inventory...');
  const template = getInventoryTemplate(config.businessType);
  
  const items = template.map(item => ({
    tenant_id: config.tenantId,
    name: item.name,
    sku: item.sku,
    category: item.category,
    unit_price: item.unit_price,
    cost_price: item.cost_price,
    current_stock: item.quantity,
    reorder_level: item.reorder_level,
    is_demo: true,
    demo_session_id: config.sessionId,
  }));
  
  const { data, error } = await supabase.from('inventory').insert(items).select();
  if (error) {
    console.error('[Demo Seeder] Error seeding inventory:', error);
    throw error;
  }
  
  console.log(`[Demo Seeder] Seeded ${data?.length || 0} inventory items`);
  return data || [];
}

// Generate historical transactions (60 days)
// Fixed: Uses correct column names (unit_price_zmw, total_amount_zmw, product_name, customer_name)
async function seedTransactions(
  config: SeedConfig, 
  inventory: any[], 
  customers: any[],
  daysBack: number = 60
) {
  console.log('[Demo Seeder] Seeding transactions...');
  const transactions = [];
  const today = new Date();
  
  for (let day = daysBack; day >= 0; day--) {
    const date = subDays(today, day);
    const dayOfWeek = date.getDay();
    
    // Fewer transactions on Sundays
    let transactionsToday = dayOfWeek === 0 
      ? Math.floor(Math.random() * 3) + 1 
      : Math.floor(Math.random() * 8) + 3;
    
    // Spike around month end (payday)
    const dayOfMonth = date.getDate();
    if (dayOfMonth >= 25 && dayOfMonth <= 28) {
      transactionsToday = Math.floor(transactionsToday * 1.5);
    }
    
    for (let t = 0; t < transactionsToday; t++) {
      const item = inventory[Math.floor(Math.random() * inventory.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const total = item.unit_price * quantity;
      
      // Fixed column names to match schema
      transactions.push({
        tenant_id: config.tenantId,
        product_id: item.id,
        product_name: item.name, // Required field
        customer_name: customer?.name || 'Walk-in Customer',
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        quantity,
        unit_price_zmw: item.unit_price, // Fixed: was unit_price
        total_amount_zmw: total, // Fixed: was total_amount
        payment_method: ['cash', 'mobile_money', 'card'][Math.floor(Math.random() * 3)],
        transaction_type: 'sale', // Required field
        item_type: 'product',
        created_at: date.toISOString(),
        is_demo: true,
        demo_session_id: config.sessionId,
      });
    }
  }
  
  // Insert in batches
  const batchSize = 50;
  let insertedCount = 0;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { error } = await supabase.from('sales_transactions').insert(batch);
    if (error) {
      console.error('[Demo Seeder] Error seeding transactions batch:', error);
      throw error;
    }
    insertedCount += batch.length;
  }
  
  console.log(`[Demo Seeder] Seeded ${insertedCount} transactions`);
  return transactions;
}

// Generate invoices (fixed: insert invoice_items separately, removed items_json)
async function seedInvoices(config: SeedConfig, customers: any[], inventory: any[]) {
  console.log('[Demo Seeder] Seeding invoices...');
  const invoicesData: Array<{
    invoiceRecord: any;
    items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  }> = [];
  const today = new Date();
  
  const statuses = ['paid', 'paid', 'paid', 'pending', 'pending', 'overdue'];
  
  for (let i = 0; i < 15; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysAgo = Math.floor(Math.random() * 45);
    const invoiceDate = subDays(today, daysAgo);
    const dueDate = subDays(today, daysAgo - 30);
    
    const itemCount = Math.floor(Math.random() * 4) + 1;
    let subtotal = 0;
    const items: Array<{ description: string; quantity: number; unit_price: number; amount: number }> = [];
    
    for (let j = 0; j < itemCount; j++) {
      const item = inventory[Math.floor(Math.random() * inventory.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const amount = item.unit_price * qty;
      subtotal += amount;
      
      items.push({
        description: item.name,
        quantity: qty,
        unit_price: item.unit_price,
        amount,
      });
    }
    
    const taxAmount = subtotal * 0.16;
    const totalAmount = subtotal + taxAmount;
    
    // Fixed: removed items_json column
    invoicesData.push({
      invoiceRecord: {
        tenant_id: config.tenantId,
        invoice_number: `INV-DEMO-${String(i + 1).padStart(4, '0')}`,
        client_name: customer?.name || 'Walk-in Customer',
        client_email: customer?.email,
        client_phone: customer?.phone,
        invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status,
        subtotal,
        tax_rate: 16,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: status === 'paid' ? totalAmount : (status === 'pending' ? 0 : totalAmount * 0.3),
        is_demo: true,
        demo_session_id: config.sessionId,
      },
      items,
    });
  }
  
  // Insert invoices first
  const invoiceRecords = invoicesData.map(d => d.invoiceRecord);
  const { data: insertedInvoices, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoiceRecords)
    .select();
  
  if (invoiceError) {
    console.error('[Demo Seeder] Error seeding invoices:', invoiceError);
    throw invoiceError;
  }
  
  console.log(`[Demo Seeder] Seeded ${insertedInvoices?.length || 0} invoices`);
  
  // Then insert invoice_items with the returned invoice IDs
  if (insertedInvoices && insertedInvoices.length > 0) {
    const allItems: any[] = [];
    
    for (let i = 0; i < insertedInvoices.length; i++) {
      const invoice = insertedInvoices[i];
      const itemsForInvoice = invoicesData[i].items;
      
      for (const item of itemsForInvoice) {
        allItems.push({
          invoice_id: invoice.id,
          tenant_id: config.tenantId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          item_type: 'product',
          is_demo: true,
          demo_session_id: config.sessionId,
        });
      }
    }
    
    if (allItems.length > 0) {
      const { error: itemsError } = await supabase.from('invoice_items').insert(allItems);
      if (itemsError) {
        console.error('[Demo Seeder] Error seeding invoice items:', itemsError);
        throw itemsError;
      }
      console.log(`[Demo Seeder] Seeded ${allItems.length} invoice items`);
    }
  }
  
  return insertedInvoices || [];
}

// Generate employees (fixed: uses correct column names)
async function seedEmployees(config: SeedConfig, count: number = 5) {
  console.log('[Demo Seeder] Seeding employees...');
  const jobTitles = ['Manager', 'Cashier', 'Sales Representative', 'Accountant', 'HR Manager'];
  const employees = [];
  
  for (let i = 0; i < count; i++) {
    const name = generateZambianName();
    const address = generateZambianAddress();
    const hireDate = subDays(new Date(), Math.floor(Math.random() * 365) + 30);
    
    // Fixed column names to match schema
    employees.push({
      tenant_id: config.tenantId,
      full_name: name.fullName, // Fixed: was first_name + last_name
      email: generateZambianEmail(name),
      phone: generateZambianPhone(),
      job_title: jobTitles[i % jobTitles.length], // Fixed: was role
      department: ['Operations', 'Sales', 'Finance', 'HR', 'Admin'][i % 5],
      hire_date: format(hireDate, 'yyyy-MM-dd'),
      base_salary_zmw: [3500, 4500, 5500, 6500, 8000][i % 5], // Fixed: was basic_salary
      employment_status: 'active', // Fixed: was status
      employee_type: 'full_time', // Required field
      pay_type: 'monthly', // Required field
      address: `${address.address}, ${address.city}`,
      is_demo: true,
      demo_session_id: config.sessionId,
    });
  }
  
  const { data, error } = await supabase.from('employees').insert(employees).select();
  if (error) {
    console.error('[Demo Seeder] Error seeding employees:', error);
    throw error;
  }
  
  console.log(`[Demo Seeder] Seeded ${data?.length || 0} employees`);
  return data || [];
}

// Main seeding function
export async function seedDemoDataForBusinessType(config: SeedConfig) {
  const { onProgress } = config;
  
  console.log('[Demo Seeder] Starting demo data seeding...', {
    businessType: config.businessType,
    tenantId: config.tenantId,
    sessionId: config.sessionId,
  });
  
  try {
    onProgress?.(10);
    
    // 1. Seed inventory
    const inventory = await seedInventory(config);
    onProgress?.(30);
    
    // 2. Seed customers
    const customers = await seedCustomers(config, 10);
    onProgress?.(45);
    
    // 3. Seed employees
    await seedEmployees(config, 5);
    onProgress?.(55);
    
    // 4. Seed transactions (60 days of history)
    await seedTransactions(config, inventory, customers, 60);
    onProgress?.(80);
    
    // 5. Seed invoices
    await seedInvoices(config, customers, inventory);
    onProgress?.(95);
    
    onProgress?.(100);
    
    console.log('[Demo Seeder] Demo data seeding completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('[Demo Seeder] Demo seeding failed:', error);
    throw error;
  }
}
