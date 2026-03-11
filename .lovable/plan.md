

# Fix: Stock Not Reducing When Invoicing

## Problem

The `InvoiceFormModal` and `QuotationToInvoiceModal` only deduct stock from the global `inventory` table. In a multi-branch setup, stock is displayed from `branch_inventory`, so the deduction appears to have no effect. The `SalesRecorder` already handles this correctly by checking for multi-branch and deducting from `branch_inventory` when active.

## Root Cause

In `InvoiceFormModal.tsx` (lines 344-358), stock deduction does:
```typescript
// Only updates global inventory — branch_inventory is untouched
await supabase.from('inventory').update({ current_stock: newStock }).eq('id', item.productId);
```

The same issue exists in `QuotationToInvoiceModal.tsx` (lines 222-242) and `OrderToInvoiceModal.tsx`.

## Fix

Mirror the `SalesRecorder` pattern in all three invoice creation flows:

### 1. `InvoiceFormModal.tsx`
- Import `useBranch` hook and `useBusinessConfig` to detect multi-branch mode
- In the stock deduction block (line 344-358), add branch-aware logic:
  - If multi-branch enabled and a branch is active: deduct from `branch_inventory` using `branch_id` + `inventory_id`
  - Else: deduct from global `inventory` (existing behavior)
- Also record a `stock_movements` entry for audit trail

### 2. `QuotationToInvoiceModal.tsx`
- Same change: import branch context, add branch-aware deduction in the stock loop (lines 222-242)

### 3. `OrderToInvoiceModal.tsx`
- This modal doesn't currently deduct stock (it's for custom orders/services), so no change needed unless products are involved

### Key code pattern (from SalesRecorder)
```typescript
if (isMultiBranchEnabled && currentBranch) {
  await supabase
    .from('branch_inventory')
    .update({ current_stock: newStock })
    .eq('inventory_id', item.productId)
    .eq('branch_id', currentBranch.id);
} else {
  await supabase
    .from('inventory')
    .update({ current_stock: newStock })
    .eq('id', item.productId);
}
```

### Files to modify
- `src/components/dashboard/InvoiceFormModal.tsx`
- `src/components/dashboard/QuotationToInvoiceModal.tsx`

