

# Final Verification: All 7 Issues - Status Report

## Issue 1: Credit Sales / Risk Adjustment -- FULLY FIXED
- Risk adjustment section is collapsible, collapsed by default, labeled "(Optional - Internal only)"
- Checkout works with 0 risk adjustment -- no blocker
- Customer name validation for credit sales shows clear messaging

## Issue 2: Cross-Branch Stock Selling -- FULLY FIXED
- Branch isolation guard at line 631: blocks non-admin users if `currentBranch.id !== userBranchId`
- "All Branches" view already blocked at line 625
- `BranchSelector` already restricts non-admin users to their assigned branch via `accessibleBranches` filter
- Inventory fetch scoped to `currentBranch` so other branch stock is not even loaded

## Issue 3: Invoice Number Search -- FULLY FIXED
- Search input filters by invoice number, client name, and email (lines 136-146)
- Status filter dropdown supports all statuses
- Client groups auto-expand when searching (lines 172-176)

## Issue 4: Email on Sales Receipt -- FULLY FIXED
- Edge function `send-sales-receipt` deployed with Resend API
- `RESEND_API_KEY` secret is configured
- "Email" button in `SalesReceiptModal` (lines 347-361) visible when `customerEmail` exists
- Calls `supabase.functions.invoke('send-sales-receipt')` with receipt data
- Shows toast on success/failure

**One potential issue**: The edge function sends from `onboarding@resend.dev` (Resend sandbox). Emails will only deliver to the Resend account owner's email in sandbox mode. To send to any customer, a custom domain must be verified in Resend. This is likely why the user reported "the person didn't receive an email." This is a Resend configuration issue, not a code bug.

**Recommendation**: Inform the user that email delivery in sandbox mode only works to the account owner's email. To send to customers, they need to verify their domain in Resend and update the `from` address in the edge function.

## Issue 5: Partial Payments -- FULLY FIXED
- "Initial Payment (Optional)" field added for credit sales (lines 1474-1492)
- Invoice creation uses `initialPayment` to set `paid_amount` and status `'partial'` (lines 747-748)
- InvoicesManager shows balance due and prominent "Pay" button
- `ReceiptModal` already supported recording partial payments

**One minor gap**: At line 802, the receipt data after credit sale sets `amountPaid: 0` instead of `amountPaid: initialPayment`. This means the receipt won't reflect the initial payment made. This should be `amountPaid: initialPayment`.

## Issue 6: Returns and Damages Search -- FULLY FIXED
- Date range pickers (dateFrom/dateTo) added to UI
- Server-side filtering applied via `.gte()` and `.lte()` on `created_at` (lines 94-99)
- Text search filters by product name, SKU, customer name, and reason
- `filteredAdjustments` computed correctly before rendering

## Issue 7: Grouped Sales on One Receipt -- FULLY FIXED
- `GroupedSale` interface groups transactions by `receipt_number`
- Recent sales table shows expandable rows with item count badges
- Multi-item receipts show combined total with per-item breakdown
- Receipt generation via `handleGenerateGroupedReceipt` uses all grouped items

---

## Remaining Fix Needed

Only one small bug was found:

**File**: `src/components/dashboard/SalesRecorder.tsx`, line 802
**Bug**: After a credit sale with an initial payment, the receipt shows `amountPaid: 0` instead of the actual initial payment amount.
**Fix**: Change `amountPaid: 0` to `amountPaid: initialPayment` so the receipt correctly reflects any upfront payment made.

**Email delivery note**: The `send-sales-receipt` edge function uses `from: 'Sales <onboarding@resend.dev>'` which is Resend's sandbox sender. In sandbox mode, emails only deliver to the Resend account owner's verified email address. To send receipts to any customer email, a custom sending domain must be verified in the Resend dashboard, and the `from` address in the edge function updated to match (e.g., `sales@yourdomain.com`).

