

# Improve Inactive Tenant Experience

## Problem
When a tenant's subscription is inactive:
1. Only "dashboard", "settings", and "tenant-settings" tabs are accessible — but **"modules"** (plan/pricing info) is blocked, so users can't even see what plans are available
2. The `FeatureGuard` component shows a generic "Subscription Required" card with an "Activate Subscription" button that opens the `UpgradePlanModal` — but this is a small, minimal modal without plan comparison or pricing
3. Non-owner users see the inactive state but have no clear guidance on what to do
4. When users click blocked sidebar items, they just get a toast notification — no actionable path to reactivate

## Fixes

### 1. Allow "modules" tab for inactive tenants
In `Dashboard.tsx`, add `"modules"` to the `allowedWhenInactive` array so users can browse available plans even when inactive.

**File:** `src/pages/Dashboard.tsx` (line 160)
```
const allowedWhenInactive: DashboardTab[] = ["dashboard", "settings", "tenant-settings", "modules"];
```

### 2. Replace toast with a subscription popup when clicking blocked modules
Instead of just showing a dismissible toast when inactive users click a blocked tab, show a proper modal dialog with:
- Clear messaging: "Your subscription is inactive"
- The 3 plan tiers (Starter/Growth/Enterprise) with pricing and highlights
- A "Subscribe Now" button per plan that navigates to `/pay?plan=...`
- Grace period countdown if applicable (using `deactivated_at`)

**File:** `src/pages/Dashboard.tsx`
- Add state for a new `SubscriptionRequiredModal`
- In `handleSetActiveTab`, when blocking an inactive user, open this modal instead of toasting

### 3. Create `SubscriptionRequiredModal` component
A new reusable dialog component that:
- Shows the 3 plan cards (reusing data from `useBillingPlans`)
- Displays grace period countdown if `deactivated_at` exists
- Has "Subscribe Now" buttons linking to `/pay?plan=X`
- Differentiates messaging for owners vs non-owners (owners get pay links, non-owners get "Contact your admin" message)

**File:** `src/components/dashboard/SubscriptionRequiredModal.tsx` (new)

### 4. Update `FeatureGuard` inactive state
Replace the current static "Subscription Required" card with a more actionable UI that:
- For owners: shows plan cards inline with direct subscribe buttons
- For non-owners: shows "Contact your administrator to reactivate"
- Includes the grace period countdown when applicable

**File:** `src/components/dashboard/FeatureGuard.tsx`

### 5. Add a persistent banner for non-owner users
Non-owner users (employees) on inactive tenants should see a visible but non-blocking banner at the top of the dashboard explaining the situation and who to contact, rather than being completely locked out of viewing data.

**File:** `src/components/dashboard/DashboardHome.tsx` — add an inactive subscription alert card at the top

## Files to Create/Modify
- `src/components/dashboard/SubscriptionRequiredModal.tsx` — new modal component
- `src/pages/Dashboard.tsx` — expand `allowedWhenInactive`, replace toast with modal
- `src/components/dashboard/FeatureGuard.tsx` — improve inactive state UI with plan cards
- `src/components/dashboard/DashboardHome.tsx` — add persistent banner for non-owners

