
# Fix All Four Handover System Issues

## The Four Problems Being Fixed

### Issue 1 — Double-Margin Bug on Fixed Price (Critical)
When loading an existing fixed-price order, line 276 of `CustomDesignWizard.tsx` does:
```typescript
fixedPrice: (order as any).pricing_mode === 'fixed' ? (order.quoted_price || 0) : 0,
```
`quoted_price` already has the margin baked in (e.g. fixedPrice=100, margin=30% → quoted_price=130). When the order is loaded and saved again, the save logic applies the margin again to this 130 value, resulting in 130×1.30 = 169. The customer gets overcharged on every resave.

The fix: store a separate `fixed_price_base` column in the database so the pre-margin value is always available, OR on load, reverse-calculate the base by dividing `quoted_price / (1 + margin/100)`. The simpler, zero-migration approach is to add a `fixed_price` column to `custom_orders` and write it at save time. On load, use `order.fixed_price` when it exists, falling back to the reverse-calculated value.

**Database migration needed**: Add `fixed_price` column to `custom_orders` table.

### Issue 2 — Alteration Step Labels in HandoffConfigPanel (UX Bug)
`HandoffConfigPanel` always shows 5 custom-order step options (After Client Info → After Sketches), but alteration orders only have 3 meaningful handoff points (Client Info, Alteration Details, Measurements). This misleads the admin when setting up handoffs on alteration orders.

The fix: pass the `orderType` prop into `HandoffConfigPanel` and switch between two `STEP_OPTIONS` arrays — one for custom orders and one for alterations.

### Issue 3 — AssignedOrdersSection Hidden from Multi-Role Users
In `CustomOrdersManager.tsx` line 349:
```tsx
{isOperationsRole && (
  <AssignedOrdersSection onContinueOrder={handleContinueOrder} />
)}
```
Users who are admins but also have orders assigned to them (or users whose role resolves differently) never see this section. The real condition should be: show the section if the current user has any assigned orders, regardless of role. The `AssignedOrdersSection` already queries by `assigned_operations_user_id = user.id` so it returns nothing if there are no assignments — making it safe to always render it.

The fix: remove the `isOperationsRole` gate. The component already handles the empty-state by returning `null`.

### Issue 4 — Orders Stuck "In Progress" if Wizard Closed Without Saving
When an ops manager clicks "Pick Up", the status immediately becomes `in_progress`. If they close the wizard without saving, the order stays stuck in `in_progress` with no way to revert except manual DB intervention.

The fix: track whether "Pick Up" was just performed in this session (using a ref or state in the wizard). When the wizard's `onClose` fires without a successful save (`isSubmitting` / `isSavingDraft` never completed), check if this session changed the status to `in_progress` and, if so, revert it back to `pending_handoff`.

---

## Technical Implementation

### Files Modified

**1. Database migration** — Add `fixed_price` column:
```sql
ALTER TABLE public.custom_orders 
ADD COLUMN IF NOT EXISTS fixed_price numeric(12,2) DEFAULT NULL;
```
No RLS changes needed — the column inherits existing policies.

**2. `src/components/dashboard/CustomDesignWizard.tsx`**

*Fix 1 — Load base price correctly:*
```typescript
// Line 276 — change from:
fixedPrice: (order as any).pricing_mode === 'fixed' ? (order.quoted_price || 0) : 0,
// To:
fixedPrice: (order as any).pricing_mode === 'fixed' 
  ? ((order as any).fixed_price || 0)   // use stored base if available
  : 0,
```

*Fix 1 — Save base price alongside quoted price:*
Add `fixed_price: formData.pricingMode === 'fixed' ? formData.fixedPrice : null` to both the draft save payload and the full submit payload (in both `handleSaveDraft` and `handleSubmit`).

*Fix 4 — Release order on abandoned close:*
- Add a `pickedUpThisSession` ref (useRef) that gets set to the orderId when the user clicks "Pick Up" from inside the wizard flow.
- Wrap `onClose` in a `handleClose` function that checks: if `pickedUpThisSession.current` is set AND the wizard is closing without a completed save, call Supabase to revert `handoff_status` back to `pending_handoff`.
- Clear `pickedUpThisSession.current` after a successful save so normal saves don't revert.

**3. `src/components/dashboard/HandoffConfigPanel.tsx`**

*Fix 2 — Order-type-aware step labels:*
- Add `orderType?: 'custom' | 'alteration'` to the props interface.
- Define `ALTERATION_STEP_OPTIONS`:
```typescript
const ALTERATION_STEP_OPTIONS = [
  { value: 0, label: "After Client Info", description: "Ops handles alteration details, measurements, and photos" },
  { value: 1, label: "After Alteration Details", description: "Ops takes measurements and photos" },
  { value: 2, label: "After Measurements", description: "Ops handles photos only" },
];
```
- Replace the static `STEP_OPTIONS` with a dynamic selection based on `orderType`.
- Also update the summary text that says "They'll complete steps X-7" to use the correct count.

**4. `src/components/dashboard/CustomOrdersManager.tsx`**

*Fix 3 — Show AssignedOrdersSection to all logged-in users:*
- Remove the `{isOperationsRole && ...}` wrapper around `<AssignedOrdersSection>`.
- The component already returns `null` when the current user has no assigned orders, so there is no UI change for users with no assignments.

**5. `src/components/dashboard/AssignedOrdersSection.tsx`**
- The `STEP_LABELS` array on line 27 is custom-order-only (7 labels). Add a second array for alteration steps, and fetch the `order_type` from the DB alongside other fields so the correct label set is used in the "Start from: Step X" display.

---

## Summary of Changes

| File | Change | Issue Fixed |
|---|---|---|
| Migration SQL | Add `fixed_price` column | #1 |
| `CustomDesignWizard.tsx` | Load `fixed_price` base; save `fixed_price` to DB; revert on abandoned close | #1, #4 |
| `HandoffConfigPanel.tsx` | Accept `orderType` prop; switch step options accordingly | #2 |
| `CustomOrdersManager.tsx` | Remove `isOperationsRole` guard on AssignedOrdersSection | #3 |
| `AssignedOrdersSection.tsx` | Fetch `order_type`; use correct step labels for alteration vs custom | #2, #3 |

No new components. No new routes. No RLS changes.
