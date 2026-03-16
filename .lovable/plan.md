

# Fix Subscription Lifecycle: Payment Activation + Auto-Expiry

## Problem Analysis

Looking at the live data, I found these issues:

1. **THINKTECH AUTO SERVICE** has `billing_status: active` but their payment record is still `pending` -- someone updated `business_profiles` directly, bypassing the payment confirmation flow. Their billing expired Feb 25 but status is still "active".

2. **No auto-expiry mechanism exists** -- there is no edge function or cron job to deactivate subscriptions when `billing_end_date` passes. Expired tenants stay "active" indefinitely.

3. **Lenco webhook may not be receiving callbacks** -- all 10+ payment records are stuck on "pending", suggesting the webhook URL isn't configured in Lenco's dashboard, or callbacks aren't matching.

4. **Client polling only runs for ~2 minutes** -- if the user doesn't authorize on their phone within that window, no further status checks happen.

## Plan

### 1. Create `expire-subscriptions` Edge Function

New function that:
- Finds all tenants where `billing_status = 'active'` and `billing_end_date < NOW()`
- Sets their `billing_status` to `'inactive'`
- Logs the action

Schedule it via `pg_cron` to run daily at midnight.

### 2. Add "Check with Lenco" Button in SubscriptionPaymentsManager

For each pending payment, add a button that calls `lenco-check-status` from the super admin panel. If Lenco reports "successful", auto-activate the subscription. This gives admins a way to reconcile without manual confirmation.

### 3. Add "Recheck All Pending" Bulk Action

A single button to batch-check all pending payments against the Lenco API, updating statuses automatically.

### 4. Fix Data Inconsistency

Run a one-time cleanup: for THINKTECH and any other tenants whose `billing_end_date` has passed but are still "active", the expire-subscriptions function will handle them on its first run.

## Files to Create/Modify

- **Create** `supabase/functions/expire-subscriptions/index.ts` -- daily cron function
- **Modify** `supabase/config.toml` -- add `verify_jwt = false` for the new function
- **Database migration** -- add `pg_cron` schedule for daily expiry check
- **Modify** `src/components/dashboard/SubscriptionPaymentsManager.tsx` -- add "Check with Lenco" and "Recheck All Pending" buttons

