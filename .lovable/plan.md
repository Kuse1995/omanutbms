

# Revised: Sales/POS Module Update

## Summary of User Corrections

1. **Quotations Access**: Sales agents and cashiers currently can't create quotations because quotations are nested inside the "Accounts" tab (which they don't have access to). We need to add a "quotations" module key to give them sidebar access.

2. **Risk Adjustment Display**: The customer SHOULD see the final increased total (standard + markup) as the amount to pay. They just shouldn't know it was increased from a standard price. The invoice shows a single total without revealing the markup breakdown.

---

## Task 1: Allow Sales Agents and Cashiers to Access Quotations

### Problem
- Quotations live inside `AccountsAgent.tsx` which renders in the "accounts" tab
- `sales_rep` and `cashier` roles do NOT have "accounts" in their module access
- Therefore, they cannot create quotations

### Solution
Add a new "quotations" module key and create a dedicated Quotations tab accessible to sales roles.

**Files to Modify:**

**1. `src/lib/role-config.ts`**
- Add "quotations" to `ModuleKey` type
- Add "quotations" to `sales_rep` and `cashier` module access arrays

```typescript
export type ModuleKey = 
  | "dashboard" 
  | "sales" 
  | "receipts"
  | "quotations"  // ← NEW
  | "accounts" 
  // ...

export const roleModuleAccess: Record<AppRole, ModuleKey[]> = {
  // ...
  sales_rep: [
    "dashboard", "sales", "receipts", "quotations", "inventory", "returns"  // ← Added quotations
  ],
  cashier: [
    "dashboard", "sales", "receipts", "quotations"  // ← Added quotations
  ],
  // ...
};
```

**2. `src/pages/Dashboard.tsx`**
- Add "quotations" to `DashboardTab` type and `validTabs` array
- Add case for rendering `QuotationsManager` component

**3. `src/components/dashboard/DashboardSidebar.tsx`**
- Add quotations to `baseMenuItems` with appropriate icon (FileText)
- Add quotations to the "Sales & Finance" category

---

## Task 2: Add Risk Adjustment for Credit Sales

### Requirements (Revised)
- The customer sees the **final total** (standard + adjustment) as the amount to pay
- The customer does NOT see any "risk adjustment" line item or breakdown
- The internal system tracks the adjustment separately for accounting purposes
- The invoice shows: Items, Subtotal, Tax, **Total Due** (which includes hidden adjustment)

### Database Changes
Add columns to track the internal adjustment:

```sql
ALTER TABLE invoices 
ADD COLUMN risk_adjustment_amount numeric DEFAULT 0,
ADD COLUMN risk_adjustment_notes text;

COMMENT ON COLUMN invoices.risk_adjustment_amount 
IS 'Internal markup for credit risk - included in total_amount but not itemized on customer documents';
```

### UI Changes

**File: `src/components/dashboard/InvoiceFormModal.tsx`**
- Add a collapsible "Credit Risk Adjustment" section (only visible for non-paid invoices)
- Fields:
  - Adjustment Amount (currency input)
  - Internal Notes (optional)
- Calculate `total_amount = subtotal + tax_amount + risk_adjustment_amount`
- Store the adjustment in the new column

**File: `src/components/dashboard/InvoiceViewModal.tsx`**
- Display the full `total_amount` to the customer (which includes adjustment)
- Do NOT show any "Risk Adjustment" line
- Show: Items → Subtotal → Tax → **Total Due**

### Example Flow
1. Seller creates invoice with items totaling K1,000
2. Tax (16%) adds K160 → K1,160
3. Seller adds K100 risk adjustment for credit sale
4. Database stores: `subtotal: 1000, tax_amount: 160, risk_adjustment_amount: 100, total_amount: 1260`
5. Customer sees invoice: Items (K1,000) + Tax (K160) = **Total Due: K1,260**
6. Customer doesn't know the "real" total would have been K1,160

---

## Task 3: Show Tax on All Credit Invoices

For transparency with credit customers, ensure the tax breakdown is always visible.

**File: `src/components/dashboard/InvoiceViewModal.tsx`**
- Always show the tax line for credit invoices (status: draft, sent, partial, overdue)
- Even if tax rate is 0%, show "VAT (0%): K0" for clarity

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `risk_adjustment_amount` and `risk_adjustment_notes` columns to `invoices` |
| `src/lib/role-config.ts` | Add "quotations" module key; grant access to `sales_rep` and `cashier` |
| `src/pages/Dashboard.tsx` | Add "quotations" tab routing to `QuotationsManager` |
| `src/components/dashboard/DashboardSidebar.tsx` | Add quotations menu item in Sales & Finance category |
| `src/components/dashboard/InvoiceFormModal.tsx` | Add hidden Risk Adjustment input for credit sales |
| `src/components/dashboard/InvoiceViewModal.tsx` | Show full total (with adjustment), always show tax line for credit invoices |

---

## Technical Notes

### Risk Adjustment Math
```
display_subtotal = sum of line items (standard prices)
display_tax = subtotal × tax_rate
display_total = subtotal + tax + risk_adjustment  ← Customer sees this
                ↑ Customer doesn't know this includes an adjustment
```

### Accounting Impact
- Revenue reports will reflect the actual `total_amount` collected
- The `risk_adjustment_amount` column allows internal analysis of credit premiums
- When customer pays, they pay the full `total_amount`

### Role Access After Changes
| Role | Can Access Quotations? |
|------|----------------------|
| Admin | ✅ Yes |
| Manager | ✅ Yes |
| Accountant | ✅ Yes (via Accounts) |
| Sales Rep | ✅ Yes (NEW) |
| Cashier | ✅ Yes (NEW) |
| Viewer | ❌ No |

