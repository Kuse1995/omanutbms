-- Add new roles to the app_role enum
-- We need to recreate the enum with new values since PostgreSQL doesn't support adding values in a transaction-safe way

-- First, add the new values to the existing enum (safe approach)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cashier';

-- Add a comment documenting the role hierarchy
COMMENT ON TYPE app_role IS 'User roles: admin (full access), manager (most access), accountant (accounts/invoices/expenses), hr_manager (HR/payroll/employees), sales_rep (sales/inventory view), cashier (sales/receipts only), viewer (read-only)';