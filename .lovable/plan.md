

# Expand BMS API Bridge for Omanut Platform Integration

## Overview
The user shared a comprehensive API contract from the Omanut platform. We need to:
1. Add new actions to `bms-api-bridge` that aren't already implemented
2. Add a `health_check` action
3. Add external API key auth (Omanut calls with a shared secret, not a Supabase JWT)
4. Create a callback system (BMS → Omanut proactive notifications)
5. Add a BMS Integration Settings UI in the dashboard
6. Add a BMS Status Dashboard component

## Gap Analysis: Existing vs Required Actions

**Already implemented** (map to Omanut contract):
- `list_products` ✓
- `check_stock` ✓ 
- `record_sale` ✓ (maps to `record_sale`)
- `create_quotation` ✓ / `create_invoice` ✓
- `record_expense` ✓
- `low_stock_alerts` ✓ (maps to `get_low_stock_items`)
- `get_sales_summary` ✓ (maps to `sales_report` / `get_company_statistics`)
- `who_owes` ✓ (maps to `get_outstanding_receivables`)
- `clock_in` / `clock_out` ✓
- `update_order_status` ✓

**New actions to add:**
- `get_product_details` — single product lookup by ID or name
- `get_product_variants` — variants for a product
- `update_stock` — add/subtract stock with operation param
- `create_order` — multi-item order creation
- `get_order_status` — lookup order by number
- `cancel_order` — cancel with reason
- `get_customer_history` — purchase history by phone
- `list_quotations` / `list_invoices` — list with filters
- `get_expenses` — list expenses with date range
- `get_outstanding_payables` — accounts payable summary
- `profit_loss_report` — P&L by date range
- `create_contact` — create a customer/contact
- `generate_payment_link` — Lenco payment link generation
- `health_check` — ping endpoint returning system status

## Architecture Changes

### 1. Database: `bms_integration_configs` table
Stores per-tenant Omanut integration settings:
- `tenant_id`, `callback_url`, `api_secret` (shared secret for auth), `is_enabled`, `callback_events` (JSONB array of enabled event types)

### 2. Auth Enhancement in `bms-api-bridge`
Add a third auth path: if the bearer token matches a tenant's `api_secret` from `bms_integration_configs`, allow the request with the `tenant_id` from the request body (for external Omanut calls). The existing JWT and service-role paths remain unchanged.

### 3. New Edge Function: `bms-callback-dispatcher`
A utility function called by database triggers or scheduled jobs to POST events to the tenant's configured `callback_url`. Events: `low_stock`, `out_of_stock`, `new_order`, `payment_confirmed`, `invoice_overdue`, `daily_summary`, `large_sale`, `new_contact`.

### 4. Dashboard UI Components

**`BmsIntegrationSettings.tsx`** — Settings panel (inside Settings tab) for:
- Enable/disable integration
- View/regenerate API secret
- Set callback URL
- Toggle which callback events are active
- Test connection button

**`BmsStatusDashboard.tsx`** — Status panel showing:
- Connection status (last successful API call)
- Recent API calls log (from audit_log filtered by source)
- Callback delivery status
- Supported actions list

## Files to Create
1. `src/components/dashboard/BmsIntegrationSettings.tsx`
2. `src/components/dashboard/BmsStatusDashboard.tsx`

## Files to Modify
1. `supabase/functions/bms-api-bridge/index.ts` — Add ~15 new action handlers + external API key auth + health_check
2. `src/components/dashboard/SettingsManager.tsx` — Add BMS Integration tab
3. `supabase/functions/bms-callback-dispatcher/index.ts` — New edge function for outbound callbacks

## Database Migration
- Create `bms_integration_configs` table with RLS policies
- Add `bms_api_logs` table for tracking external API calls

## No changes to existing action handlers — purely additive.

