

# Fix "Missing user_id or employee_id" in Add Stock Workflow

## Problem

When the `add_stock` workflow calls `bms-api-bridge`, it sends `user_id: null` in the context (line 538). The bridge rejects this because it requires either `user_id` or `employee_id` (line 509). The mapping object has these values, but they're never passed into the workflow state.

The same bug exists in the `stock_upload` workflow (line 416) — it also sends `user_id: null`.

## Fix

**File: `supabase/functions/whatsapp-bms-handler/index.ts`**

1. **Store mapping identity in workflow state** when starting both workflows:
   - At line ~1297 (add_stock trigger): pass `{ user_id: mapping.user_id, employee_id: mapping.employee_id }` as initial state
   - At the stock_upload trigger: same — include `user_id` and `employee_id` in the initial state

2. **Use stored identity when calling bridge** in both workflow processors:
   - `processAddStockWorkflow` (line ~536-538): change `user_id: null` → `user_id: state.user_id || null, employee_id: state.employee_id || null`
   - `processStockUploadWorkflow` (line ~414-416): same fix

This ensures the user's identity flows from the WhatsApp mapping → workflow state → bridge context, satisfying the validation check.

