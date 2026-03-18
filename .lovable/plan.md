

# Add Missing Fields to Payslip

## Problem
The payslip is missing several fields that are stored in the payroll record:
- **NHIMA deduction** (1% of gross) -- calculated and saved but not displayed
- **Employee ID / position** -- no employee reference number shown
- **Payment method & reference** -- not shown on the payslip
- **Notes** -- statutory waiver notes not displayed
- **Employer contributions** section -- NAPSA employer (5%) and NHIMA employer (1%) are standard on Zambian payslips but not shown

## Changes

### `src/components/dashboard/PayslipModal.tsx`

1. **Update `PayrollRecord` interface** to include:
   - `nhima_deduction` (number, optional for backward compat)
   - `payment_method` (string | null)
   - `payment_reference` (string | null)
   - `notes` (string | null)
   - `employee_type` (string, optional)

2. **Add NHIMA row** in the Deductions table between NAPSA and PAYE:
   - "NHIMA (1%)" -- `K{nhima_deduction}`

3. **Add Employee Details section** enhancements:
   - Show Employee ID if available
   - Show Payment Method and Reference if available

4. **Add Employer Contributions section** (informational, standard on Zambian payslips):
   - NAPSA Employer (5%): same as employee NAPSA amount
   - NHIMA Employer (1%): same as employee NHIMA amount
   - Displayed as a separate informational block below deductions

5. **Show notes** if present (e.g., statutory waiver warnings)

## Files to Modify
- `src/components/dashboard/PayslipModal.tsx` -- add missing fields to interface and render them

