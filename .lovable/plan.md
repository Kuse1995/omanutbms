

# Enable Quotations Access for Operations Managers

## Changes

### 1. `src/lib/role-config.ts`
- Add `"quotations"` to the `operations_manager` module access array (currently missing)

### 2. Database function: `can_manage_accounts`
- The quotations module likely uses `can_manage_accounts` for RLS which only allows `admin`, `manager`, `accountant`. Need to verify if quotations has its own RLS or piggybacks on accounts, and if so, add `operations_manager` to the relevant function or create a dedicated one.

Let me verify the quotations RLS situation — looking at the existing DB functions, `can_record_sales` already includes `operations_manager` and `sales_rep`. Quotations are similar to sales documents, so operations managers should be allowed. The `can_manage_accounts` function does NOT include `operations_manager`, so if quotations RLS uses that, we need to either update it or use `can_record_sales` instead.

## Files to Modify
- **`src/lib/role-config.ts`** — add `"quotations"` to `operations_manager` array
- **Database migration** (if needed) — ensure RLS on `quotations` table permits `operations_manager` role

This is a small, focused change.

