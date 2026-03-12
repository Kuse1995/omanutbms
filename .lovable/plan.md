

# ZRA Smart Invoice (VSDC) Integration

## What This Does

The ZRA VSDC (Virtual Sales Data Controller) is Zambia's mandatory electronic invoicing system. Every sale, refund, and purchase must be reported to ZRA in real-time. Integrating this means every tenant's sales and invoices are automatically stamped by ZRA with a fiscal signature, QR code, and receipt number -- making the platform fully tax-compliant.

This is a major competitive advantage: tenants using the system are automatically ZRA-compliant without any manual effort.

## API Capabilities (from the documentation)

The VSDC API supports these operations via JSON (we will use JSON exclusively):

| Operation | Endpoint | FLAG |
|-----------|----------|------|
| Send Invoice | `post_receipt_Json.jsp` | `INVOICE` |
| Send Refund | `post_receipt_Json.jsp` | `REFUND` / `Partial_Refund` |
| Get Signature (QR + fiscal data) | `get_Response_JSON.jsp` | `INVOICE` / `REFUND` |
| Register Items | `post_item_JSON.jsp` | -- |
| Send Purchase | `post_receipt_Json.jsp` | `PURCHASE` |
| Send Inventory | `post_inventory_JSON.jsp` | -- |
| Health Check | `health_check_request_JSON.jsp` | -- |
| Z Report (daily summary) | `requestZd_report_Json.jsp` | -- |

Each tenant needs three credentials: `COMPANY_TIN`, `COMPANY_NAMES`, `COMPANY_SECURITY_KEY` (provided by ZRA after VSDC registration).

## Implementation Plan

### 1. Database Migration

Add ZRA-specific columns to `business_profiles`:
- `zra_vsdc_enabled` (boolean, default false)
- `zra_company_tin` (text, nullable) -- the 10-digit TIN
- `zra_company_names` (text, nullable) -- exact company name registered with ZRA
- `zra_security_key` (text, nullable) -- VSDC security key
- `zra_vsdc_url` (text, nullable) -- VSDC server URL (each taxpayer may have a different one)

Create a `zra_invoice_log` table to track all submissions:
- `id`, `tenant_id`, `invoice_num` (our internal NUM), `flag` (INVOICE/REFUND/PURCHASE), `status` (pending/success/failed), `zra_response` (jsonb), `fiscal_data` (jsonb -- stores ysdcid, ysdcintdata, ysdcregsig, ysdcrecnum, qr_code), `error_message`, `related_table` (sales/invoices), `related_id`, `created_at`

### 2. Edge Function: `zra-smart-invoice`

A single edge function handling all ZRA operations with an `action` parameter:

- **`submit_invoice`** -- Takes sale/invoice data, formats it to the VSDC JSON schema, POSTs to the tenant's VSDC URL, then fetches the signature. Stores fiscal data in `zra_invoice_log`.
- **`submit_refund`** -- Same flow with FLAG=REFUND.
- **`register_items`** -- Syncs inventory items to ZRA.
- **`health_check`** -- Tests VSDC connectivity.
- **`z_report`** -- Fetches daily Z report from ZRA.

The function maps our data model to the VSDC format:
- Sale items -> `item_list` with ITMREF (SKU), ITMDES (name), QUANTITY, UNITYPRICE, TAXCODE (A=exempt, B=16% VAT, F=standard 16%)
- Header fields: NUM (sale_number/invoice_number), CURRENCY=ZMW, COMPUTATION_TYPE=INCLUSIVE, CLIENT_NAME, CLIENT_TIN (if B2B)

Two-step process per invoice: (1) POST the invoice, (2) GET the signature/QR code. Both stored in `zra_invoice_log`.

### 3. Automatic Submission Hooks

When a sale is recorded in `SalesRecorder` or an invoice is created/finalized in `InvoicesManager`:
- If the tenant has `zra_vsdc_enabled = true`, automatically call the edge function
- Show a ZRA status indicator (pending/stamped/failed) on each sale/invoice row
- Store the fiscal receipt number and QR code for printing on receipts

### 4. ZRA Settings Panel in Dashboard

Add a "ZRA Smart Invoice" tab in Settings with:
- Enable/disable toggle
- Fields for COMPANY_TIN, COMPANY_NAMES, COMPANY_SECURITY_KEY, VSDC URL
- "Test Connection" button (calls health_check)
- Connection status indicator (shows SDC_ID when connected)

### 5. Receipt/Invoice Print Updates

Update `TenantDocumentHeader`, `SalesReceiptModal`, `InvoiceViewModal`, and `ReceiptModal` to include:
- ZRA fiscal receipt number (`ysdcrecnum`)
- SDC ID (`ysdcid`)
- Internal data signature (`ysdcintdata`)
- Registration signature (`ysdcregsig`)
- QR code (rendered from `QR_CODE` response)
- Timestamp from ZRA (`ysdctime`)

### 6. WhatsApp Integration

Update `bms-intent-parser` / `whatsapp-bms-handler` so that sales recorded via WhatsApp also trigger ZRA submission automatically.

### 7. ZRA Submission Log Viewer

Add a "ZRA Log" section in the accounting area showing all submissions with status, fiscal data, and retry capability for failed submissions.

## Files to Create/Modify

**Create:**
- `supabase/functions/zra-smart-invoice/index.ts` -- Main edge function
- `src/components/dashboard/ZraSettings.tsx` -- Settings panel
- `src/components/dashboard/ZraSubmissionLog.tsx` -- Log viewer

**Modify:**
- `src/components/dashboard/SalesRecorder.tsx` -- Auto-submit after sale
- `src/components/dashboard/InvoicesManager.tsx` -- Auto-submit after invoice
- `src/components/dashboard/SettingsManager.tsx` -- Add ZRA tab
- `src/components/dashboard/SalesReceiptModal.tsx` -- Show fiscal data
- `src/components/dashboard/ReceiptModal.tsx` -- Show fiscal data
- `src/components/dashboard/InvoiceViewModal.tsx` -- Show fiscal data
- `src/components/dashboard/TenantDocumentHeader.tsx` -- Add fiscal header
- `src/components/dashboard/DashboardSidebar.tsx` -- Add ZRA log nav item
- `supabase/config.toml` -- Register new edge function
- Database migration for new columns and table

## Tax Code Mapping

The system will automatically assign tax codes based on existing tax configuration:
- If `tax_enabled = true` and `tax_rate = 16` -> TAXCODE = "F" (Standard Rated 16%)
- If item is exempt -> TAXCODE = "A" (Exempted, 0%)
- Exports -> TAXCODE = "C" (0%)

## Security

- ZRA credentials stored per-tenant in `business_profiles` (protected by existing RLS)
- Edge function validates tenant ownership before submitting
- All API calls go through the edge function (never from client)

