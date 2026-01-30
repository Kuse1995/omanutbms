

# Plan: Create Standalone `/pay` Route with Dedicated Payment Page

## Overview

Create a new `/pay` route that provides a dedicated, standalone payment page. This page will:
1. Require authentication (redirect to `/auth` if not logged in)
2. Show plan selection and payment options using existing components
3. Support URL parameters for pre-selected plans (e.g., `/pay?plan=growth`)
4. Provide a clean, focused payment experience outside the dashboard

---

## Current Architecture

- **Authentication**: `ProtectedRoute` component handles auth gating
- **Payment UI**: `PaymentModal` contains all payment logic (Mobile Money, Card, Bank Transfer via Lenco)
- **Plan Data**: `useBillingPlans` hook provides plan configurations
- **Billing State**: `useBilling` hook provides current subscription status
- **Geo-pricing**: `useGeoLocation` handles currency detection

---

## Implementation Steps

### Step 1: Create the Pay Page Component

**File**: `src/pages/Pay.tsx`

A new page component that:
- Accepts `?plan=` URL parameter to pre-select a plan
- Shows the payment interface directly (not as a modal)
- Includes plan selection, billing period toggle, and payment methods
- Uses existing hooks: `useBillingPlans`, `useGeoLocation`, `useAuth`
- Displays current subscription status if already subscribed

The UI will be similar to `PaymentModal` but as a full page with:
- Navigation header with back button
- Plan cards for selection
- Payment method tabs (Mobile Money, Card, Bank Transfer)
- Price summary with currency selector

### Step 2: Add Route to App.tsx

**File**: `src/App.tsx`

Add protected route:
```text
/pay → <ProtectedRoute><Pay /></ProtectedRoute>
```

### Step 3: Update Card Payment Redirect URL

**File**: `src/components/dashboard/PaymentModal.tsx`

Change the card payment redirect from `/dashboard?payment=complete` to `/bms?payment=complete` (matching actual route).

### Step 4: Update Pricing Page CTAs

**File**: `src/components/landing/PricingSection.tsx`

Update "Start Free Trial" buttons to link to `/pay?plan=...` for logged-in users, or keep `/auth?plan=...` for guests.

---

## Technical Details

### Pay.tsx Structure

```text
┌─────────────────────────────────────────────┐
│  Header: Back to Dashboard / Logo           │
├─────────────────────────────────────────────┤
│  Title: "Complete Your Subscription"        │
│  Subtitle: Current plan status              │
├─────────────────────────────────────────────┤
│  Plan Selection Cards (3 columns)           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Starter │ │  Pro ★  │ │Enterpri.│       │
│  └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────┤
│  Billing Period Toggle (Monthly / Annual)   │
├─────────────────────────────────────────────┤
│  Currency Selector                          │
├─────────────────────────────────────────────┤
│  Price Summary                              │
├─────────────────────────────────────────────┤
│  Payment Method Tabs                        │
│  [Mobile Money] [Card] [Bank Transfer]      │
│  ─────────────────────────────────────────  │
│  Payment Form / Status                      │
├─────────────────────────────────────────────┤
│  "Secure payments powered by Lenco"         │
└─────────────────────────────────────────────┘
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/Pay.tsx` | Standalone payment page |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/pay` route with `ProtectedRoute` wrapper |
| `src/components/dashboard/PaymentModal.tsx` | Fix card redirect URL to `/bms` |
| `src/components/landing/PricingSection.tsx` | Optional: link to `/pay` for authenticated users |

---

## User Flow

```text
User on /pay (not logged in)
    ↓
Redirect to /auth
    ↓
Login/Signup
    ↓
Redirect back to /bms (or /pay if preserved)
    ↓
Complete payment
    ↓
Subscription activated
```

---

## Notes

- The page will reuse all existing payment logic from `PaymentModal`
- No database changes required
- No new edge functions needed (uses existing Lenco functions)
- The `ProtectedRoute` wrapper ensures authentication before showing payment options

