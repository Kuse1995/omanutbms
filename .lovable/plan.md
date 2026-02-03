
# Fix Invoice Generation Error and Custom Order Quotations

## Issues Found

### Issue 1: Invoice Generation Error
**Error**: `column "record_id" is of type uuid but expression is of type text`

**Root Cause**: The audit trigger function `audit_table_insert()` was recently modified to cast `NEW.id::text`, but the `audit_log.record_id` column is defined as `UUID`. When an invoice is created, the trigger fires and tries to insert a text value into a UUID column, causing the error.

**Solution**: Fix the audit trigger functions to remove the `::text` cast since `record_id` expects a UUID directly.

### Issue 2: Custom Order Quotations Not Appearing
**Root Cause**: When a custom order is created via the Custom Design Wizard, it only inserts a record into `custom_orders` with a `quoted_price`. However:
- No corresponding record is created in the `quotations` table
- The `QuotationsManager` fetches from the `quotations` table only
- The `quotation_id` column on `custom_orders` is never populated

**Solution**: When a custom order is confirmed with a quoted price, automatically create a linked quotation record.

---

## Implementation Plan

### Phase 1: Fix Audit Trigger Functions (Database)

Update the three audit functions to remove the erroneous `::text` cast:

```sql
-- Fix INSERT trigger
CREATE OR REPLACE FUNCTION public.audit_table_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_data, changed_by, tenant_id
  ) VALUES (
    TG_TABLE_NAME, 
    NEW.id,  -- Remove ::text cast
    'INSERT', 
    to_jsonb(NEW), 
    auth.uid(),
    NEW.tenant_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix UPDATE trigger  
CREATE OR REPLACE FUNCTION public.audit_table_update()
-- Similar fix: NEW.id instead of NEW.id::text

-- Fix DELETE trigger
CREATE OR REPLACE FUNCTION public.audit_table_delete()
-- Similar fix: OLD.id instead of OLD.id::text
```

### Phase 2: Link Custom Orders to Quotations

Update `CustomDesignWizard.tsx` to create a quotation record when an order is confirmed:

**On Order Confirmation (handleSubmit):**
1. Create a `quotations` record with the quoted price and customer details
2. Store the quotation ID in the custom order's `quotation_id` field
3. The quotation will now appear in QuotationsManager

**On Draft Save (handleSaveDraft):**
- Create/update a draft quotation if a quoted price is set
- Mark status as "draft" so it's distinguishable from confirmed quotes

**Key Fields to Populate:**
| Quotations Field | Source |
|------------------|--------|
| `quotation_number` | Auto-generated (or use order number) |
| `client_name` | Customer name from form |
| `client_email` | Customer email |
| `client_phone` | Customer phone |
| `quotation_date` | Current date |
| `valid_until` | Collection date or due date + 30 days |
| `status` | "sent" for confirmed, "draft" for drafts |
| `subtotal` | `quoted_price` |
| `total_amount` | `quoted_price` |

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Database Migration** | Fix audit trigger functions to use UUID directly |
| `src/components/dashboard/CustomDesignWizard.tsx` | Add quotation creation logic in `handleSubmit` and `handleSaveDraft` |

---

## Expected Results

After implementation:
1. Invoice generation from custom orders will work without errors
2. All audited table operations will work correctly  
3. Custom order quotes will appear in the Quotations section
4. Users can track quotes and convert them to invoices from either location
