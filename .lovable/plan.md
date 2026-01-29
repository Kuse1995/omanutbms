

# World-Class African SaaS - Phase 1 Implementation

## Overview
Transform Omanut BMS into an open, self-service SaaS platform for African businesses with:
- **Open signup** (removing the authorized_emails restriction)
- **7-day free trial** at registration
- **USD as base currency** with automatic local currency display
- **Multi-currency support** with geo-detection
- **Prepared Lenco payment placeholders** (to activate before launch)

---

## What's Changing

| Current State | New State |
|--------------|-----------|
| Requires pre-authorized email | Open signup for anyone |
| 14-day trial | 7-day trial |
| ZMW as base currency | USD as base currency |
| Single currency display | Auto-detected local currency |
| "Contact Sales" for payments | Payment UI ready (Lenco integration later) |

---

## Implementation Plan

### Phase 1: Database Schema Updates

**1.1 New Tables**

**subscription_payments** - Transaction history (ready for Lenco)
- `tenant_id` - Link to business
- `payment_reference` - External payment reference
- `amount` - Payment amount
- `currency` - Payment currency
- `status` - pending, completed, failed
- `payment_method` - card, mobile_money, bank_transfer
- `billing_period` - monthly, annual
- `provider` - lenco (for future)
- `metadata` - JSONB for provider data

**currency_configs** - African currency rates vs USD
- `country_code` - ISO country code
- `country_name` - Human-readable name
- `currency_code` - USD, ZMW, NGN, KES, etc.
- `currency_symbol` - $, K, ₦, KSh, etc.
- `exchange_rate` - Rate vs USD (USD = 1.0)
- `is_active` - Whether supported

**1.2 Modify business_profiles**
- Add `detected_country` (text)
- Add `preferred_currency` (text, default 'USD')
- Add `payment_provider_customer_id` (text) - for Lenco later

**1.3 Update handle_new_user() Trigger**
- Remove check for authorized_emails on signup
- Set `billing_status = 'trial'` automatically
- Set `trial_expires_at = NOW() + 7 days`
- Set `billing_plan = 'starter'` as default

### Phase 2: Multi-Currency System

**2.1 Currency Configuration**

| Country | Code | Symbol | Rate (vs USD) |
|---------|------|--------|---------------|
| USA (Base) | USD | $ | 1.00 |
| Zambia | ZMW | K | 27.50 |
| Nigeria | NGN | ₦ | 1,550.00 |
| Kenya | KES | KSh | 128.00 |
| South Africa | ZAR | R | 18.50 |
| Ghana | GHS | GH₵ | 15.80 |
| Tanzania | TZS | TSh | 2,685.00 |
| Uganda | UGX | USh | 3,680.00 |
| Rwanda | RWF | FRw | 1,320.00 |
| Botswana | BWP | P | 13.60 |
| UK | GBP | £ | 0.79 |
| EU | EUR | € | 0.92 |

**2.2 USD Base Pricing**

| Plan | Monthly USD | Annual USD |
|------|-------------|------------|
| Starter | $9 | $96 (~$8/mo) |
| Pro | $29 | $290 (~$24/mo) |
| Enterprise | $79 | $850 (~$71/mo) |

**2.3 Price Calculation**
```
Local Price = USD Price × Exchange Rate
Example: Starter in Zambia = $9 × 27.50 = K247.50
```

### Phase 3: Open Signup Flow

**3.1 Remove Authorization Check**
- Update `Auth.tsx` to skip `checkAuthorizedEmail()` for signups
- Keep authorization check ONLY for existing tenant member invites
- New signups create their own tenant automatically

**3.2 Enhanced Signup Form**
- Company name field (required)
- Auto-detect country via IP geolocation
- Business type selector
- Plan selection (pre-selected from URL)
- Terms of service checkbox

**3.3 Geo-Detection Hook**
Create `useGeoLocation.ts`:
- Call free IP geolocation API on mount
- Return country code and currency
- Cache result in localStorage
- Fallback to USD if detection fails

### Phase 4: Trial System Updates

**4.1 Billing Plans Config**
- Change `trialDays` from 14 to 7 for all plans
- Change `currency` from "ZMW" to "USD"
- Update price values to USD equivalents

**4.2 Trial Banner Updates**
- Keep existing `TrialBanner.tsx` logic
- Already handles countdown correctly
- "Upgrade Now" button ready for payment modal

**4.3 Trial Expiration**
- Existing `trial_expires_at` column will be set automatically
- Grace period: 3 days read-only access after expiry
- Full data retained for 30 days

### Phase 5: Payment UI Preparation

**5.1 Update UpgradePlanModal**
- Replace "Contact Sales" with "Subscribe Now" button
- Add placeholder for Lenco payment widget
- Show "Coming Soon" or "Contact Us" until Lenco keys added

**5.2 Create SubscriptionManager Component**
- Current plan display
- Trial status and countdown
- Payment history (empty initially)
- "Manage Subscription" placeholder

**5.3 Payment Modal Placeholder**
- UI structure for Lenco inline widget
- Currency selector
- Payment method tabs (Card, Mobile Money)
- Disabled state until Lenco integration

### Phase 6: Pricing Display Updates

**6.1 Format Price Function**
```javascript
formatPrice(amount: number, currency: string = "USD"): string {
  const config = CURRENCY_CONFIGS[currency];
  return `${config.symbol}${(amount * config.rate).toLocaleString()}`;
}
```

**6.2 PricingSection Updates**
- Add currency selector dropdown
- Auto-select based on detected country
- Show prices in local currency
- Display USD equivalent in tooltip

**6.3 Plan Comparison Table**
- Update to show selected currency
- Add "Prices shown in [Currency]" label

---

## Technical Implementation

### Files to Create

1. **`src/lib/currency-config.ts`**
   - Currency definitions and exchange rates
   - Price formatting utilities
   - Geo-to-currency mapping

2. **`src/hooks/useGeoLocation.ts`**
   - IP-based country detection
   - Currency preference management
   - LocalStorage caching

3. **`src/hooks/useSubscription.ts`**
   - Subscription status and management
   - Payment history queries
   - Upgrade/downgrade logic

4. **`src/components/dashboard/SubscriptionManager.tsx`**
   - Subscription dashboard widget
   - Plan and billing info display

5. **`src/components/dashboard/PaymentModal.tsx`**
   - Payment UI placeholder
   - Ready for Lenco widget integration

6. **`supabase/functions/lenco-payment-init/index.ts`**
   - Placeholder edge function
   - Returns "Coming Soon" until keys added

### Files to Modify

1. **`src/lib/billing-plans.ts`**
   - Change `currency` to "USD"
   - Update prices to USD values
   - Change `trialDays` to 7

2. **`src/pages/Auth.tsx`**
   - Remove `checkAuthorizedEmail()` for signup
   - Add country detection
   - Add business type selection

3. **`src/hooks/useAuth.tsx`**
   - Remove authorization check export for signup
   - Keep for existing member validation

4. **`src/components/landing/PricingSection.tsx`**
   - Add currency selector
   - Use geo-detected currency
   - Format prices with exchange rate

5. **`src/components/dashboard/UpgradePlanModal.tsx`**
   - Replace email links with payment placeholders
   - Add currency display

6. **`src/components/dashboard/TrialBanner.tsx`**
   - No major changes needed
   - Already works with 7-day trial

### Database Migration
- Create `currency_configs` table with seed data
- Create `subscription_payments` table
- Add new columns to `business_profiles`
- Update `handle_new_user()` trigger for open signup

---

## Lenco Integration (Deferred to Launch)

When ready to integrate Lenco, you'll need to:

1. **Add Secrets**
   - `LENCO_PUBLIC_KEY` - For frontend widget
   - `LENCO_SECRET_KEY` - For backend verification

2. **Complete Edge Functions**
   - `lenco-payment-init` - Initialize payment session
   - `lenco-payment-verify` - Verify completed payment
   - `lenco-webhook` - Handle payment notifications

3. **Enable PaymentModal**
   - Remove "Coming Soon" state
   - Integrate Lenco inline widget
   - Connect success/failure handlers

---

## Summary

| Component | Action |
|-----------|--------|
| Signup | Open to anyone (remove auth check) |
| Trial | 7 days automatic |
| Base Currency | USD |
| Local Currency | Auto-detected from IP |
| Pricing | Converted using exchange rates |
| Payments | UI ready, Lenco integration deferred |
| Trigger | Updated for auto trial activation |

