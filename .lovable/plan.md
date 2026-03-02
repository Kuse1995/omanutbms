

# Add Cash Flow Statement to Advanced Accounting

## What We're Building
A new **"Cash Flow"** tab in the Advanced Accounting section that categorizes all cash movements into the three standard cash flow categories: **Operating Activities**, **Investing Activities**, and **Financing Activities** — following the indirect method format used in standard financial reporting.

## Data Sources (no DB changes needed)
All data already exists in the database:
- **Operating**: `sales_transactions` (cash inflows), `payment_receipts` (collections), `expenses` (outflows by category), `payroll_records` (salary payments)
- **Investing**: `assets` table (purchase_cost for acquisitions, disposal_value for disposals)
- **Financing**: Can be derived from loan-related expenses or owner contributions (future extensibility)

## Category Mapping Logic

**Operating Activities** (day-to-day business):
- *Inflows*: Product sales receipts, invoice collections (payment_receipts), service revenue
- *Outflows*: Salaries & Wages, Rent, Marketing, COGS, Other operating expenses

**Investing Activities** (long-term assets):
- *Outflows*: Asset purchases (from `assets` table — `purchase_cost` where `purchase_date` falls in range)
- *Inflows*: Asset disposals (from `assets` table — `disposal_value` where `disposal_date` falls in range)

**Financing Activities** (debt/equity):
- Categorized from expense categories containing "loan", "interest", "dividend", "owner" keywords
- Placeholder section for future loan/equity tracking

## New File: `src/components/dashboard/CashFlowStatement.tsx`
- Date range picker + quick period buttons (Last Month, Quarter, Year) — same pattern as P&L
- Three collapsible sections with line items and subtotals
- Net cash flow summary card at the bottom
- PDF export via html2canvas + jsPDF
- Real-time subscriptions on `sales_transactions`, `expenses`, `payment_receipts`, `assets`

## Modified File: `src/components/dashboard/AdvancedAccounting.tsx`
- Add a "Cash Flow" tab with `ArrowLeftRight` icon between P&L and A/R tabs

