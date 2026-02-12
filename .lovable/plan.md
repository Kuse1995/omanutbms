

# Fix Invoice and Quotation Number Uniqueness

## Problem

The invoice and quotation number generators have two issues:

1. **Not tenant-scoped**: The triggers count numbers across ALL tenants globally, so Tenant A and Tenant B share the same sequence. This means numbers aren't unique per-tenant and can collide or skip.
2. **No unique constraint**: There's no database-level uniqueness enforcement on `(tenant_id, invoice_number)` or `(tenant_id, quotation_number)`, so duplicates can slip through under concurrency.

## Solution

A single database migration that:

### 1. Replace `generate_invoice_number()` with a tenant-scoped version
- Filter by `NEW.tenant_id` when finding the next number
- Format: `INV-2026-0001` (prefixed for clarity, scoped per tenant per year)

### 2. Replace `generate_quotation_number()` with a tenant-scoped version
- Filter by `NEW.tenant_id` when finding the next number
- Format: `Q2026-0001` (same as current but scoped per tenant)
- Add a `WHEN` guard so it only fires when `quotation_number IS NULL OR ''` (matching invoice behavior)

### 3. Add composite unique constraints
- `UNIQUE(tenant_id, invoice_number)` on `invoices`
- `UNIQUE(tenant_id, quotation_number)` on `quotations`

This ensures each tenant gets their own independent numbering sequence and the database enforces uniqueness.

## Technical Details

### Migration SQL (single migration)

**Function: `generate_invoice_number`** -- replace to scope by `NEW.tenant_id`:
```sql
WHERE tenant_id = NEW.tenant_id AND invoice_number LIKE year_prefix || '-%'
```

**Function: `generate_quotation_number`** -- replace to scope by `NEW.tenant_id`:
```sql
WHERE tenant_id = NEW.tenant_id AND quotation_number LIKE year_prefix || '-%'
```

**Trigger fix** for quotations -- drop and recreate with a `WHEN` guard so user-provided numbers aren't overwritten:
```sql
WHEN (NEW.quotation_number IS NULL OR NEW.quotation_number = '')
```

**Unique constraints**:
```sql
ALTER TABLE invoices ADD CONSTRAINT uq_invoices_tenant_number UNIQUE (tenant_id, invoice_number);
ALTER TABLE quotations ADD CONSTRAINT uq_quotations_tenant_number UNIQUE (tenant_id, quotation_number);
```

### No code changes needed
The frontend already passes `invoice_number: ""` and `quotation_number: ""` to let the trigger generate numbers. The trigger logic change is fully backend-side.

### Impact on existing data
- Existing records are unaffected (numbers stay as-is)
- The unique constraint will only fail if there are already duplicate `(tenant_id, number)` pairs -- which is unlikely since most setups are single-tenant today
