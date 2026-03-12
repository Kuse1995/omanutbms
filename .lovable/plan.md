

# Fix Job Card Modal Closing on Customer/Work Tabs

## Root Cause

Radix UI `Select` component does not support empty string (`""`) as a valid `SelectItem` value. When a user clicks "Walk-in Customer" or "Unassigned", the Select fires unexpected events that propagate up and close the Dialog.

Three `Select` components are affected in `JobCardModal.tsx`:
1. **Line 371**: `<SelectItem value="">Walk-in Customer</SelectItem>`
2. **Line 443**: `<SelectItem value="">Unassigned</SelectItem>` (technician)
3. The customer_id and assigned_technician_id state uses `""` as the "none" sentinel

## Fix

Replace empty string values with a sentinel like `"none"` and handle the conversion in the onChange and submit logic:

### `src/components/dashboard/JobCardModal.tsx`

1. Change `<SelectItem value="">Walk-in Customer</SelectItem>` → `<SelectItem value="none">Walk-in Customer</SelectItem>`
2. Change `<SelectItem value="">Unassigned</SelectItem>` → `<SelectItem value="none">Unassigned</SelectItem>`
3. In `onValueChange` handlers, convert `"none"` back to `""` in form state (or handle at submit time by mapping `"none"` → `null`)
4. Initialize `customer_id` and `assigned_technician_id` with `"none"` instead of `""` when no value exists
5. In the mutation's `editableFields`, map `"none"` to `null` for both fields

This is a minimal, targeted fix -- only the sentinel values change.

