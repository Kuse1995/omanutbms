

# Lenco Payment Integration Plan

## Overview

This plan integrates Lenco payment processing to enable real payments via **Mobile Money** (MTN, Airtel), **Card**, and **Bank Transfer** for subscription billing. The integration uses Lenco's v2.0 API with edge functions for secure server-side processing.

---

## Prerequisites

Before implementation, you'll need to obtain your **Lenco API credentials**:

1. **Create a Lenco Business Account** at [lenco.co/zm](https://lenco.co/zm) (Zambia) or the relevant country portal
2. **Request API Access** via the Developer Portal or by contacting support@lenco.co
3. **Get your credentials**:
   - **Secret Key** (Bearer token for API authentication)
   - **Public Key** (for client-side checkout, if using hosted checkout)
   - **Webhook Secret** (for verifying webhook signatures)

---

## Architecture

```text
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   PaymentModal  │ ──────► │  Edge Function   │ ──────► │   Lenco API     │
│   (Frontend)    │         │ (lenco-payment)  │         │   (v2.0)        │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ subscription_    │
                            │ payments table   │
                            └──────────────────┘
                                     │
                                     ▲
┌─────────────────┐         ┌──────────────────┐
│   Webhook       │ ──────► │  Edge Function   │
│   (Lenco)       │         │ (lenco-webhook)  │
└─────────────────┘         └──────────────────┘
```

---

## Task 1: Add Lenco Secrets

Add the following secrets to your project:

| Secret Name | Description |
|-------------|-------------|
| `LENCO_SECRET_KEY` | Your Lenco API Bearer token (starts with `xo+...`) |
| `LENCO_PUBLIC_KEY` | Public key for client-side (optional, for hosted checkout) |
| `LENCO_WEBHOOK_SECRET` | Secret for verifying webhook signatures |

---

## Task 2: Create Payment Initiation Edge Function

Create `supabase/functions/lenco-payment/index.ts` to handle:

**Mobile Money Collections**
- Endpoint: `POST /access/v2/collections/mobile-money`
- Supports: MTN, Airtel (Zambia), TNM (Malawi)
- Flow: Customer receives push notification to authorize on phone

**Card Collections** (requires PCI DSS compliance)
- Endpoint: `POST /access/v2/collections/card`
- Requires: JWE encryption of card details
- Flow: May redirect for 3DS authentication

**Virtual Account for Bank Transfers**
- Endpoint: `POST /access/v2/virtual-accounts`
- Flow: Generate a virtual account number for customer to transfer to

### Edge Function Logic

```typescript
// supabase/functions/lenco-payment/index.ts

// 1. Authenticate user via JWT
// 2. Validate tenant and plan selection
// 3. Generate unique payment reference
// 4. Create pending subscription_payment record
// 5. Call Lenco API based on payment method
// 6. Return payment instructions/redirect URL to frontend
```

---

## Task 3: Create Webhook Handler Edge Function

Create `supabase/functions/lenco-webhook/index.ts` to:

1. Verify webhook signature
2. Parse payment status (successful, failed, pending)
3. Update `subscription_payments` record
4. If successful, update `business_profiles.billing_status` to "active"
5. Set `billing_start_date` and calculate `billing_end_date`
6. Send confirmation email (optional)

---

## Task 4: Update PaymentModal UI

Enhance `src/components/dashboard/PaymentModal.tsx`:

### Mobile Money Tab
- Phone number input with country code (+260 for Zambia)
- Operator selection (MTN / Airtel dropdown)
- "Pay Now" button triggers payment request
- Show "Check your phone to authorize payment" message
- Poll for status or await webhook confirmation

### Card Tab
- Card number, expiry, CVV inputs
- Billing address fields (required for 3DS)
- "Pay with Card" button
- Handle 3DS redirect if needed

### Bank Transfer Tab
- Display generated virtual account details
- Show bank name, account number, amount
- "I've made the transfer" button to check status

---

## Task 5: Database Updates

Add Lenco-specific columns to `subscription_payments`:

```sql
ALTER TABLE subscription_payments
ADD COLUMN lenco_reference text,
ADD COLUMN phone_number text,
ADD COLUMN operator text,
ADD COLUMN failure_reason text;
```

---

## Task 6: Payment Status Polling (Optional)

For better UX, implement status polling in the frontend:

```typescript
// Poll GET /access/v2/collections/:reference every 5 seconds
// Until status changes from "pay-offline" to "successful" or "failed"
```

---

## Implementation Files Summary

| File | Purpose |
|------|---------|
| **Secrets** | `LENCO_SECRET_KEY`, `LENCO_PUBLIC_KEY`, `LENCO_WEBHOOK_SECRET` |
| `supabase/functions/lenco-payment/index.ts` | Initiate payments (mobile, card, bank) |
| `supabase/functions/lenco-webhook/index.ts` | Handle payment status webhooks |
| `src/components/dashboard/PaymentModal.tsx` | Updated UI with payment forms |
| **Database migration** | Add Lenco tracking columns to `subscription_payments` |

---

## Security Considerations

- **PCI DSS**: Card payments require encryption using Lenco's JWE process. Consider using Lenco's hosted checkout page instead of handling raw card data
- **Webhook Verification**: Always validate webhook signatures to prevent spoofing
- **Server-Side Only**: API secret key must NEVER be exposed to the frontend
- **Rate Limiting**: Implement rate limits to prevent abuse

---

## Testing

Lenco provides sandbox credentials for testing:
- Use test phone numbers from [Lenco's test accounts](https://lenco-api.readme.io/v2.0/reference/test-cards-and-accounts)
- Test cards with specific numbers trigger different scenarios (success, 3DS, decline)

---

## Next Steps

1. **You provide Lenco API credentials** (or I'll help you add them via the secrets tool)
2. I'll create the edge functions with full Lenco API integration
3. I'll update the PaymentModal with working payment forms
4. We'll test end-to-end with sandbox credentials

Would you like me to proceed with this plan? If you already have your Lenco credentials, I can set up the secrets first.

