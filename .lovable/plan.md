
# Plan: Fix Trial/Onboarding + Payment Gateway Issues

## Issues Identified

### Issue 1: Wrong Amount on Payment Buttons
**Location**: `src/components/dashboard/PaymentModal.tsx` line 56, `src/pages/Pay.tsx` buttons

**Problem**: The PaymentModal price calculation has a bug:
```typescript
// WRONG - Monthly period is multiplied by 12
const price = billingPeriod === "annual" ? planData.annualPrice : planData.monthlyPrice * 12;
```

For monthly billing, it multiplies `monthlyPrice * 12`, which is incorrect. A monthly payment should just be `monthlyPrice`.

Additionally, the display uses `formatLocalPrice()` which applies exchange rate conversion, but the database prices are already in ZMW (K799/month for Pro). This causes double conversion.

**Database prices (from billing_plan_configs)**:
- Starter: K299/month, K3,000/year (ZMW)
- Pro/Growth: K799/month, K9,000/year (ZMW)
- Enterprise: K1,999/month, K22,999/year (ZMW)

### Issue 2: Payment Gateway Error - "Invalid phone"
**Location**: Edge function `lenco-payment/index.ts`

**Problem**: The Lenco mobile money API returns "Invalid phone" error. Looking at the logs:
```
Lenco mobile money error: { status: false, errorCode: "01", message: "Invalid phone", data: null }
```

The phone number format may not match Lenco's expected format. Current code sends:
```typescript
accountNumber: phone_number,  // e.g., "+260972064502"
```

Lenco API might expect:
- Numbers without the "+" prefix
- Different format for Zambian numbers
- A specific format like "260972064502" (without +)

### Issue 3: Currency Confusion in Price Display
**Location**: Multiple payment UI components

**Problem**: The system has two pricing sources:
1. **Code defaults** (`billing-plans.ts`): Prices in USD ($29/month for Pro)
2. **Database overrides** (`billing_plan_configs`): Prices in ZMW (K799/month for Pro)

The `formatLocalPrice()` function always applies exchange rate conversion from USD to local currency, but when prices come from the database in ZMW, this double-converts them.

---

## Technical Fixes

### File 1: `src/components/dashboard/PaymentModal.tsx`

**Fix price calculation** (line 56):
```typescript
// BEFORE (WRONG)
const price = billingPeriod === "annual" ? planData.annualPrice : planData.monthlyPrice * 12;

// AFTER (CORRECT)
const price = billingPeriod === "annual" ? planData.annualPrice : planData.monthlyPrice;
```

**Fix price display** to respect native currency:
```typescript
const planCurrency = planData?.currency || "USD";
const pricesAreLocal = planCurrency === "ZMW";

// In button and price display:
{pricesAreLocal 
  ? `K${price.toLocaleString()}` 
  : formatLocalPrice(price, countryCode)}
```

### File 2: `src/pages/Pay.tsx`

The Pay page already has the `pricesAreLocal` logic (lines 66-67), but needs to be applied consistently to ALL buttons.

**Update Mobile Money button** (around line 460):
```typescript
<Button className="w-full" onClick={handleMobileMoneyPayment}>
  Pay {pricesAreLocal ? `K${price?.toLocaleString()}` : formatLocalPrice(price || 0, countryCode)}
</Button>
```

**Update Card button and Bank button** similarly.

### File 3: `supabase/functions/lenco-payment/index.ts`

**Fix phone number formatting** for Lenco API:

```typescript
// Normalize phone number for Lenco (remove + prefix)
const normalizedPhone = phone_number?.startsWith("+") 
  ? phone_number.slice(1)  // Remove + prefix
  : phone_number?.startsWith("260")
    ? phone_number
    : `260${phone_number}`;

const mobileMoneyPayload = {
  reference,
  amount: amount.toString(),
  currency: currencyCode === "ZMW" ? "ZMW" : "USD",
  accountNumber: normalizedPhone,  // Use normalized phone
  accountName: userEmail,
  narration: `${plan} subscription - ${billing_period}`,
  network: operator?.toUpperCase() || "MTN",
};
```

---

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `PaymentModal.tsx` | Wrong price calc (monthly * 12) | Remove the `* 12` multiplication |
| `PaymentModal.tsx` | Double currency conversion | Add `pricesAreLocal` check like Pay.tsx |
| `Pay.tsx` | Button amounts may not use native price | Ensure all buttons use `pricesAreLocal` format |
| `lenco-payment/index.ts` | Phone format rejected by Lenco | Normalize phone to remove "+" prefix |

---

## Expected Outcome

After these fixes:
1. **Monthly payments show correct price**: K799 instead of K9,588 (799*12)
2. **No double currency conversion**: K799 stays as K799, not converted again
3. **Mobile money payments work**: Phone number format matches Lenco's expectations
4. **Consistent pricing across all buttons**: Pay button, Mobile Money, Card, and Bank Transfer all show the same correct amount
