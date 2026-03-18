

# Default Billing Period to Monthly

## Change
One-line fix in `src/pages/Pay.tsx` line 64:

Change the `billingPeriod` initial state from `"annual"` to `"monthly"`:

```typescript
const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
```

Also update the `SubscriptionRequiredModal` to show monthly prices (it already does — it displays `plan.monthlyPrice` with `/mo`), so no changes needed there.

## Files
- `src/pages/Pay.tsx` — change default state value on line 64

