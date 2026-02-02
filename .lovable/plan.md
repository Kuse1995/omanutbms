

# Make WhatsApp an Add-On Only Feature

## Overview

Currently, WhatsApp is included as a feature in all billing plans (Starter, Pro, Enterprise) with varying message limits. This change will make WhatsApp exclusively an add-on that must be purchased separately, regardless of plan.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/billing-plans.ts` | Set `whatsapp: false` for all plans, set `whatsappMessages: 0` |
| `src/components/landing/PlanComparisonTable.tsx` | Change WhatsApp to "Add-on" for all plans, remove from Usage Limits |
| `src/components/dashboard/TenantManager.tsx` | Change `whatsapp_enabled: false` for new tenants |
| `src/lib/business-type-config.ts` | Set `whatsapp: false` in all business type default features |
| `src/hooks/useBillingPlans.ts` | Update to ensure WhatsApp limits default to 0 |

---

## Detailed Changes

### 1. billing-plans.ts - Core Plan Configuration

Remove WhatsApp from all plan features and limits:

**Starter Plan:**
- Change `whatsappMessages: 30` → `whatsappMessages: 0`
- Change `whatsapp: true` → `whatsapp: false`
- Remove "WhatsApp assistant (30/month)" from highlights

**Pro/Growth Plan:**
- Change `whatsappMessages: 500` → `whatsappMessages: 0`
- Change `whatsapp: true` → `whatsapp: false`
- Remove "WhatsApp assistant (500/month)" from highlights

**Enterprise Plan:**
- Change `whatsappMessages: Infinity` → `whatsappMessages: 0`
- Change `whatsapp: true` → `whatsapp: false`
- Remove "Unlimited WhatsApp messages" from highlights

---

### 2. PlanComparisonTable.tsx - UI Display

Update the feature comparison table:

**Remove from Usage Limits section:**
```typescript
// DELETE this row:
{ category: "Usage Limits", feature: "WhatsApp Messages", starter: "30/month", growth: "500/month", enterprise: "Unlimited" },
```

**Change in AI & Automation section:**
```typescript
// FROM:
{ category: "AI & Automation", feature: "WhatsApp Assistant", starter: true, growth: true, enterprise: true },

// TO:
{ category: "AI & Automation", feature: "WhatsApp Assistant", starter: "Add-on", growth: "Add-on", enterprise: "Add-on" },
```

---

### 3. TenantManager.tsx - New Tenant Defaults

When creating new tenants, WhatsApp should be disabled by default:

```typescript
// FROM:
whatsapp_enabled: true, // All plans now have WhatsApp (with usage limits)

// TO:
whatsapp_enabled: false, // WhatsApp is an add-on only feature
```

---

### 4. business-type-config.ts - Business Type Defaults

Set `whatsapp: false` in all business type default features. This affects 12 business types:
- distribution
- retail
- school
- ngo
- services
- agriculture
- hospitality
- salon
- healthcare
- autoshop
- hybrid
- fashion

Each business type's `defaultFeatures.whatsapp` will be changed from `true` to `false`.

---

### 5. useBillingPlans.ts - Merge Logic

Ensure the hook defaults whatsappMessages to 0 when not overridden:

```typescript
limits: {
  // ... other limits
  whatsappMessages: 0, // WhatsApp is add-on only
  // ...
},
```

---

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| Starter Plan | WhatsApp included (30 msgs/mo) | No WhatsApp |
| Pro Plan | WhatsApp included (500 msgs/mo) | No WhatsApp |
| Enterprise Plan | WhatsApp included (unlimited) | No WhatsApp |
| New Tenants | WhatsApp enabled by default | WhatsApp disabled |
| Pricing UI | Shows WhatsApp as feature | Shows "Add-on" |
| Business Types | WhatsApp enabled in defaults | WhatsApp disabled |

## How Customers Get WhatsApp

After this change, customers will need to:
1. Go to the Add-ons Marketplace in their dashboard
2. Purchase the WhatsApp add-on
3. The add-on activates `whatsapp_enabled` in their `business_profiles`

This aligns with the existing `addon_definitions` table which already has a `whatsapp_messages` add-on defined with tiered pricing.

---

## Technical Notes

- The `addon_definitions` table already has WhatsApp defined as an add-on
- The `activate_addon()` RPC already handles enabling features when purchased
- The `AddonPurchaseModal` and marketplace flow already work for WhatsApp
- Existing tenants with WhatsApp enabled will keep access (no retroactive change)

