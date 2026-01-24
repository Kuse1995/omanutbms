-- Add demo tracking columns to core tables for data isolation and cleanup

-- Inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_inventory_demo ON inventory(is_demo) WHERE is_demo = true;

-- Customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_customers_demo ON customers(is_demo) WHERE is_demo = true;

-- Sales transactions table
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_sales_transactions_demo ON sales_transactions(is_demo) WHERE is_demo = true;

-- Invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_invoices_demo ON invoices(is_demo) WHERE is_demo = true;

-- Employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_employees_demo ON employees(is_demo) WHERE is_demo = true;

-- Expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_expenses_demo ON expenses(is_demo) WHERE is_demo = true;

-- Custom orders table
ALTER TABLE custom_orders ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE custom_orders ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_custom_orders_demo ON custom_orders(is_demo) WHERE is_demo = true;

-- Invoice items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS demo_session_id uuid;
CREATE INDEX IF NOT EXISTS idx_invoice_items_demo ON invoice_items(is_demo) WHERE is_demo = true;