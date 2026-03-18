

# Make Payment Frictionless for Inactive Accounts

## Problem
The screenshot shows an admin user seeing "Please reach out to your organization's administrator" — but they ARE the admin. The code checks `tenantUser?.is_owner === true`, but admin-role users aren't necessarily marked as `is_owner`. This blocks the primary decision-makers from seeing payment options.

## Strategy Overview

1. **Fix the ownership check** — treat `admin` role users the same as owners for payment purposes
2. **Auto-show the subscription modal** on dashboard load for inactive tenants (don't wait for them to click a blocked feature)
3. **Make the DashboardHome banner show payment options for admins** (not just owners)
4. **Add a persistent "Subscribe" button in the sidebar** when inactive, so payment is always one click away
5. **Make the SubscriptionRequiredModal non-dismissible** for the auto-shown version (they must consciously choose to close it)

## Changes

### 1. Create a shared helper: `canManageBilling`
Used across all components to determine who sees payment options. Checks `is_owner === true` OR `role === 'admin'`.

**File:** `src/lib/role-config.ts` — add a new exported function

### 2. Update `SubscriptionRequiredModal`
- Import and use `canManageBilling` instead of raw `is_owner` check
- Add a `dismissable` prop (default true) — when false, remove the close button
- Show plan cards for anyone who can manage billing

**File:** `src/components/dashboard/SubscriptionRequiredModal.tsx`

### 3. Auto-show modal on Dashboard load when inactive
When `billing_status === 'inactive'` and user can manage billing, automatically open the `SubscriptionRequiredModal` on mount (non-dismissible first time).

**File:** `src/pages/Dashboard.tsx` — add a `useEffect` that sets `subscriptionModalOpen = true` on load when inactive

### 4. Update DashboardHome banner
Replace `is_owner` checks with `canManageBilling` so admin users also see the "Subscribe Now" button.

**File:** `src/components/dashboard/DashboardHome.tsx` (lines 284, 292)

### 5. Update FeatureGuard
Replace `is_owner` checks with `canManageBilling` so admin users see plan cards instead of "contact admin".

**File:** `src/components/dashboard/FeatureGuard.tsx` (line 33)

### 6. Add sidebar "Subscribe" button for inactive tenants
Show a prominent button/banner at the top of the sidebar when subscription is inactive, linking directly to `/pay`.

**File:** `src/components/dashboard/DashboardSidebar.tsx` — add a conditional block near the top

## Summary of Files
- `src/lib/role-config.ts` — add `canManageBilling()` helper
- `src/components/dashboard/SubscriptionRequiredModal.tsx` — fix owner check, add `dismissable` prop
- `src/pages/Dashboard.tsx` — auto-show modal on load when inactive
- `src/components/dashboard/DashboardHome.tsx` — use `canManageBilling`
- `src/components/dashboard/FeatureGuard.tsx` — use `canManageBilling`
- `src/components/dashboard/DashboardSidebar.tsx` — add subscribe button when inactive

