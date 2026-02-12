

# Optional Statutory Deductions Toggle for Payroll

## Overview

Add a transparent toggle in the Payroll Run modal that allows tenants (like House of Dodo) to skip statutory deductions (NAPSA, NHIMA, PAYE) when running payroll. The key is transparency -- the system clearly labels when deductions are skipped, flags it on payslips, and records it in the payroll notes.

## How It Works

- A "Skip Statutory Deductions" switch appears at the top of the PayrollRunModal
- When toggled ON, NAPSA/NHIMA/PAYE are calculated as K0 for all employees in that run
- A prominent warning banner explains the implications
- The payroll records are saved with a clear note: "Statutory deductions waived for this pay period"
- The PayrollManager table and PayslipModal show a visible badge ("No Statutory") so it is never hidden

## Changes

### 1. PayrollRunModal.tsx -- Add toggle and conditional logic

- Add a `skipStatutory` boolean state (default: `false`)
- Add a Switch toggle with label "Skip Statutory Deductions" and an info banner explaining this means NAPSA, NHIMA, and PAYE will be set to zero
- In `calculateTotals`, when `skipStatutory` is true, set napsa/nhima/paye to 0
- In `handleSubmit`, append a note to each payroll record: "Statutory deductions were waived for this pay period"
- The summary footer still shows the deduction columns but they display K0 with a label

### 2. PayrollManager.tsx -- Show waived status

- When displaying payroll records, check if all three statutory deductions are 0 while gross pay is above the PAYE threshold (K5,100)
- Show a small "No Statutory" badge next to the status badge for those records so it is immediately visible

### 3. PayslipModal.tsx -- Indicate on payslip

- If NAPSA + NHIMA + PAYE are all 0 and gross > K5,100, show an info alert on the payslip: "Statutory deductions were waived for this pay period"

## Technical Details

- No database changes needed -- the existing `notes` column and deduction columns handle this
- No tenant-specific hardcoding -- any tenant admin can use the toggle (not restricted to House of Dodo)
- The toggle is per payroll run, not a permanent setting, so each month is an independent decision
- Transparency is maintained through: warning banner at toggle time, notes on each record, badge on the table, and alert on the payslip

