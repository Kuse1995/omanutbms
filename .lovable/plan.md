
# Stock Intake Enhancement Plan

## Overview

This plan enhances the Stock Intake workflow with four key improvements:
1. **Vendors Lookup Table** - Create and manage vendor records for restocking
2. **Invoice/Quotation Attachments** - Attach documents to restock entries  
3. **Bulk Upload Progress Indicator** - Show granular status for each item being processed
4. **Transfer Confirmation Rule** - Only receiving location users can mark transfers complete

---

## Task 1: Create Vendors Lookup Table

### Database Changes
Create a new `vendors` table to store vendor/supplier information:

```sql
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

Add `vendor_id` column to `restock_history`:
```sql
ALTER TABLE public.restock_history 
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id);
```

### UI Changes

**RestockModal.tsx**:
- Add a vendor selection combobox with search/filter
- Include "Add New Vendor" option that shows inline fields to create a new vendor on-the-fly
- Display vendor name in the notes section automatically

---

## Task 2: File Upload for Restock Documents

### Database Changes
Add columns to `restock_history` for document attachments:

```sql
ALTER TABLE public.restock_history 
ADD COLUMN invoice_url TEXT,
ADD COLUMN quotation_url TEXT;
```

### Storage Setup
Use the existing `product-documents` public bucket for restock attachments. Files will be stored at path: `restock/{tenant_id}/{restock_id}/filename`.

### UI Changes

**RestockModal.tsx**:
- Add a file upload section below the notes field
- Allow uploading Invoice and/or Quotation files (PDF, images)
- Show uploaded file names with download/remove links
- Display a "Documents attached" indicator in restock history

---

## Task 3: Improved Bulk Upload Progress Indicator

### Current Behavior
The `InventoryImportModal.tsx` already shows an overall percentage progress bar during import, but doesn't provide per-item status visibility.

### Enhancements

**InventoryImportModal.tsx**:
- Add a "processing log" panel that shows real-time status for each item:
  - Item name/SKU being processed
  - Success/failure status with icon
  - Error message if failed
- Show a running count: "Processing item 5 of 50..."
- Keep the existing progress bar but add more granular feedback below it
- Auto-scroll the log to show the latest item being processed

**Visual Design**:
```
┌────────────────────────────────────────┐
│  Importing... 24%                      │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                        │
│  Processing item 12 of 50...           │
│  ┌────────────────────────────────────┐│
│  │ ✓ PROD-001 - Widget A    Added    ││
│  │ ✓ PROD-002 - Widget B    Updated  ││
│  │ ✓ PROD-003 - Gadget C    Added    ││
│  │ ⟳ PROD-004 - Item D      Processing││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

---

## Task 4: Transfer Confirmation Rule - Receiving Location Only

### Business Logic
Only users assigned to the **receiving location** (target branch) should be able to mark a transfer as "Complete". This prevents unauthorized stock acceptance.

### Current Behavior
Currently, any admin/manager can complete any transfer via the `handleComplete` function in `StockTransfersManager.tsx`.

### Implementation

**Database Changes**:
Create a helper function to check if user is assigned to a branch:
```sql
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_branch(_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND (
        branch_id = _branch_id 
        OR can_access_all_branches = true
      )
  )
$$;
```

Modify the `complete_stock_transfer` function to validate the user:
```sql
-- Add validation at the start of complete_stock_transfer:
IF NOT public.user_is_assigned_to_branch(v_transfer.to_branch_id) 
   AND NOT public.is_tenant_admin_or_manager(v_transfer.tenant_id) THEN
  RAISE EXCEPTION 'Only users at the receiving location can complete this transfer';
END IF;
```

**StockTransfersManager.tsx**:
- Fetch the current user's `branch_id` and `can_access_all_branches` from context
- Show "Mark Complete" button only if:
  - User's `branch_id` matches `transfer.to_branch_id`, OR
  - User has `can_access_all_branches = true`, OR
  - User is an admin/manager
- Display a tooltip explaining why the button is disabled if conditions aren't met

---

## Summary of Changes

| File/Table | Changes |
|------------|---------|
| **Database: `vendors` table** | New table for vendor management |
| **Database: `restock_history`** | Add `vendor_id`, `invoice_url`, `quotation_url` columns |
| **Database: Function** | Add `user_is_assigned_to_branch()` helper |
| **Database: Function** | Update `complete_stock_transfer()` with branch validation |
| `src/components/dashboard/RestockModal.tsx` | Add vendor selector + file upload UI |
| `src/components/dashboard/InventoryImportModal.tsx` | Add per-item processing log with status indicators |
| `src/components/dashboard/StockTransfersManager.tsx` | Add receiving-location check for "Mark Complete" button |

---

## Security Considerations

- **RLS for vendors**: Tenant-scoped policies following existing patterns
- **Storage access**: Files uploaded to `product-documents` bucket (already public)
- **Transfer completion**: Backend validation ensures only authorized users can complete transfers, with client-side UX guidance

## Technical Notes

### Vendor Selection UX
- Use a combobox with search capability
- "Add new" creates vendor inline without separate modal
- Recently used vendors shown at top

### File Upload Flow
1. User selects file(s)
2. Files are uploaded to storage immediately
3. URLs are stored when restock record is saved
4. Display as clickable links in restock history
