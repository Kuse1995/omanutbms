-- Add type column to branches for location classification
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Store' 
CHECK (type IN ('Store', 'Warehouse', 'Production'));

-- Add approval workflow fields to stock_transfers
ALTER TABLE public.stock_transfers
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update existing branches to have 'Store' type
UPDATE public.branches SET type = 'Store' WHERE type IS NULL;

-- Add warehouse feature flag columns to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS warehouse_enabled BOOLEAN DEFAULT false;

-- Add warehouse feature to billing_plan_configs
ALTER TABLE public.billing_plan_configs
ADD COLUMN IF NOT EXISTS feature_warehouse BOOLEAN DEFAULT false;

-- Update existing plan configs: Growth and Enterprise get warehouse
UPDATE public.billing_plan_configs 
SET feature_warehouse = true 
WHERE plan_key IN ('growth', 'enterprise');