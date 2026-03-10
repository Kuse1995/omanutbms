

# Fix: Job Card Customer Details Cannot Be Amended

## Problem
The Job Card modal's "Customer" tab only has a dropdown to select an existing customer and a complaint textarea. There are **no text fields** to enter or edit a customer name or phone number. This means:
- Walk-in customers can't have their name/phone recorded on the job card
- If a customer's details need correcting, the user has to go edit the customer record separately
- There's no way to override or amend customer info directly on the job card

## Fix

**Database**: Add `customer_name` and `customer_phone` text columns to the `job_cards` table (nullable, for walk-in overrides or direct entry).

**UI** (`JobCardModal.tsx`): Add editable "Customer Name" and "Customer Phone" text fields below the customer dropdown on the Customer tab.
- When a customer is selected from the dropdown, auto-fill these fields with their name/phone
- Fields remain editable so the user can override or correct details
- For walk-ins (no customer selected), these fields capture the customer info directly
- Both fields are saved to the `job_cards` table

**List** (`JobCardsManager.tsx`): Show `customer_name` from the job card itself (falling back to the joined customer record).

## Files
1. **Database migration** -- `ALTER TABLE job_cards ADD COLUMN customer_name text; ADD COLUMN customer_phone text;`
2. **`src/components/dashboard/JobCardModal.tsx`** -- Add name/phone inputs to Customer tab, auto-fill on dropdown change, include in save payload
3. **`src/components/dashboard/JobCardsManager.tsx`** -- Display `customer_name`/`customer_phone` from the job card record with fallback to joined customer data

