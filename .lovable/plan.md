

# Payment Accessibility and Add-ons Marketplace Plan

## Current Situation Analysis

**Payment Access Points Today:**
1. `/pay` page - Standalone checkout page (requires navigation away from dashboard)
2. `PaymentModal` - Triggered from `SubscriptionManager` and `TrialBanner` (limited visibility)
3. `UpgradePlanModal` - Shows plans but only says "Contact Sales" (no actual payment flow)

**Add-ons System Today:**
1. `TenantAddonsDialog` - Admin-only, hidden in super-admin panel
2. `ModulesMarketplace` - Shows modules but "Upgrade" button doesn't do anything actionable
3. `addon_definitions` table has 4 add-ons: Inventory Items, WhatsApp Messages, Multi-Branch, Warehouse

**Problems:**
- Users must navigate to `/pay` or dig into settings to pay
- No in-context payment prompts when users hit limits
- Add-ons are invisible to regular users
- No self-service add-on purchase flow
- "Upgrade" buttons in ModulesMarketplace don't actually upgrade

---

## Proposed Solution

### 1. Add Payment CTAs Throughout the Dashboard

**a) Persistent Upgrade Button in Sidebar (for trial/inactive users)**
- Add a subtle "Upgrade" button at the bottom of the sidebar for users on trial or inactive status
- Opens `PaymentModal` directly

**b) Contextual Payment Prompts**
- When users hit inventory limits: Show inline banner with "Add more items" CTA
- When WhatsApp message quota is low: Show warning with upgrade option
- When users try to access locked features: Show upgrade modal with that feature highlighted

### 2. Add-ons Marketplace for Self-Service Purchases

**a) Transform `ModulesMarketplace` into an Actionable Add-ons Store**
- Show current plan + available add-ons
- Each add-on card shows: Description, Price (K/month or usage-based), Status (Active/Available)
- "Activate" button opens a dedicated `AddonPurchaseModal`

**b) Create `AddonPurchaseModal` Component**
- Displays add-on details + pricing
- Uses the same Lenco payment flow as subscriptions
- Creates a separate `subscription_payments` record with `addon_key`

**c) Add-on Pricing Education**
- Add info tooltips explaining usage-based vs fixed pricing
- Show current usage and projected cost for tiered add-ons
- Display plan limits clearly with "Included" vs "Extra K1/item" messaging

### 3. Streamline the Upgrade Flow

**a) Fix `UpgradePlanModal` to Actually Process Payments**
- Replace "Contact Sales" with direct payment flow for Starter/Growth plans
- Use the working `PaymentModal` logic or navigate to `/pay?plan=X`

**b) Add Quick Upgrade from `TrialBanner`**
- Current flow: Banner → PaymentModal → Select plan → Pay
- Keep this but ensure it's prominent and works smoothly

### 4. Add-on Purchase Flow (Technical Implementation)

**Backend Changes:**
- Extend `lenco-payment` to accept `addon_key` parameter
- Create new payment type: `addon_purchase` vs `subscription`
- On successful payment, enable the add-on in `tenant_addons` table

**Frontend Changes:**
- Create `AddonPurchaseModal` component
- Update `ModulesMarketplace` with actionable buttons
- Add usage tracking display for metered add-ons

---

## Implementation Details

### Phase 1: Make Payments More Accessible

**Files to modify:**
- `src/components/dashboard/DashboardSidebar.tsx` - Add upgrade CTA for trial users
- `src/components/dashboard/UpgradePlanModal.tsx` - Connect to actual payment flow
- `src/components/dashboard/ModulesMarketplace.tsx` - Make "Upgrade" buttons work

**New Sidebar CTA (conceptual):**
```text
┌─────────────────────────────────────┐
│ [Sidebar content...]                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚡ Upgrade to Pro                │ │
│ │ 5 days left in trial            │ │
│ │ [Subscribe Now]                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Phase 2: Create Add-ons Purchase Experience

**New component: `AddonPurchaseModal`**
- Props: `addonKey`, `onSuccess`, `open`, `onOpenChange`
- Shows add-on details from `addon_definitions`
- Displays pricing (fixed monthly or per-unit)
- Uses Lenco Mobile Money payment flow
- On success: Updates `tenant_addons` and refreshes features

**Update `ModulesMarketplace`:**
- Each disabled add-on shows "K150/mo" or "K1/item" pricing
- "Activate" button opens `AddonPurchaseModal`
- Active add-ons show usage meter if applicable

### Phase 3: Educate Users About Add-ons

**Add-ons Info Section in Modules Page:**
```text
┌────────────────────────────────────────────────────────────┐
│ 📦 How Add-ons Work                                        │
│                                                            │
│ Your Pro plan includes:                                    │
│ • 500 inventory items (currently using 340)               │
│ • 500 WhatsApp messages/month                             │
│                                                            │
│ Need more? Purchase add-ons:                              │
│ • Extra inventory: K1 per item/month                      │
│ • Multi-Branch: K200/mo base + K100/branch                │
│ • Warehouse: K150/mo flat rate                            │
│                                                            │
│ [View All Add-ons]                                        │
└────────────────────────────────────────────────────────────┘
```

**Contextual limit warnings (new component: `UsageLimitBanner`):**
- Shows when user approaches 80% of any limit
- "You've used 450/500 inventory items this month"
- "Add more capacity" button → opens add-on purchase

### Phase 4: Backend Updates for Add-on Payments

**Update `lenco-payment/index.ts`:**
- Accept optional `addon_key` in request body
- If `addon_key` present, record as add-on purchase
- On webhook completion, call new RPC to enable add-on

**New database function: `activate_addon()`**
- Inserts/updates `tenant_addons` with `is_enabled = true`
- Syncs feature flags in `business_profiles` (for multi_branch, warehouse, etc.)

---

## User Journey Examples

### Journey 1: Trial User Upgrades to Paid
1. User sees trial banner: "5 days left"
2. Clicks "Upgrade Now"
3. PaymentModal opens with plan selection
4. Selects "Annual" billing, enters MTN phone
5. Approves on phone → Subscription active

### Journey 2: User Purchases Multi-Branch Add-on
1. User goes to Settings → Modules & Plans
2. Sees "Multi-Branch Management - K200/mo"
3. Clicks "Activate"
4. AddonPurchaseModal shows pricing details
5. Pays via Mobile Money
6. Add-on enabled, "Branches" appears in sidebar

### Journey 3: User Hits Inventory Limit
1. User tries to add product #501 (on Growth plan with 500 limit)
2. Toast shows: "Inventory limit reached. Add more capacity?"
3. Clicks link → opens AddonPurchaseModal for inventory add-on
4. Sees: "K1/item/month for items beyond 500"
5. Pays → Can now add unlimited items (billed per usage)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/AddonPurchaseModal.tsx` | Create | New modal for buying add-ons |
| `src/components/dashboard/UsageLimitBanner.tsx` | Create | Contextual limit warning component |
| `src/components/dashboard/SidebarUpgradeCTA.tsx` | Create | Sidebar upgrade prompt for trial users |
| `src/components/dashboard/ModulesMarketplace.tsx` | Modify | Add pricing and actionable buttons |
| `src/components/dashboard/UpgradePlanModal.tsx` | Modify | Connect to actual payment flow |
| `src/components/dashboard/DashboardSidebar.tsx` | Modify | Add upgrade CTA component |
| `supabase/functions/lenco-payment/index.ts` | Modify | Support add-on purchases |
| Database migration | Create | Add `activate_addon()` RPC function |

---

## Summary

This plan transforms the payment experience from "hidden on /pay page" to "everywhere users need it":

1. **Sidebar CTA** - Trial users see upgrade prompt constantly
2. **Working upgrade modals** - UpgradePlanModal actually processes payments
3. **Self-service add-ons** - Users can buy add-ons from Modules page
4. **Contextual prompts** - Hit a limit? See an upgrade option right there
5. **Clear pricing education** - Users understand what they're paying for

The same Lenco Mobile Money integration we just fixed will power all these flows.

