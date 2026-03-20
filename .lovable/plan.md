

# Fix: Receipts Not Being Issued When Paying Quotation-Converted Invoices

## Problem Identified

After investigating the House of Dodo data and code, the issue is a **UX gap in the Quotations workflow**:

1. Quotations get converted to invoices correctly (all 12 converted quotations have matching invoices).
2. But converted invoices are created with `status: draft` and `paid_amount: 0`.
3. **There is no "Record Payment" button on the Quotations tab for converted quotations.** The user must navigate to a completely separate Invoices tab to find the invoice and click "Pay" there.
4. The client likely doesn't realize they need to go to a different tab. They stay on the Quotations tab expecting to pay from there.

**Evidence from database**: All 10 quotation-converted invoices for House of Dodo have `paid_amount: 0` and `status: draft`, confirming payments are NOT being recorded.

Compare with the Custom Orders workflow, which HAS a direct "Record Payment" button — that workflow works fine.

## Solution

Add a **"Record Payment" button** directly on the QuotationsManager for converted quotations, plus show payment status. This mirrors what Custom Orders already does.

### Changes to `src/components/dashboard/QuotationsManager.tsx`

1. **Import `ReceiptModal`** and add state for it (`receiptModalOpen`, `selectedInvoice`).
2. **Fetch invoice data** along with quotations: when a quotation has `converted_to_invoice_id`, fetch the linked invoice's `id`, `invoice_number`, `total_amount`, `paid_amount`, `status`.
3. **Add a "Pay" button** next to converted quotations (green button with Banknote icon), which opens the `ReceiptModal` pre-filled with the linked invoice data.
4. **Show payment status badge** on converted quotations (Paid/Partial/Balance Due) so the client can see at a glance which ones still need payment.
5. **Add a "View Invoice" button** on converted quotations for quick access.

### Changes to `src/components/dashboard/ReceiptsManager.tsx`

No changes needed — the ReceiptsManager already correctly fetches from `payment_receipts` and `sales_transactions`. Once payments are recorded via the new button, they will automatically appear in the Receipts tab.

### Accounting Impact

Once receipts start being created via `payment_receipts`, they will automatically:
- Show up in the **Receipts** tab
- Be counted in the **Accounts** dashboard (revenue source of truth)
- Appear in the **General Ledger** and **Cash Book**
- Update the **Balance Sheet**

No accounting code changes needed — all downstream reports already subscribe to `payment_receipts`.

## Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/QuotationsManager.tsx` | Add ReceiptModal integration, Pay button, payment status badges, invoice data fetching |

