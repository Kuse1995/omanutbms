

# System Audit Status - 7 Issues Review

## Issue 1: Credit Sales / Risk Adjustment -- FIXED
**Status**: The risk adjustment section is now collapsible and collapsed by default (lines 1464-1512). It shows "(Optional - Internal only)" and only expands when clicked. The checkout button works fine with 0 risk adjustment. Customer name validation for credit sales is correct and clear.

**No further action needed.**

---

## Issue 2: Cross-Branch Stock Selling -- NEEDS WORK
**Status**: The SalesRecorder blocks sales when "All Branches" is selected, and fetches inventory for the selected branch. However, there is NO enforcement preventing a non-admin user from switching branches in the BranchSelector dropdown. A cashier at Rhodespark could switch to Kitwe and sell Kitwe's stock.

**Remaining fix**:
- In `SalesRecorder.tsx`, add a guard in `handleCheckout` that compares `currentBranch.id` against the user's assigned `userBranchId` from `useBranch()`. If they don't match and the user does NOT have `canAccessAllBranches`, block the sale with a toast.
- In `BranchSelector.tsx`, hide other branches from the dropdown for non-admin users (already partially done -- non-admin users with only 1 accessible branch see a label, but the `accessibleBranches` filter needs to be enforced more strictly so they cannot select other branches).

---

## Issue 3: Invoice Number Search -- FIXED
**Status**: Search input and status filter are both implemented (lines 300-325 of InvoicesManager). Search filters by invoice number, client name, and email. Status filter supports all statuses. Client groups auto-expand when searching.

**No further action needed.**

---

## Issue 4: Email on Sales Receipt -- NEEDS WORK
**Status**: The edge function `send-sales-receipt` exists and is deployed with Resend API integration. The `RESEND_API_KEY` secret is configured. However, the `SalesReceiptModal` UI has NO "Send Email" button -- it only has Print and Download PDF buttons (lines 302-324). The email button was never wired up.

**Remaining fix**:
- Add an "Email Receipt" button to `SalesReceiptModal.tsx` (between Print and Download PDF)
- When clicked, invoke the `send-sales-receipt` edge function with the receipt data
- Show loading state and success/failure toast
- Only show the button when `customerEmail` is provided

---

## Issue 5: Partial Payments -- PARTIALLY FIXED
**Status**: The InvoicesManager now shows a "Balance Due" under each invoice's paid amount (line 248-256) and has a visible "Pay" button (lines 420-429). The `ReceiptModal` already supports partial payments.

**Remaining fix**:
- In `SalesRecorder.tsx`, for credit sales (`credit_invoice` payment method), add an optional "Initial Payment" field so users can record a partial upfront payment at the point of sale, which would set `paid_amount` on the auto-generated invoice.

---

## Issue 6: Returns & Damages Date Search -- FIXED
**Status**: Date range picker and text search were added. The syntax error was also fixed. The `filteredAdjustments` variable correctly applies text search filtering.

**One concern**: Need to verify the date range filter is actually applied to the Supabase query (not just client-side). Will check if `dateFrom`/`dateTo` state variables are used in the `fetchAdjustments` query.

---

## Issue 7: Grouped Sales on One Receipt -- FIXED
**Status**: Recent sales are now grouped by `receipt_number` (GroupedSale interface, lines 69-80). The table shows expandable rows for multi-item receipts with item count badges and per-item breakdown. Receipt generation uses `handleGenerateGroupedReceipt`.

**No further action needed.**

---

## Implementation Plan (Remaining Work)

### 1. Wire up "Email Receipt" button in SalesReceiptModal
- File: `src/components/dashboard/SalesReceiptModal.tsx`
- Add state for `isSendingEmail`
- Add `handleSendEmail` function that calls `supabase.functions.invoke('send-sales-receipt', { body: { email, receiptNumber, customerName, items, totalAmount, paymentMethod, paymentDate, companyName } })`
- Add a Mail button in the footer actions (visible only when `customerEmail` exists)
- Show toast on success/failure

### 2. Enforce branch isolation in SalesRecorder checkout
- File: `src/components/dashboard/SalesRecorder.tsx`
- In `handleCheckout`, after the existing `!currentBranch` check, add: if user has a `userBranchId` and `!canAccessAllBranches` and `currentBranch.id !== userBranchId`, block the sale
- This is a safety net in case the BranchSelector filtering is bypassed

### 3. Tighten BranchSelector for non-admin users
- File: `src/components/dashboard/BranchSelector.tsx`
- The existing code already filters `accessibleBranches` for non-admin users. Verify the logic at line 31 correctly restricts to only the user's assigned branch. The current code looks correct -- non-admin users with a single branch see a static label, not a dropdown. This may already be sufficient.

### 4. Add optional "Initial Payment" for credit sales in SalesRecorder
- File: `src/components/dashboard/SalesRecorder.tsx`
- In the credit invoice section (after the risk adjustment), add an "Initial Payment (Optional)" input
- When checkout completes and an invoice is auto-generated, set `paid_amount` to this value and status to "partial" if > 0

### 5. Verify date filter in ReturnsAndDamagesManager query
- File: `src/components/dashboard/ReturnsAndDamagesManager.tsx`
- Confirm the `fetchAdjustments` function applies `dateFrom` and `dateTo` filters to the Supabase `.gte()` / `.lte()` query, not just client-side

### Files to modify
- `src/components/dashboard/SalesReceiptModal.tsx` (Email button)
- `src/components/dashboard/SalesRecorder.tsx` (Branch guard + initial payment for credit)
- `src/components/dashboard/BranchSelector.tsx` (Verify enforcement)
- `src/components/dashboard/ReturnsAndDamagesManager.tsx` (Verify date query)
