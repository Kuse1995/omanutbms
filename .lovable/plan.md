

# Plan: Simplify Payment to Zambian Mobile Money Only

## Overview

Focus the `/pay` page on Zambian Mobile Money payments only, with "Coming Soon" badges for Card and Bank Transfer options. This simplifies the payment experience while the Lenco integration is being configured correctly.

## Current Situation

Based on the backend logs, the Lenco API is rejecting all phone number formats:
```
Phone variants tried: ["0972064502","260972064502","+260972064502"]
All returning: { errorCode: "01", message: "Invalid phone" }
```

This suggests the Lenco Zambia mobile money collection may require additional configuration or account setup with Lenco.

## Changes

### 1. Update Pay.tsx - Payment Tab UI

**Simplify the payment tab interface:**
- Keep Mobile Money tab fully functional
- Disable Card and Bank tabs with "Coming Soon" overlays
- Lock currency selector to Zambia (ZMW) only for now
- Remove ability to select non-ZMW currencies

### 2. UI Changes for Card Tab

Replace the card payment form with a "Coming Soon" message:
```tsx
<TabsContent value="card" className="space-y-4">
  <div className="p-8 text-center border-2 border-dashed rounded-lg">
    <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
    <Badge variant="secondary" className="mb-2">Coming Soon</Badge>
    <p className="text-sm text-muted-foreground">
      Card payments will be available soon. Use Mobile Money for now.
    </p>
  </div>
</TabsContent>
```

### 3. UI Changes for Bank Transfer Tab

Replace the bank transfer form with a "Coming Soon" message:
```tsx
<TabsContent value="bank" className="space-y-4">
  <div className="p-8 text-center border-2 border-dashed rounded-lg">
    <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
    <Badge variant="secondary" className="mb-2">Coming Soon</Badge>
    <p className="text-sm text-muted-foreground">
      Bank transfers will be available soon. Use Mobile Money for now.
    </p>
  </div>
</TabsContent>
```

### 4. Lock Currency to Zambia

- Remove or disable the currency selector
- Force currency to ZMW for all payments
- Display "Payments available in Zambia only" message

### 5. Improve Mobile Money UX

- Auto-focus phone number input
- Better validation feedback
- Clearer operator selection (MTN/Airtel)

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Pay.tsx` | Replace Card/Bank tabs with "Coming Soon" UI, lock currency to ZM |

### Mobile Money Tab Enhancements

- Keep the current Mobile Money implementation
- Ensure proper error handling for Lenco failures
- Display helpful message when payment fails ("Please contact support if this persists")

## Expected Outcome

1. Users see a focused, clean payment page
2. Mobile Money is the primary (and only active) payment method
3. Card and Bank show clear "Coming Soon" messaging
4. Currency is locked to ZMW (Zambia)
5. No confusion about which payment methods work

## Note on Lenco Integration

The "Invalid phone" errors suggest the Lenco account may need:
- Zambia mobile money collection to be enabled
- Correct network configuration (MTN Zambia, Airtel Zambia)
- Account verification with Lenco support

This is a backend/account configuration issue that should be addressed with Lenco support separately.

