
# Subscription Payment Tracking System

## Current Situation

- A `subscription_payments` table already exists in the database with fields for amount, plan, status, payment method, phone number, tenant reference, etc.
- There are 15+ payment records, but ALL are stuck at `pending` status -- none have been verified/completed
- There is NO admin UI to view, track, or manually confirm these payments
- The super admin panel has a "Stats/Overview" tab with revenue projections, but no actual payment history

## What We'll Build

A new **"Billing" tab** in the Super Admin Panel that provides:

### 1. Subscription Payments Dashboard
A card-based summary at the top showing:
- Total payments this month (count and amount)
- Confirmed/completed payments
- Pending payments awaiting verification
- Failed/expired payments

### 2. Payment History Table
A full table of all `subscription_payments` records showing:
- Tenant name (joined from `tenants` table)
- Amount and currency
- Plan (Starter/Pro/Enterprise) and billing period (monthly/annual)
- Payment method and operator (MTN/Airtel)
- Phone number used
- Status badge (pending/completed/failed)
- Date submitted
- Date verified (if completed)

With filters for:
- Status (All / Pending / Completed / Failed)
- Date range (this month / last month / custom)
- Search by tenant name

### 3. Manual Payment Confirmation
A "Confirm Payment" action button on pending payments that:
- Sets `status` to `completed` and `verified_at` to now
- Updates the tenant's `business_profiles.billing_status` to `active`
- Sets `billing_start_date` to today and `billing_end_date` to +30 days (monthly) or +365 days (annual)
- Shows a confirmation dialog before proceeding

### 4. Subscription Expiry Overview
A separate card listing tenants whose `billing_end_date` has passed or is approaching, so you can quickly see who needs renewal follow-up.

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/dashboard/SubscriptionPaymentsManager.tsx` | Main component with payment table, filters, summary cards, and manual confirmation |

### Files to Modify
| File | Change |
|------|--------|
| `src/components/dashboard/SuperAdminPanel.tsx` | Add new "Billing" tab with the `SubscriptionPaymentsManager` component |

### Database
No schema changes needed -- the `subscription_payments` table already has all required fields (`status`, `verified_at`, `tenant_id`, `amount`, `plan_key`, `billing_period`, `payment_method`, `operator`, `phone_number`, `created_at`).

The manual confirmation action will update:
1. `subscription_payments.status` -> `completed`, `verified_at` -> `now()`
2. `business_profiles.billing_status` -> `active`, `billing_start_date` -> today, `billing_end_date` -> today + period

### Component Structure

```text
SubscriptionPaymentsManager
+-- Summary Cards (4 cards: total, confirmed, pending, failed)
+-- Filter Bar (status dropdown, date range, search input)
+-- Expiry Alerts Card (tenants past due or expiring within 7 days)
+-- Payments Table
    +-- Each row: tenant name, amount, plan, method, phone, status badge, date, actions
    +-- "Confirm" button on pending rows -> opens AlertDialog -> updates DB
```

### Key Queries
- Fetch all payments: `subscription_payments` joined with `tenants` for name, ordered by `created_at DESC`
- Expiry check: `business_profiles` where `billing_end_date < today + 7 days` and `billing_status = 'active'`
- Confirm payment: update `subscription_payments` status + update `business_profiles` billing dates

### Access Control
- Only visible in the Super Admin Panel (already gated by `is_super_admin()` check)
- Uses existing RLS policies on `subscription_payments` and `business_profiles`
