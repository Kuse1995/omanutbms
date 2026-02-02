
# Payment Status Feedback & Timeout Reminder Improvements

## What you're asking for

1. **Insufficient balance** → Show the failure reason ("Insufficient funds") on the computer screen
2. **User takes too long to enter PIN** → Remind them to enter the PIN or try again

---

## Current Behavior

The payment flow currently:
- Polls every 5 seconds for status updates via `lenco-check-status`
- Shows "Waiting for confirmation..." while polling
- Transitions to "Payment Failed" only when `status === "failed"`

**Problem 1**: The backend correctly detects `expired` status (when user doesn't enter PIN in time) but the frontend only checks for `"failed"` — it ignores `"expired"`.

**Problem 2**: There's no visible timer or reminder during the waiting period.

---

## Implementation Plan

### 1. Handle `expired` status in the UI

Update the polling logic in both `Pay.tsx` and `PaymentModal.tsx`:

```typescript
// Current code (misses expired)
if (response.data?.status === "failed") {
  setPaymentStatus("failed");
  setErrorMessage(response.data?.failure_reason || "Payment failed");
}

// Fixed code (handles both)
if (response.data?.status === "failed" || response.data?.status === "expired") {
  setPaymentStatus("failed");
  setErrorMessage(response.data?.failure_reason || "Payment failed or expired");
}
```

### 2. Add a countdown timer + PIN reminder

When payment enters `awaiting_confirmation`, start a visible countdown (e.g., 2 minutes):

- **Display**: "Enter your PIN within X:XX" with a decreasing timer
- **At 60 seconds**: Show a warning "Time running out! Enter your PIN now"
- **At 0**: Show "Payment may have expired. Check your phone or try again"

Technical approach:
- Add `waitStartTime` state when entering `awaiting_confirmation`
- Add a `useEffect` with a 1-second interval to update remaining time
- Display countdown in the "Check your phone" UI
- Show progressive urgency as time decreases

### 3. Improve failure messages for common scenarios

Map specific failure reasons to friendlier messages:

| Lenco Response | Display to User |
|----------------|-----------------|
| `Insufficient funds` | "Insufficient balance on your phone. Please top up and try again." |
| `Payment request expired` | "You didn't enter your PIN in time. Please try again." |
| `User declined` | "You cancelled the payment on your phone." |
| Default | Original message from Lenco |

---

## Files to be modified

| File | Changes |
|------|---------|
| `src/pages/Pay.tsx` | Add expired status handling, countdown timer, friendly error messages |
| `src/components/dashboard/PaymentModal.tsx` | Same changes for consistency |

---

## Awaiting Confirmation UI Preview

```text
┌────────────────────────────────────┐
│         📱 Check your phone        │
│                                    │
│   Authorize the payment on your    │
│   MTN phone to complete            │
│                                    │
│   ⏱️ Enter PIN within 1:45         │
│                                    │
│   ⟳ Waiting for confirmation...   │
│                                    │
│   [Cancel Payment]                 │
└────────────────────────────────────┘
```

When time runs low (< 30 seconds):
```text
│   ⚠️ Time running out! (0:28)      │
│   Enter your PIN now               │
```

---

## Technical Details

### New state variables needed:
```typescript
const [waitStartTime, setWaitStartTime] = useState<Date | null>(null);
const [remainingSeconds, setRemainingSeconds] = useState<number>(120); // 2 min default
```

### Countdown effect:
```typescript
useEffect(() => {
  if (paymentStatus !== "awaiting_confirmation" || !waitStartTime) return;
  
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - waitStartTime.getTime()) / 1000);
    const remaining = Math.max(0, 120 - elapsed);
    setRemainingSeconds(remaining);
    
    if (remaining === 0) {
      // Don't auto-fail, just show warning (Lenco may still accept)
    }
  }, 1000);
  
  return () => clearInterval(interval);
}, [paymentStatus, waitStartTime]);
```

### Friendly error message mapper:
```typescript
const getFriendlyErrorMessage = (reason: string | null): string => {
  if (!reason) return "Something went wrong. Please try again.";
  const lower = reason.toLowerCase();
  if (lower.includes("insufficient")) return "Insufficient balance. Please top up and try again.";
  if (lower.includes("expired")) return "You didn't enter your PIN in time. Please try again.";
  if (lower.includes("declined") || lower.includes("cancelled")) return "You cancelled the payment.";
  return reason;
};
```

---

## Summary

This plan adds:
1. Proper handling of `expired` payment status
2. A visible countdown timer during PIN entry wait
3. Friendly, actionable error messages for common failures
4. A cancel button during the waiting period

The insufficient balance error you just experienced should now display correctly on screen, and future users will see a helpful timer reminding them to enter their PIN quickly.
