
# AI Advisor Authentication & Subscription Assistance

## Overview

This plan adds two key improvements to the Omanut Advisor:
1. **Hide advisor for logged-out users** - Only show the advisor when a user is authenticated
2. **Subscription coaching capability** - Enable the advisor to help users understand plans and guide them to subscribe based on their usage patterns

---

## Current State Analysis

### Advisor Visibility
- `OmanutAdvisor` is rendered in `App.tsx` at the root level, outside of route guards
- It currently renders for ALL visitors (logged-in or not)
- The advisor relies on `useTenant()` which returns null for unauthenticated users

### Subscription Context
- The edge function already fetches billing plan, status, and feature usage
- Trial status, days remaining, and plan limits are calculated
- Upsell triggers exist but don't include explicit subscription guidance

---

## Implementation Plan

### Part 1: Hide Advisor for Unauthenticated Users

**File: `src/components/dashboard/OmanutAdvisor.tsx`**

Add authentication check at the top of the component:

```text
┌─────────────────────────────────────────────────────┐
│  1. Import useAuth hook                             │
│  2. Get { user, loading } from useAuth()            │
│  3. Return null if !user (after loading completes)  │
└─────────────────────────────────────────────────────┘
```

This ensures:
- No flash of advisor on public pages
- Advisor only appears after user logs in
- Clean experience for marketing pages (/, /pricing, /auth, etc.)

### Part 2: Add Subscription Assistance to Advisor

**File: `supabase/functions/omanut-advisor/index.ts`**

Enhance the system prompt with:

1. **Billing Context Section** - Add trial status and plan comparison data:
```text
SUBSCRIPTION STATUS:
- Current Plan: [plan name]
- Status: [trial/active/expired]
- Trial Days Remaining: [X days] (if applicable)
- Trial Expiry Date: [date]
```

2. **Plan Comparison Data** - Provide feature/limit breakdowns:
```text
PLAN COMPARISON (for recommendations):
- Starter ($9/mo): 1 user, 100 items, basic features
- Pro ($29/mo): 10 users, 1000 items, HR/Payroll, Agents, Advanced Accounting
- Enterprise ($79/mo): Unlimited everything, Multi-branch, White-label
```

3. **Subscription Coaching Instructions** - Add explicit guidance:
```text
SUBSCRIPTION ASSISTANCE CAPABILITY:
When users ask about plans, pricing, or upgrading:
1. Analyze their current usage (users, inventory items, features used)
2. Recommend the most cost-effective plan for their needs
3. Explain specific benefits relevant to THEIR situation
4. Provide the subscription path: Settings → Subscription → Subscribe Now
5. Mention the 7-day free trial if applicable

Example responses:
- Trial expiring: "Your 7-day trial ends in 2 days. Based on your 85 products and 3 team members, the Pro plan ($29/mo) covers you perfectly and includes the HR/Payroll features you've been using."
- Usage analysis: "You're using 95/100 inventory slots and have 3 employees. Pro unlocks 1,000 items + payroll automation - worth it at $29/mo!"
- Feature inquiry: "WhatsApp reminders are on the Pro plan. Since you have $45,000 in overdue invoices, automatic payment reminders could really help!"
```

4. **Quick Prompts** - Add subscription-related prompts in frontend:
```typescript
// Add to quickPrompts generation in OmanutAdvisor.tsx
if (isTrialing && daysRemaining <= 3) {
  prompts.unshift({ 
    text: "Which plan is right for me?", 
    icon: <Sparkles className="h-3 w-3" /> 
  });
}
```

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/components/dashboard/OmanutAdvisor.tsx` | Add auth check, hide when logged out, add subscription prompts |
| `supabase/functions/omanut-advisor/index.ts` | Enhance system prompt with billing context and subscription coaching |

---

## Data Flow

```text
User asks: "Which plan should I get?"
              ↓
Edge Function receives request
              ↓
Fetches business_profiles → billing_plan, billing_status, trial_expires_at
              ↓
Calculates usage metrics (inventory count, employee count, sales volume)
              ↓
Builds enhanced context with plan comparison + usage analysis
              ↓
AI generates personalized recommendation:
"Based on your 12 products, 5 employees, and $8,000 monthly revenue, 
the Pro plan at $29/mo gives you everything you need including HR/Payroll!"
```

---

## Expected Behavior

### Before (Current)
- Advisor visible on ALL pages including /, /pricing, /auth
- Can't help users understand which plan fits their needs
- No subscription guidance

### After
- Advisor only appears when user is logged in
- Can recommend plans based on actual usage patterns
- Provides clear subscription path when asked
- Proactive subscription prompts when trial is expiring
