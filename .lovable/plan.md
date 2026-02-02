
# Fix Payment Accessibility Pricing Inconsistencies

## Issues Identified

### 1. Multiple Pricing Sources Causing Conflicts

| Component | Price Source | Current Values |
|-----------|-------------|----------------|
| `/pay` page | `useBillingPlans()` → DB `billing_plan_configs` | Starter K299, Pro K799, Enterprise K1999 |
| `PaymentModal` | `useBillingPlans()` → DB | Same as above (correct) |
| `UpgradePlanModal` | `useBillingPlans()` → DB | Same, but uses `formatPrice()` which assumes ZMW |
| `ModulesMarketplace` | Hardcoded `modules-config.ts` | K150, K350, K300, etc. (outdated) |
| `AddonPurchaseModal` | DB `addon_definitions` | K200, K150, K1/item, etc. |

### 2. Incorrect Module-to-Addon Mapping

In `ModulesMarketplace.tsx`, the mapping is wrong:
```typescript
const moduleToAddonMap: Record<string, string> = {
  'inventory': 'inventory_items',      // OK
  'warehouse': 'warehouse_management', // OK
  'agents': 'multi_branch',            // WRONG - agents module ≠ multi_branch addon
  'website_cms': 'whatsapp_messages',  // WRONG - website ≠ whatsapp
};
```

### 3. Zero Price Display for Usage-Based Add-ons

Add-ons like `inventory_items` and `whatsapp_messages` have `monthly_price: 0` because they're usage-based. The modal shows "K0/month" instead of "K1/item".

---

## Fix Plan

### Fix 1: Correct ModulesMarketplace Module-to-Addon Mapping

Remove the incorrect mapping and only show activate buttons for add-ons that actually exist in the database:

```typescript
// REMOVE incorrect static mapping
// Instead, match by feature key or leave without "Activate" button
const getAddonForModule = (module: ModuleDefinition): AddonDefinition | undefined => {
  // Only map modules that have direct addon equivalents
  const directMappings: Record<string, string> = {
    'inventory': 'inventory_items',
    'warehouse': 'warehouse_management',
  };
  const addonKey = directMappings[module.moduleKey];
  return addonKey ? addons.find(a => a.addon_key === addonKey) : undefined;
};
```

### Fix 2: Fix AddonPurchaseModal Price Display

Show usage-based pricing correctly:

```typescript
// Current (broken for usage-based)
const price = addon.monthly_price || addon.unit_price || 0;

// Fixed
const hasMonthlyPrice = addon.monthly_price && addon.monthly_price > 0;
const displayPrice = hasMonthlyPrice ? addon.monthly_price : addon.unit_price || 0;
const priceLabel = hasMonthlyPrice 
  ? `/month` 
  : `/${addon.unit_label || "unit"}`;
```

### Fix 3: Remove Hardcoded Prices from modules-config.ts

The `pricing.monthlyPriceZMW` values in `modules-config.ts` are outdated and conflict with database values. Either:
- Remove them entirely (rely on DB)
- Or sync them with the database

I recommend removing the hardcoded prices since we fetch from `addon_definitions` anyway.

### Fix 4: Fix SidebarUpgradeCTA Integration

Currently works correctly - opens `PaymentModal` which uses the right pricing.

### Fix 5: Ensure Consistent Currency Handling

In `PaymentModal.tsx`, the currency handling has a bug:
```typescript
// Line 144 sends currency from useGeoLocation
currency: currency || "USD",  // Could be "ZMW" or other
```

But the prices from `useBillingPlans()` are already in ZMW (from database). If `currency` is set to something else, the backend may misinterpret it.

**Fix:** Always send `currency: "ZMW"` since that's what the database prices are in (matching what `/pay` page does).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/ModulesMarketplace.tsx` | Fix module-to-addon mapping, remove incorrect associations |
| `src/components/dashboard/AddonPurchaseModal.tsx` | Fix usage-based price display |
| `src/lib/modules-config.ts` | Remove hardcoded `monthlyPriceZMW` values or mark as deprecated |
| `src/components/dashboard/PaymentModal.tsx` | Hardcode currency to ZMW to match DB pricing |
| `src/components/dashboard/UsageLimitBanner.tsx` | Ensure addon prop is correctly passed |

---

## Technical Details

### ModulesMarketplace.tsx Changes

```typescript
// Line 206-214 - Replace with:
const getAddonForModule = (module: ModuleDefinition): AddonDefinition | undefined => {
  // Only modules with direct addon equivalents
  // Multi-branch and WhatsApp are standalone add-ons, not module upgrades
  const validMappings: Record<string, string> = {
    'inventory': 'inventory_items',
    'warehouse': 'warehouse_management',
  };
  const addonKey = validMappings[module.moduleKey];
  return addonKey ? addons.find(a => a.addon_key === addonKey) : undefined;
};
```

### AddonPurchaseModal.tsx Changes

```typescript
// Around line 170 - Fix price calculation
const hasFixedPrice = addon.pricing_type === "fixed" && addon.monthly_price && addon.monthly_price > 0;
const isUsageBased = addon.pricing_type === "per_unit" || addon.pricing_type === "usage";

const displayPrice = hasFixedPrice 
  ? addon.monthly_price 
  : (addon.unit_price || 0);

const priceLabel = hasFixedPrice 
  ? "/month" 
  : `/${addon.unit_label || "unit"}`;

// In payment button
<Button className="w-full" onClick={handlePayment}>
  {hasFixedPrice 
    ? `Pay K${displayPrice.toLocaleString()}/month`
    : `Activate (K${displayPrice}/${addon.unit_label || "unit"})`
  }
</Button>
```

### PaymentModal.tsx Currency Fix

```typescript
// Line 144 - Change from:
currency: currency || "USD",
// To:
currency: "ZMW",  // Prices in billing_plan_configs are in ZMW
```

---

## Summary

The root cause is **multiple pricing sources that have drifted out of sync**:
1. Database `billing_plan_configs` has ZMW prices (K299, K799, K1999)
2. Code defaults in `billing-plans.ts` have USD prices ($9, $29, $79)
3. Hardcoded values in `modules-config.ts` have different ZMW prices (K150, K350, etc.)
4. Database `addon_definitions` has the actual addon prices

The fix ensures:
- All subscription payments use database prices (via `useBillingPlans()`)
- Add-on purchases use `addon_definitions` prices
- Currency is consistently ZMW for Zambia deployment
- Usage-based add-ons display correctly (e.g., "K1/item" not "K0/month")
- Only valid module-addon mappings show "Activate" buttons
