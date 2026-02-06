
# Update Pricing, Remove Trial for New Users, Preserve Existing Trials

## Overview

Update the code-level pricing defaults to match the database (K299/K799/K1,999), remove the free trial for **new signups only**, and add a payment gate after onboarding. **All 12 existing trial users keep their trial until expiration.**

---

## Current State

- **Database pricing** already correct: K299, K799, K1,999 (ZMW)
- **Code defaults** still show USD: $9, $29, $79 (these are fallbacks overridden by DB, but should match)
- **12 users on trial** with valid `trial_expires_at` dates -- these must be preserved
- **12 users active** -- unaffected
- Trial references appear in: Auth page, Pricing page, PricingSection, PricingFAQ, billing-plans.ts

---

## What Changes

### 1. Update Code Defaults (billing-plans.ts)
- Starter: K299/mo, K2,870/yr (ZMW)
- Pro: K799/mo, K7,670/yr (ZMW)
- Enterprise: K1,999/mo, K19,190/yr (ZMW)
- Set `trialDays: 0` for all plans
- Keep `"trial"` in `BillingStatus` type (existing users still use it)
- `isStatusActive()` continues to return `true` for `"trial"` (preserves existing trial access)

### 2. Database Migration
- Update `handle_new_user()` trigger: new signups get `billing_status = 'inactive'` and `trial_expires_at = NULL`
- Set `trial_days = 0` in `billing_plan_configs`
- **DO NOT** touch existing `business_profiles` rows -- all 12 trial users keep their status and expiry dates

### 3. Subscription Activation Gate (new component)
After onboarding completes, if `billing_status` is `'inactive'`, show a full-screen overlay prompting the user to subscribe. This replaces the trial experience for new users.

- Shows the 3 plans with pricing
- "Subscribe Now" button goes to `/pay`
- Cannot be dismissed (must pay to proceed)

### 4. Dashboard Integration
Add the gate between onboarding wizard and dashboard content:

```
Onboarding Wizard (if !onboarding_completed)
  --> Subscription Gate (if onboarding_completed && billing_status === 'inactive')
    --> Dashboard (if active or trial)
```

### 5. Auth Page Updates
- Change "Your 7-day free trial has started" toast to "Account created! Choose a plan to get started."
- Remove trial days reference from success message

### 6. Landing/Pricing Page Updates
- PricingSection: Change "Start with a 7-day free trial" to "Choose the plan that fits your business"
- PricingSection: Change CTA buttons from "Start Free Trial" to "Get Started"
- PricingSection: Remove "{trialDays}-day free trial" footer note
- Pricing page: Remove "14-day free trial" badge, change to "No setup fees"
- Pricing page: Change "Start free, scale as you grow" to "Simple plans that grow with your business"
- PricingFAQ: Rewrite trial-related FAQ answers

### 7. SidebarUpgradeCTA & TrialBanner
- These naturally handle both states already
- Trial users see trial countdown (existing behavior preserved)
- Inactive users see "Activate Subscription" (existing behavior)
- No code changes needed

---

## Existing Trial Users -- Preserved

The 12 users currently on trial will:
- Keep `billing_status = 'trial'` in their `business_profiles`
- Keep their `trial_expires_at` dates unchanged
- Continue seeing the TrialBanner with days remaining
- Continue having full feature access via `isStatusActive('trial') === true`
- When their trial expires, the existing expiry logic kicks in (shows upgrade prompt)

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/billing-plans.ts` | Update prices to ZMW, set trialDays to 0 |
| `src/pages/Dashboard.tsx` | Add SubscriptionActivationGate between onboarding and content |
| `src/components/dashboard/SubscriptionActivationGate.tsx` | New component -- payment gate overlay |
| `src/pages/Auth.tsx` | Remove trial reference in success toast |
| `src/components/landing/PricingSection.tsx` | Remove trial text, update CTAs |
| `src/pages/Pricing.tsx` | Remove trial badges, update copy |
| `src/components/landing/PricingFAQ.tsx` | Rewrite trial FAQ |
| Database migration | Update trigger for new signups, set trial_days=0 in configs |

---

## Database Migration SQL

```sql
-- Set trial_days = 0 for all plans (affects new signups only)
UPDATE billing_plan_configs SET trial_days = 0;

-- Update handle_new_user trigger: new signups get 'inactive' instead of 'trial'
-- (full trigger replacement with billing_status = 'inactive', trial_expires_at = NULL)
```

**NOT included** (preserves existing trials):
```sql
-- We do NOT run this:
-- UPDATE business_profiles SET billing_status = 'inactive' WHERE billing_status = 'trial';
```

---

## User Experience

### New Users (after this change)
1. Visit landing page, click "Get Started"
2. Create account at `/auth`
3. Land on Dashboard, see BusinessTypeSetupWizard
4. Complete company name + business type
5. See SubscriptionActivationGate (must subscribe)
6. Go to `/pay`, select plan, pay via Mobile Money
7. Account activated, full dashboard access

### Existing Trial Users (unchanged)
1. Log in, see TrialBanner with "X days left"
2. Full feature access continues
3. When trial expires, prompted to upgrade
