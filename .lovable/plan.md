

# Align BMS Bridge with Omanut's Updated Integration

## Context

The Omanut project has updated its `bms-agent`, `boss-chat`, and `whatsapp-messages` to align with this project's API spec. The changes include:
- Sending `intent` instead of `action` (already handled by our bridge)
- Adding aliases for backward compat (already handled)
- Expanding to 40+ actions including `send_receipt`, `send_invoice`, `send_quotation`, `send_payslip`, `get_sales_summary`, `get_sales_details`, `bulk_add_inventory`, `check_customer`, `who_owes`, `daily_report`, etc.

## Gaps Found

The bridge already handles most of the new intents. However:

1. **Missing handlers**: `send_receipt`, `send_invoice`, `send_quotation`, `send_payslip` — Omanut now sends these but the bridge has no case for them. These should trigger document generation and return the document URL (or send via WhatsApp).

2. **Missing from ROLE_PERMISSIONS**: `send_receipt`, `send_invoice`, `send_quotation`, `send_payslip`, `create_contact`, `create_order`, `get_order_status`, `cancel_order`, `get_customer_history`, `get_product_variants`, `update_stock`, `get_expenses`, `get_outstanding_receivables`, `get_outstanding_payables`, `profit_loss_report`, `generate_payment_link`, `bulk_add_inventory`, `batch_operations` are handled in the switch but not in ROLE_PERMISSIONS (so non-external-API users get blocked).

3. **Missing from health_check supported_actions**: Several new intents (`send_receipt`, `send_invoice`, `send_quotation`, `send_payslip`, `credit_sale`, `daily_report`, `who_owes`, `bulk_add_inventory`, `check_customer`, `my_tasks`, `my_attendance`, `my_pay`, `my_schedule`, `team_attendance`, `pending_orders`, `create_contact`) are not listed.

## Changes

### 1. `supabase/functions/bms-api-bridge/index.ts`

**a) Add document-send handlers** (`send_receipt`, `send_invoice`, `send_quotation`, `send_payslip`): Each handler looks up the relevant document by number/ID, generates a PDF URL (using existing pdf-utils or storage), and returns it. These reuse existing invoice/receipt/quotation query logic.

**b) Expand ROLE_PERMISSIONS**: Add missing intents to appropriate roles:
- Admin/Manager: all new intents
- Accountant: `send_receipt`, `send_invoice`, `send_quotation`, `get_expenses`, `get_outstanding_receivables`, `get_outstanding_payables`, `profit_loss_report`
- Sales rep: `send_receipt`, `send_quotation`, `create_order`, `get_order_status`, `get_customer_history`
- Cashier: `send_receipt`
- Staff: `send_receipt`

**c) Update health_check supported_actions** to include all handled intents.

**d) Add switch cases** for `send_receipt`, `send_invoice`, `send_quotation`, `send_payslip`.

### 2. No database changes required

### 3. No frontend changes required

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/bms-api-bridge/index.ts` | Add 4 send handlers, expand ROLE_PERMISSIONS, update health_check list |

