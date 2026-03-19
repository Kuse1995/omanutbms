

# Align WhatsApp Features with BMS Automation Callbacks

## Problem

The system has three disconnected layers:
1. **WhatsApp handler** — processes user messages, calls the BMS bridge
2. **BMS API bridge** — executes business logic (sales, stock, invoices, etc.)
3. **BMS callback dispatcher** — designed to send outbound notifications to the Omanut platform

The callback dispatcher exists but is **never called**. When a sale is recorded via WhatsApp (or the dashboard), no outbound notification is sent to the Omanut platform. The callback events configured in `BmsIntegrationSettings` (`low_stock`, `new_order`, `payment_confirmed`, etc.) are dead code.

## Solution

Wire the BMS API bridge to fire callbacks after key operations, so the Omanut platform receives real-time notifications about business events.

## Changes

### 1. Add callback dispatch helper to `bms-api-bridge`

Create a lightweight `fireCallback()` function inside the bridge that calls the `bms-callback-dispatcher` edge function after successful operations. This is non-blocking (fire-and-forget) so it doesn't slow down the response.

```text
async function fireCallback(tenantId, event, data) {
  // POST to bms-callback-dispatcher with service role
  // Non-blocking: don't await, catch errors silently
}
```

### 2. Wire callbacks to existing bridge operations

| Bridge Action | Callback Event | Data Payload |
|---|---|---|
| `record_sale` | `payment_confirmed` | sale_number, amount, product, payment_method |
| `record_sale` (large) | `large_sale` | sale_number, amount, threshold |
| `credit_sale` | `new_order` | invoice_number, customer, amount |
| `create_order` | `new_order` | order_number, customer, items |
| `create_invoice` | `new_order` | invoice_number, customer, total |
| `record_expense` | (future) | — |
| Stock drops below reorder | `low_stock` | product_name, current_stock, reorder_level |
| Stock hits zero | `out_of_stock` | product_name, sku |
| `create_contact` | `new_contact` | contact_name, phone |

### 3. Add daily summary callback trigger

Create a new edge function `bms-daily-summary-callback` that runs on a schedule (end of day) and fires the `daily_summary` callback event for each tenant that has it enabled. This reuses the existing `daily_report` logic from the bridge.

### 4. Wire invoice overdue detection

In the existing `expire-subscriptions` scheduled function (or a new lightweight cron), check for overdue invoices and fire `invoice_overdue` callbacks.

### 5. Update `bms-callback-dispatcher` CORS headers

Add the missing `x-supabase-*` headers to the CORS config for consistency.

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/bms-api-bridge/index.ts` | Add `fireCallback()` helper; call it after `record_sale`, `credit_sale`, `create_order`, `create_invoice`, `create_contact`, and stock-change operations |
| `supabase/functions/bms-callback-dispatcher/index.ts` | Minor CORS update |
| `supabase/functions/bms-daily-summary-callback/index.ts` | New function: scheduled daily summary that fires callbacks for all enabled tenants |

## Architecture After Change

```text
WhatsApp User
    │
    ▼
whatsapp-bms-handler
    │
    ▼
bms-api-bridge  ──(after success)──►  bms-callback-dispatcher  ──►  Omanut Platform
    │                                         ▲
    ▼                                         │
  Database  ◄── dashboard UI                  │
                                              │
bms-daily-summary-callback (cron) ────────────┘
```

No database changes required. No frontend changes needed.

