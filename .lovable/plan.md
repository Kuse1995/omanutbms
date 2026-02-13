

# Enable Clean Deletion of Records with Linked Data

## The Problem

When House of Dodo (or any tenant) tries to delete test data like invoices, sales, or quotations, the database blocks it because other records reference them. Currently, some of these links use "NO ACTION" — meaning the database simply refuses the delete.

## The Approach: Smart Cascading

Rather than cascading everything blindly (which could cause unexpected data loss), the fix uses two strategies:

| Strategy | When to use | Example |
|---|---|---|
| CASCADE (delete child too) | The child record only makes sense with its parent | Invoice items, payment receipts, sale items |
| SET NULL (unlink only) | The child is an independent record that should survive | Custom orders linked to a quotation, cross-references between invoices and quotations |

## What Changes

### Records that will be deleted along with their parent (CASCADE)

| When you delete... | These get deleted too | Why |
|---|---|---|
| An invoice | Payment receipts for that invoice | Receipts are proof-of-payment for that specific invoice -- no invoice, no receipt |
| A sale | Related inventory adjustments (returns/damages) get unlinked | Adjustments reference the original sale loosely |

### Records that will be unlinked but kept (SET NULL)

| When you delete... | These keep existing but lose their link |
|---|---|
| An invoice | Quotation's "converted_to_invoice" reference is cleared |
| A quotation | Invoice's "source_quotation" reference is cleared |
| A sale | Inventory adjustment's "original_sale" reference is cleared |
| A custom order | Other custom orders referencing it as "original_order" are cleared |
| An employee | Custom order "assigned_tailor" and adjustment "attended_by" references are cleared |

### Already working correctly (no changes needed)

These are already properly cascading or unlinking:
- Invoice items cascade with invoice
- Quotation items cascade with quotation
- Sale items cascade with sale
- Custom order items and adjustments cascade with the order
- Employee attendance and documents cascade with employee
- Payroll records cascade with employee
- Agent transactions unlink from deleted invoices
- Job cards unlink from deleted invoices/quotations

## Technical Details

A single database migration that alters 7 foreign key constraints:

**Change to CASCADE (child deleted with parent):**
1. `payment_receipts.invoice_id` -- NO ACTION to CASCADE

**Change to SET NULL (unlink only):**
2. `quotations.converted_to_invoice_id` -- NO ACTION to SET NULL
3. `invoices.source_quotation_id` -- NO ACTION to SET NULL
4. `inventory_adjustments.original_sale_id` -- NO ACTION to SET NULL
5. `custom_orders.original_order_id` -- NO ACTION to SET NULL
6. `custom_orders.assigned_tailor_id` -- NO ACTION to SET NULL
7. `custom_order_adjustments.attended_by` -- NO ACTION to SET NULL

Each constraint is dropped and recreated with the new rule. No frontend code changes needed.

