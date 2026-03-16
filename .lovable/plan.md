

# Prompt Unpaid Users to Make Payment

## Current State
- `SubscriptionActivationGate` shows a full-screen overlay for inactive owners, but it's **dismissible** via "Maybe Later" — users can close it and use the dashboard freely without paying.
- `SidebarUpgradeCTA` shows a small sidebar nudge for inactive/trial users, but it's easy to ignore.
- `RenewalNoticeBanner` only shows for **active** users approaching renewal — not for unpaid/inactive users.
- Non-owner team members see nothing at all when the subscription is inactive.

## Plan

### 1. Make SubscriptionActivationGate non-dismissible for inactive tenants
- Remove the "Maybe Later" / dismiss button entirely
- Users with `billing_status = 'inactive'` must select a plan — the overlay blocks all dashboard usage
- This forces payment before they can access any features

### 2. Add a persistent "Payment Required" banner in DashboardHome for all users
- When `billing_status === 'inactive'`, show a red alert banner at the top of DashboardHome for **all** tenant users (not just owners)
- Non-owners see "Contact your administrator to activate your subscription"
- Owners see "Subscribe Now" with a direct link to `/pay`

### 3. Restrict dashboard navigation when inactive
- In `Dashboard.tsx`, when `billing_status === 'inactive'`, force `activeTab` to stay on `"dashboard"` and block switching to other tabs
- Show a toast: "Please activate your subscription to access this feature"
- Exception: allow access to `"settings"` so users can still manage their account

## Files to Modify
- `src/components/dashboard/SubscriptionActivationGate.tsx` — remove dismiss, make mandatory
- `src/components/dashboard/DashboardHome.tsx` — add inactive payment banner for all users
- `src/pages/Dashboard.tsx` — block tab navigation when inactive (except dashboard + settings)

