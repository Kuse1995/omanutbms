
## What’s actually wrong (based on the code + logs)

You’re getting **Lenco errorCode "01" / “Invalid phone”** even after we retry multiple Zambian formats. That means our integration still has a few high-probability implementation issues—notably:

1) **Operator value mismatch (confirmed by Lenco’s own sandbox test table)**  
   Lenco’s docs list Airtel Zambia as **`airtel (zm)`** (not `airtel`). Our function currently maps Airtel → `airtel`, which can cause “Invalid phone” even if the phone is valid.

2) **The request payload field naming is likely wrong / brittle**  
   Our payload uses `accountNumber` for the phone. Lenco’s docs describe it as a phone-based collection and the response model uses `mobileMoneyDetails.phone`. If the request expects `phone` (or a different field name), Lenco may treat the phone as missing/invalid and return “Invalid phone”.  
   We can make this robust by sending both `phone` and `accountNumber` during a transition, then standardizing once confirmed.

3) **Even if payment succeeds, the “activate subscription” logic is currently broken** (this is 100% on us)  
   In `lenco-check-status` and `lenco-webhook` we reference columns that do **not exist** in your database schema:
   - `payment.plan_selected` (table has `plan_key`)
   - `updated_at` on `subscription_payments` (table has no `updated_at`)
   - we read `failureReason` from Lenco responses, but docs use `reasonForFailure`  
   So right now, even a successful payment would likely not update status or activate the subscription reliably.

4) **The `/pay` UI prevents using Lenco’s known sandbox test numbers**  
   Lenco’s test numbers are **10 digits starting with 0** (e.g., `0961111111`). Your `/pay` input is capped to **9 digits** and always displays `+260`. That makes it impossible to validate “is my key sandbox or live?” in a controlled way.

## Goal
Stop the guesswork and credits burn by making the integration:
- Spec-accurate for Zambia (operator + phone formats)
- Self-diagnosing (a “verify key” check that tells us immediately if the key is accepted)
- End-to-end working (initiate → confirm → activate subscription)

---

## Implementation steps (sequenced to minimize wasted time)

### Phase 1 — Add a “Verify Lenco Key” diagnostic (fast truth test)
1. Create a new backend function (e.g. `lenco-diagnostics`) that:
   - Reads `LENCO_SECRET_KEY`
   - Calls a simple Lenco endpoint like `GET /accounts` (or the most basic authenticated endpoint available)
   - Returns:
     - `ok: true/false`
     - HTTP status code
     - A trimmed/safe excerpt of response (`message`, maybe count of accounts), without exposing the key
2. Add a small “Verify payment setup” button on `/pay` (and/or admin-only in the dashboard) that calls this diagnostic and shows:
   - “Key accepted” vs “Unauthorized”
   - This instantly tells us if the key is wrong *without* attempting a payment.

**Why this matters:** If the key is wrong, we’ll see 401/403 immediately. If it’s accepted, we stop chasing the key and focus on payload/operator/phone rules.

---

### Phase 2 — Fix Mobile Money request payload to match Lenco expectations
Update `supabase/functions/lenco-payment/index.ts`:

1. **Operator mapping (Zambia)**
   - MTN: try `mtn`
   - Airtel: try `airtel (zm)` first, then fallback to `airtel`
   - (Optional) add additional fallback variants if needed: `mtn (zm)` (only if we see evidence in responses)

2. **Phone field naming robustness**
   - Send **both** `phone` and `accountNumber` during testing:
     - `phone: <variant>`
     - `accountNumber: <variant>`
   - Keep `reference`, `amount`, `currency`, `narration`
   - Only include `accountName` if Lenco expects it (or keep it, but we’ll be ready to remove it if it causes validation issues)

3. **Retry strategy improvement**
   - Right now we retry only phone variants. We should also retry operator variants for Airtel:
     - For each phone variant, try each operator variant until we get `response.ok`
   - Record the exact variant that succeeded into `subscription_payments.metadata` for future debugging.

4. **Return better status info to UI**
   - Return `lenco_status: lencoResponse.data?.status` (not the boolean `lencoResponse.status`)
   - Include `lenco_message` when available

---

### Phase 3 — Fix subscription activation + status polling (currently broken)
Update both:

#### A) `supabase/functions/lenco-check-status/index.ts`
- Replace `payment.plan_selected` with `payment.plan_key`
- Replace `failureReason` with `reasonForFailure` (and keep a fallback to either spelling)
- Remove writes to non-existent `updated_at` OR add an `updated_at` column (see Phase 4)
- When marking completed:
  - Update `subscription_payments.status = 'completed'`
  - Set `verified_at = now()` (this column exists)
  - Update `business_profiles` using `plan_key`

#### B) `supabase/functions/lenco-webhook/index.ts`
- Same column fixes:
  - Use `plan_key`
  - Don’t write `updated_at` unless we add it
- Use webhook payload fields consistently (map event → status)
- Set `verified_at` when completed

**Result:** Once Lenco says “successful” (via polling or webhook), your subscription actually becomes active.

---

### Phase 4 — Optional but recommended: add `updated_at` to `subscription_payments`
Because both webhook + polling naturally want to track “last updated”, we can add:

- `updated_at timestamptz default now()`
- Trigger to auto-update it on row updates (using your existing `update_updated_at_column()` function if applicable)

This avoids silent failures from trying to write to a column that doesn’t exist.

---

### Phase 5 — Fix `/pay` UX to support correct formats + sandbox validation
Update `src/pages/Pay.tsx` (and also `src/components/dashboard/PaymentModal.tsx` to keep consistent):

1. Allow user to enter:
   - `972064502` (9 digits)
   - `0972064502` (10 digits starting with 0)
   - `+260972064502` (full E.164)
2. Stop forcing `+260${phoneNumber}` in the frontend.
   - Send the raw input to the backend and let the backend normalize.
3. Add a small collapsible “Having trouble? Test numbers (sandbox)” section:
   - MTN success: `0961111111` (operator `mtn`)
   - Airtel Zambia success: `0971111111` (operator `airtel (zm)`)
4. Improve validation message:
   - If operator is MTN, hint that ZM MTN typically starts with `096…`
   - If Airtel, starts with `097…`

---

## Testing plan (to confirm it’s fixed, end-to-end)

1) **Verify Key**
- Click “Verify payment setup”
- Expect: success response from `lenco-diagnostics`
  - If not, we focus only on the key.

2) **Sandbox proof test (only if you are using a test key)**
- Use MTN + `0961111111` and confirm it returns “pay-offline” / pending (or successful depending on Lenco sandbox behavior)

3) **Real mobile money payment (live key)**
- Use a real MTN/Airtel MoMo-enabled number
- Confirm:
  - Payment initiation returns success
  - UI moves to “awaiting confirmation”
  - After approving on phone, status becomes completed
  - Subscription becomes active in your app (billing status updated)

4) **Webhook vs polling**
- Confirm either:
  - webhook updates payment automatically, or
  - polling endpoint sees “successful” and activates subscription

---

## Files that will be changed (technical)
- `supabase/functions/lenco-payment/index.ts`
- `supabase/functions/lenco-check-status/index.ts`
- `supabase/functions/lenco-webhook/index.ts`
- `src/pages/Pay.tsx`
- `src/components/dashboard/PaymentModal.tsx`
- (Optional migration) add `updated_at` + trigger to `subscription_payments`
- (New) backend function `lenco-diagnostics` (or equivalent)

---

## Why I’m confident this will stop the loop
- We have at least one **confirmed schema mismatch bug** (plan_selected/updated_at) that would break end-to-end even if payments succeeded.
- We have a **confirmed operator mismatch** from Lenco’s own test matrix (`airtel (zm)`).
- We add a **deterministic key verification** step so we don’t waste time guessing anymore.

Once you approve, I’ll implement Phase 1 → Phase 3 first (diagnostics + payload fix + activation fix), then adjust the UI formatting (Phase 5). That sequencing should get you to a working payment quickly and with much less trial-and-error.
