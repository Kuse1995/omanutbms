

# Align PAYE Deductions with ZRA 2026 Rates

## Current State

The PAYE calculation logic in `PayrollRunModal.tsx` already matches the 2026 ZRA tax bands correctly:

| ZRA 2026 Band | Current Code | Status |
|---|---|---|
| First K5,100 at 0% | Correct | OK |
| K5,100.01 to K7,100 at 20% | Correct | OK |
| K7,100.01 to K9,200 at 30% | Correct | OK |
| K9,200.01 and above at 37% | Correct | OK |

The taxable income base is also correct: `gross - NAPSA` (NAPSA is tax-deductible per ZRA rules).

## Issues Found

Two minor inaccuracies in labels/comments:

1. **Comment says "2024"** in `PayrollRunModal.tsx` line 59 — should say "2026"
2. **Tax rate shown as "37.5%"** in the Quick Reference guide in `StatutoryTaxProvisions.tsx` — should be "37%"

## Changes

### 1. Fix comment year label
**File**: `src/components/dashboard/PayrollRunModal.tsx`
- Update comment from `// Zambian PAYE brackets (2024)` to `// Zambian PAYE brackets (2026)`

### 2. Fix displayed tax rate
**File**: `src/components/dashboard/StatutoryTaxProvisions.tsx`
- Change the Quick Reference from `Progressive (0%-37.5%)` to `Progressive (0%-37%)`

Both are single-line text fixes. No logic changes needed — the actual calculation is already correct and aligned with the ZRA 2026 PAYE calculator.

