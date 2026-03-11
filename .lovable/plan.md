

# Fix: Tab Clicks Close the Job Card Edit Modal

## Problem Found During Testing

When clicking between tabs (Vehicle, Customer, Work, Pricing) in the edit modal, the modal closes immediately. This happens because the `TabsTrigger` components render as `<button>` elements inside a `<form>`. In HTML, buttons inside forms default to `type="submit"`, so clicking a tab triggers form submission, which calls `handleSubmit` → `mutation.mutate()` → `onSuccess()` → `handleModalClose()`.

This is the **actual root cause** of the "cannot edit" issue -- users literally cannot navigate to the Customer or Work tabs to make changes.

## Fix

**File: `src/components/dashboard/JobCardModal.tsx`**

Add `type="button"` to all four `TabsTrigger` elements so they don't accidentally submit the form:

```tsx
<TabsTrigger value="vehicle" type="button" className="gap-1">
<TabsTrigger value="customer" type="button" className="gap-1">
<TabsTrigger value="work" type="button" className="gap-1">
<TabsTrigger value="pricing" type="button" className="gap-1">
```

This is a 4-line change at lines 265, 269, 273, 277.

## Testing the Invoicing Stock Fix

I was unable to test the invoicing stock reduction because I could not navigate to an invoicing flow that involves products. However, the code changes are correct -- they mirror the proven `SalesRecorder` branch-aware pattern. I recommend the user test this manually by creating an invoice with a product and checking if inventory decreases.

