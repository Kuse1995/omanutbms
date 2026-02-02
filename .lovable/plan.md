
# Improve Payment UX: Redesign Checkout Experience

## Current Issues

### 1. Sidebar CTA is Obstructive
The `SidebarUpgradeCTA` component sits at the bottom of the sidebar and can feel intrusive, especially on smaller screens. It's always visible for trial users and takes up valuable navigation space.

### 2. `/pay` Page Layout Problems
- The current layout is split 2/5 (plan selection) and 3/5 (payment methods) side by side
- This creates a cluttered feel with too much information visible at once
- Plan selection, billing period, currency, and payment methods all compete for attention
- The page feels more like a form than a guided checkout experience

### 3. Poor Visual Hierarchy
- All options are presented at the same visual level
- Users must process too many choices simultaneously
- No clear "next step" guidance through the payment flow

---

## Proposed Solution: Step-Based Checkout Experience

### Design Approach
Convert the payment flow into a **clean, wizard-style checkout** with clear steps:

```text
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Plan Selection                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ⭐ Starter     🔥 Pro (Popular)     👑 Enterprise      ││
│  │   K299/mo         K799/mo              K1,999/mo        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Step 2: Billing Period                                     │
│  ┌──────────────────┐  ┌──────────────────────┐            │
│  │   Monthly        │  │  Annual (Save 20%)  ✓│            │
│  └──────────────────┘  └──────────────────────┘            │
│                                                             │
│  Step 3: Payment Method                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📱 Mobile Money                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐                    │  │
│  │  │   MTN       │  │   Airtel    │                    │  │
│  │  └─────────────┘  └─────────────┘                    │  │
│  │                                                       │  │
│  │  Phone: +260 [_________________]                     │  │
│  │                                                       │  │
│  │  ┌───────────────────────────────────────────────┐   │  │
│  │  │      💳 Pay K799 with MTN Mobile Money         │   │  │
│  │  └───────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Order Summary:                                             │
│  Pro Plan (Annual)                             K7,990/year  │
│  Monthly equivalent                              K666/month │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔒 Secure payment powered by Lenco                         │
└─────────────────────────────────────────────────────────────┘
```

### Key UX Improvements

1. **Vertical Flow Instead of Horizontal Split**
   - Stack sections vertically for natural top-to-bottom reading
   - Each section is clearly labeled and separated
   - Users progress through choices in a logical order

2. **Sticky Order Summary**
   - Keep price summary visible as user scrolls
   - Updates dynamically as selections change
   - Provides constant feedback on the total

3. **Focused Payment Section**
   - Mobile Money is the primary (default) option since Card/Bank are "Coming Soon"
   - Operator selection is visual (buttons) not a dropdown
   - Clear phone number input with format hints

4. **Sidebar CTA Refinement**
   - Make it more subtle - use a thin banner style instead of a card
   - Dismiss option that remembers preference for 24h (already exists)
   - Consider moving to the header area instead of sidebar

### Alternative: Move Upgrade CTA to Header Banner

Instead of the sidebar box, use a thin top banner inside the dashboard (already have `TrialBanner`):
- Less intrusive to navigation
- More prominent for conversion
- Can be dismissed
- Already implemented - just ensure it connects to payment properly

---

## Implementation Plan

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Pay.tsx` | Restructure to vertical wizard flow, improve visual hierarchy |
| `src/components/dashboard/SidebarUpgradeCTA.tsx` | Make more compact/subtle, or consider removing in favor of TrialBanner |
| `src/components/dashboard/TrialBanner.tsx` | Ensure it opens UpgradePlanModal or navigates to `/pay` |
| `src/components/dashboard/PaymentModal.tsx` | Consider simplifying - maybe just redirect to `/pay` instead of duplicating logic |

### Pay.tsx Restructure

**Current Layout:**
```jsx
<div className="grid lg:grid-cols-5 gap-8">
  <div className="lg:col-span-2">Plan + Billing + Currency</div>
  <div className="lg:col-span-3">Payment Methods</div>
</div>
```

**New Layout:**
```jsx
<div className="max-w-2xl mx-auto space-y-6">
  {/* Step 1: Plan Selection - horizontal cards */}
  <Section title="Choose Your Plan">
    <PlanCards />
  </Section>
  
  {/* Step 2: Billing Period - simple toggle */}
  <Section title="Billing Period">
    <BillingToggle />
  </Section>
  
  {/* Step 3: Payment - focused on Mobile Money */}
  <Section title="Payment Method">
    <MobileMoneyForm />
  </Section>
  
  {/* Sticky summary at bottom or side */}
  <OrderSummary />
</div>
```

### SidebarUpgradeCTA Options

**Option A: Make it more subtle**
- Reduce padding, smaller text
- Use a single-line format: "Trial: 5 days left · [Upgrade]"

**Option B: Remove it entirely**
- Rely on `TrialBanner` at the top of the dashboard
- Less clutter in sidebar
- Banner is more prominent anyway

**Recommendation:** Go with Option B - remove the sidebar CTA and enhance the TrialBanner to handle all upgrade prompts. This reduces visual noise and consolidates upgrade messaging.

---

## Technical Details

### Pay.tsx Changes

The main change is restructuring from a 2-column grid to a single-column wizard:

```typescript
// Instead of grid lg:grid-cols-5
<div className="max-w-2xl mx-auto">
  {/* Plans as a row of 3 cards */}
  <div className="grid grid-cols-3 gap-3 mb-8">
    {planKeys.map(plan => <PlanCard key={plan} />)}
  </div>

  {/* Billing as simple toggle button group */}
  <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-card mb-8">
    <Button variant={...}>Monthly</Button>
    <Button variant={...}>Annual <Badge>Save 20%</Badge></Button>
  </div>

  {/* Payment - single focused section */}
  <div className="p-6 rounded-xl bg-card border">
    {/* Operator buttons */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      <OperatorButton operator="MTN" />
      <OperatorButton operator="AIRTEL" />
    </div>
    
    {/* Phone input */}
    <PhoneInput />
    
    {/* Pay button */}
    <Button size="lg" className="w-full mt-4">
      Pay K{price} with {operator}
    </Button>
  </div>

  {/* Order summary - clean divider section */}
  <div className="mt-6 pt-6 border-t">
    <OrderSummary />
  </div>
</div>
```

### SidebarUpgradeCTA Removal

Simply return `null` from the component or remove its usage in `DashboardSidebar.tsx`. The `TrialBanner` already handles upgrade prompts and is positioned more prominently.

### TrialBanner Enhancement

Ensure clicking "Upgrade Now" either:
1. Opens the `UpgradePlanModal` (current modal approach), OR
2. Navigates to `/pay` (dedicated page approach)

The modal approach keeps users in context, but the page approach provides more space for a cleaner UX. Recommend: Navigate to `/pay`.

---

## Summary

| Change | Impact |
|--------|--------|
| Vertical wizard layout on `/pay` | Cleaner, guided checkout flow |
| Remove SidebarUpgradeCTA | Less visual clutter in dashboard |
| Enhance TrialBanner | Single, prominent upgrade prompt |
| Operator selection as buttons | More visual, easier to tap |
| Focused mobile money form | Primary payment method is clear |
| Sticky order summary | Users always see their total |

This creates a more focused, less overwhelming payment experience while maintaining easy access to upgrade options through the trial banner.
