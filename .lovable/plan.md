

# Fix: Operations Managers Cannot Create Quotations

## Root Cause

The `quotations` table INSERT policy correctly includes `operations_manager`, but the **`quotation_items`** table does not. When an operations manager creates a quotation, the parent row inserts fine, but the line items fail with an RLS violation.

Additionally, the `quotation_items` UPDATE policy only allows `admin`, so operations managers can't edit quotation items either.

**Current policies on `quotation_items`:**
- INSERT: `is_tenant_admin_or_manager(tenant_id)` — missing `operations_manager`
- UPDATE: `is_tenant_admin(tenant_id)` — missing `operations_manager` and `manager`

## Fix

Run two SQL migrations:

### 1. Update `quotation_items` INSERT policy
Drop and recreate to include `operations_manager`:

```sql
DROP POLICY "Admins/managers can insert quotation_items" ON public.quotation_items;
CREATE POLICY "Admins/managers/ops can insert quotation_items" ON public.quotation_items
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_admin_or_manager(tenant_id) 
  OR has_tenant_role(tenant_id, 'operations_manager'::app_role)
);
```

### 2. Update `quotation_items` UPDATE policy
Drop and recreate to include `operations_manager`:

```sql
DROP POLICY "Admins can update quotation_items" ON public.quotation_items;
CREATE POLICY "Admins/managers/ops can update quotation_items" ON public.quotation_items
FOR UPDATE TO authenticated
USING (
  is_tenant_admin_or_manager(tenant_id) 
  OR has_tenant_role(tenant_id, 'operations_manager'::app_role)
);
```

No frontend code changes needed — this is purely a database policy fix.

