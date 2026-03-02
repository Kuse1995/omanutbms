

# Add Account-Based Money Tracking by Payment Method

## The Problem
Currently, the accounting system lumps all revenue into a single "cash" figure. When a sale is made via Cash, Mobile Money, Bank Transfer, or Card, there's no visibility into which account the money sits in. Users can't see how much is in their bank vs. mobile money wallet vs. cash register.

## What We're Building
A new **"Account Balances"** tab in Advanced Accounting that breaks down money by payment method/account type. Plus, updates to the General Ledger, Balance Sheet, and Cash Book to reflect account-specific entries.

### 1. New Component: `AccountBalancesDashboard.tsx`
A dedicated tab showing:
- **Summary cards** for each account type: Cash, Mobile Money, Bank, Card — each showing total inflows, outflows, and current balance
- **Detailed transaction table** filtered by account, showing every receipt/sale/expense that flowed through that account
- Date range filtering and PDF export

Account types derived from existing `payment_method` values in the database:
- `cash` / `Cash` → **Cash Account**
- `mobile_money` → **Mobile Money Account**
- `bank_transfer` → **Bank Account**
- `card` → **Card Account**
- `credit_invoice` → **Accounts Receivable** (already tracked)

### 2. Update: `GeneralLedger.tsx`
- Change the `account` field from generic "Revenue - Product Sales" to payment-method-specific accounts:
  - Cash sale → "Cash Account"
  - Mobile Money sale → "Mobile Money Account"
  - Bank Transfer sale → "Bank Account"
  - Card sale → "Card/POS Account"
- Same for payment receipts — show which account received the money

### 3. Update: `BalanceSheet.tsx`
- Break the single `cash` line item into sub-accounts:
  - Cash on Hand
  - Mobile Money Balance
  - Bank Balance
  - Card/POS Receivable
- Each calculated by summing inflows minus outflows per payment method

### 4. Update: `AdvancedAccounting.tsx`
- Add new "Account Balances" tab with a `Landmark` icon

### 5. Update: `CashBook.tsx`
- Add a payment method filter dropdown so users can view the cash book for a specific account (e.g., only Mobile Money transactions)

## No Database Changes Required
All data already exists — `sales_transactions.payment_method` and `payment_receipts.payment_method` contain the account classification. This is purely a frontend aggregation change.

## Files to Create
- `src/components/dashboard/AccountBalancesDashboard.tsx`

## Files to Modify
- `src/components/dashboard/AdvancedAccounting.tsx` — add tab
- `src/components/dashboard/GeneralLedger.tsx` — payment-method-specific accounts
- `src/components/dashboard/BalanceSheet.tsx` — break cash into sub-accounts
- `src/components/dashboard/CashBook.tsx` — add payment method filter

