

# System Audit: 7 Issues - Diagnosis and Fixes

## Issue 1: Credit Sales Blocked by Risk Adjustment
**Problem**: When selecting "Credit (Invoice)" as payment method, the risk adjustment section appears and requires input, making users think they must fill it in to proceed. The risk adjustment is optional but its prominent placement creates confusion.

**Root Cause**: The risk adjustment UI is always shown for credit sales (lines 1385-1419 of SalesRecorder.tsx). It is technically optional (defaults to 0), so the sale should complete. The actual blocker may be the customer name validation at line 589 (`paymentMethod === "credit_invoice" && !customerName.trim()`). Need to verify this isn't the real block.

**Fix**:
- Make the risk adjustment section collapsible and collapsed by default (hidden behind a toggle like "Add risk adjustment?")
- Ensure the checkout button works with risk adjustment at 0 (no mandatory field)
- Verify the customer name requirement is clearly communicated (it is required for credit sales, which is correct)

---

## Issue 2: Cross-Branch Stock Selling
**Problem**: Branch A (e.g., Rhodespark) can sell Branch B's (e.g., Kitwe) stock. Branches should see other branches' stock for visibility but must only sell their own.

**Root Cause**: In `fetchInventory()` (lines 252-299), when multi-branch is enabled AND a specific branch is selected, it correctly filters by `branch_id`. However, the `handleCheckout` only blocks sales when `!currentBranch` (All Branches view). A user at Branch A who somehow sees Branch B's stock could sell it.

The deeper issue is that inventory is fetched only for the `currentBranch`, so the product dropdown already restricts to the current branch. The real fix needed is:
- Ensure non-admin users cannot switch to other branches in BranchSelector
- The current `useBranch` hook allows admins to see all branches. Non-admin users with a `branch_id` should be locked to their branch.

**Fix**:
- In `BranchSelector`, restrict non-admin users (those with a `branch_id` and `!canAccessAllBranches`) from switching to other branches
- Add server-side validation: verify `branch_id` matches the user's assigned branch in the checkout flow
- Ensure the SalesRecorder's `fetchInventory` always uses the user's assigned branch for non-admin users, ignoring any `currentBranch` override

---

## Issue 3: Invoice Number Search
**Problem**: There is no way to search invoices by invoice number in the InvoicesManager.

**Root Cause**: `InvoicesManager.tsx` groups invoices by client in collapsible sections but has no search/filter input field.

**Fix**:
- Add a search input at the top of InvoicesManager that filters by invoice number, client name, or status
- Auto-expand client groups that contain matching invoices
- Include a status filter dropdown alongside the search

---

## Issue 4: Email on Sales Receipt Not Working
**Problem**: Entering a customer email on the sales receipt does not trigger any email delivery.

**Root Cause**: The `SalesReceiptModal` component collects `customerEmail` as a prop but **never sends an email**. It only displays the email on the receipt and allows PDF download/print. There is no edge function or integration to email the receipt to the customer.

**Fix**:
- Create a new edge function `send-sales-receipt` that takes receipt data and emails a formatted receipt to the customer using the Resend API
- Add a "Send via Email" button to the `SalesReceiptModal` that triggers this function when a customer email is present
- Show a confirmation toast when sent successfully

---

## Issue 5: Partial Payments for Credit Customers and Suppliers
**Problem**: Credit customers don't pay in full. The system needs to support partial payments visibly, not just discounts. Similarly, supplier payments need partial payment tracking.

**Root Cause**: The `ReceiptModal` already supports partial payments correctly (lines 82-160). It calculates `balanceDue`, allows partial `amountPaid`, and updates invoice status to "partial" or "paid" accordingly. The issue is **discoverability** - users may not know to use the Receipt (payment) button on invoices.

**Fix**:
- In the InvoicesManager, make the "Record Payment" button more prominent (currently a small icon) with clearer labeling
- Add a "Balance Due" column to the invoice table for quick visibility
- Add an "Amount Paid" field in the SalesRecorder checkout for credit sales (allow a partial upfront payment at the point of sale)
- For supplier payments: add partial payment tracking to the AccountsPayable/ExpenseModal (similar to how invoices handle it)

---

## Issue 6: Date Search for Returns and Damages
**Problem**: The Returns and Damages page has type/status filters but no date filter. Users cannot search for adjustments from specific periods (e.g., 2025). Canceling an invoice requires finding the original sale, which is difficult without date search.

**Root Cause**: `ReturnsAndDamagesManager.tsx` (lines 352-377) only has type and status filters. No date range picker exists.

**Fix**:
- Add a date range picker (from/to) to the filter bar in ReturnsAndDamagesManager
- Apply the date filter to the Supabase query using `.gte()` and `.lte()` on `created_at`
- Add a text search field for product name or customer name

---

## Issue 7: Multiple Items Appearing as Individual Sales Instead of One Receipt
**Problem**: When selling 5 items to one customer, each item creates a separate `sales_transactions` row, making them appear as 5 separate sales in the recent sales table, instead of grouped under one receipt.

**Root Cause**: In `handleCheckout()` (lines 607-681), each cart item is inserted as a separate row in `sales_transactions`. They share the same `receipt_number` (line 628), but the recent sales display (lines 1508+) lists them individually without grouping by receipt number.

**Fix**:
- Group the "Recent Sales" table by `receipt_number` so multi-item sales appear as a single row
- Show the total for the group, with the ability to expand to see individual items
- When generating a receipt for a past sale, fetch all items with the same `receipt_number` instead of just the single item

---

## Technical Implementation Plan

### Phase 1: Critical Fixes (Issues 1, 2, 7)
1. **SalesRecorder.tsx** - Make risk adjustment collapsible/optional by default for credit sales
2. **SalesRecorder.tsx** - Add branch ownership validation in checkout; lock non-admin users to their branch
3. **SalesRecorder.tsx** - Group recent sales by `receipt_number` in the display table

### Phase 2: Search and Filters (Issues 3, 6)
4. **InvoicesManager.tsx** - Add search input for invoice number, client name, status filter
5. **ReturnsAndDamagesManager.tsx** - Add date range picker and text search to filters

### Phase 3: Payment and Email (Issues 4, 5)
6. **Create `send-sales-receipt` edge function** - Email receipts via Resend API
7. **SalesReceiptModal.tsx** - Add "Email Receipt" button
8. **InvoicesManager.tsx** - Make Record Payment button more prominent, add Balance Due column
9. **SalesRecorder.tsx** - Allow partial upfront payment for credit sales

### Files to Modify
- `src/components/dashboard/SalesRecorder.tsx` (Issues 1, 2, 7)
- `src/components/dashboard/InvoicesManager.tsx` (Issues 3, 5)
- `src/components/dashboard/ReturnsAndDamagesManager.tsx` (Issue 6)
- `src/components/dashboard/SalesReceiptModal.tsx` (Issue 4)
- `supabase/functions/send-sales-receipt/index.ts` (New - Issue 4)
- `supabase/config.toml` (Issue 4 - register new function)

### Database Changes
- No schema changes required. All fixes are frontend logic and a new edge function.

