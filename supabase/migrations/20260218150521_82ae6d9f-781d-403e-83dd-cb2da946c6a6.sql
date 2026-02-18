
-- Fix expenses table: operations_manager and inventory roles can insert expense records
-- This is needed for the restock flow (recording COGS as expense) and general expense recording

-- Allow inventory/sales roles to insert expenses (needed for restock as expense)
CREATE POLICY "Inventory roles can insert expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (can_manage_inventory(tenant_id));
