
# Fix All Operations Manager RLS Gaps — Immediate

## What Is Broken Right Now

### Confirmed failures for `operations_manager` role:

| Table | Operation | Current Policy | Will Fail? |
|---|---|---|---|
| `sales_transactions` | INSERT | `can_record_sales()` now includes ops_manager | FIXED |
| `payment_receipts` | INSERT | `can_record_sales()` | FIXED |
| **`sales`** | **INSERT** | `is_tenant_admin_or_manager()` only | **YES — crash** |
| **`invoices`** | **INSERT** | `can_manage_accounts()` only | **YES — credit sale crash** |
| **`invoice_items`** | **INSERT** | `can_manage_accounts()` only | **YES — credit sale crash** |

### How the crash happens step by step:
1. Ops manager adds items to cart → OK
2. Clicks "Checkout" → triggers `handleCheckout()`
3. `sales_transactions` INSERT → NOW works (just fixed)
4. For **credit sales**: `invoices` INSERT → **RLS violation — throws error**
5. `invoice_items` INSERT → **RLS violation — throws error**
6. The whole checkout is wrapped in a try/catch — the thrown error shows "Failed to record sale" toast

Even for **cash sales**, the `sales` table INSERT (if used) would fail. Looking at the code, the `sales` table isn't directly inserted in `SalesRecorder.tsx` (only `sales_transactions`) — but it IS used in other paths.

## The Fix — One Migration

A single SQL migration that adds `operations_manager` to the three missing tables:

```sql
-- 1. Fix sales table: operations_manager can insert
DROP POLICY IF EXISTS "Admins/managers can insert sales" ON public.sales;
CREATE POLICY "Sales roles can insert sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));

-- 2. Fix invoices table: operations_manager can create invoices (for credit sales)
CREATE POLICY "Sales roles can insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));

-- 3. Fix invoice_items table: operations_manager can insert line items
CREATE POLICY "Sales roles can insert invoice_items"
ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (can_record_sales(tenant_id));
```

The `can_record_sales()` function already includes `operations_manager` (from the fix applied earlier), so reusing it here is the correct approach — no new function needed.

## Files Changed

Only one database migration file. No React code changes needed — the application code is correct; only the database policies are blocking the operations manager.

## Why This Is Safe

- `can_record_sales()` is a `SECURITY DEFINER` function that checks `tenant_id` membership, so it cannot be used to create invoices for other tenants.
- `operations_manager` already has module-level access to `sales` and `receipts` in `roleModuleAccess` (see `role-config.ts`). The database was just not aligned with the application's intent.
- Existing admin/manager policies remain in place — this only adds ops manager coverage on top.
