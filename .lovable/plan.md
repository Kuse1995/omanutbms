

# 5-Day Grace Period Timer with Tenant Deletion

## Overview
When a tenant's subscription expires and becomes `inactive`, start a 5-day countdown. If they pay within 5 days, the timer resets. If 5 days pass without payment, the tenant and all their data are permanently deleted.

## Database Changes

### 1. Add `deactivated_at` column to `business_profiles`
- `deactivated_at TIMESTAMPTZ DEFAULT NULL` — set when billing_status changes to `inactive`, cleared when it changes back to `active`
- This column drives the 5-day countdown calculation

### 2. Migration: auto-set `deactivated_at` via trigger
- On UPDATE of `business_profiles`, if `billing_status` changes to `inactive`, set `deactivated_at = NOW()`
- If `billing_status` changes to `active` or `trial`, set `deactivated_at = NULL`
- Backfill: set `deactivated_at = NOW()` for all currently inactive tenants that have `deactivated_at IS NULL`

## Edge Function: `purge-expired-tenants`

A new edge function (called daily by cron) that:
1. Finds tenants where `billing_status = 'inactive'` AND `deactivated_at < NOW() - 5 days`
2. For each, cascading delete: `DELETE FROM tenants WHERE id = tenant_id` (cascades to tenant_users, business_profiles, inventory, sales, invoices, etc.)
3. Logs deleted tenant IDs

## Frontend: Countdown Timer in SubscriptionActivationGate

### `SubscriptionActivationGate.tsx`
- Read `deactivated_at` from `businessProfile`
- Calculate days/hours remaining from `deactivated_at + 5 days`
- Display a red countdown banner: "Your account will be permanently deleted in X days Y hours if payment is not received"
- If < 24 hours, show hours instead of days with urgent styling

### `DashboardHome.tsx`
- Show the same countdown in the payment required banner for non-owner users

## Payment Clears Timer

The existing payment confirmation flow (in `SubscriptionPaymentsManager` and Lenco webhook) already sets `billing_status = 'active'`. The new trigger will automatically clear `deactivated_at` when this happens, stopping the countdown.

## Files to Create/Modify
- **Migration**: Add `deactivated_at` column + trigger to auto-manage it
- **`supabase/functions/purge-expired-tenants/index.ts`**: New edge function for deletion
- **Cron job** (via insert tool): Schedule daily purge
- **`src/components/dashboard/SubscriptionActivationGate.tsx`**: Add countdown timer UI
- **`src/components/dashboard/DashboardHome.tsx`**: Add countdown to inactive banner
- **`src/hooks/useTenant.tsx`**: Ensure `deactivated_at` is exposed in `BusinessProfile` interface

## Cascade Safety
The `tenants` table already has `ON DELETE CASCADE` on `tenant_users`. We need to verify other tables cascade properly or use the edge function to delete in order (inventory, sales, invoices, expenses, etc. → business_profiles → tenants).

