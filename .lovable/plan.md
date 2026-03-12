

# ZRA VSDC Developer Self-Check Compliance Plan

## Current Status Audit

The checklist has **32 service checks** across 17 endpoint categories. Here's where we stand:

### Already Passing (8 items)
- **Item 1** (Device Init): `health_check` action exists
- **Item 8** (Save Items): `register_items` action exists
- **Item 16** (Upload Sales): `submit_invoice` action exists
- **Item 17** (Consecutive Invoice #s): `generate_sale_number` and `generate_invoice_number` triggers exist
- **Item 25** (Backup Strategy): Database with full backup
- **Item 26** (User Authentication): Full auth system exists
- **Item 32** (Audit Trail): `audit_log` table with triggers exists

### Partially Passing (4 items)
- **Item 19** (Tax Invoice Features): Receipt shows some fiscal data but missing tax breakdown, "TAX INVOICE" label, supplier address
- **Item 20** (Credit Notes): `submit_refund` exists but no dedicated credit note UI flow
- **Item 30** (Reports in Excel/CSV/PDF): Have PDF generation but need explicit transaction report export
- **Item 31** (Transaction Report): Need a specific ZRA transaction report view

### Missing -- Need Implementation (20 items)

| # | Requirement | New Action Needed |
|---|-------------|-------------------|
| 2 | Get Code Data (VSDC Constants) | `get_code_data` |
| 3 | Classification Codes | `get_classification_codes` |
| 4-5 | Save/Get Branch Customer | `save_branch_customer`, `get_branch_customers` |
| 6 | Save Branch User | `save_branch_user` |
| 7 | Get Branch Info | `get_branch_info` |
| 9 | Item Composition | `save_item_composition` |
| 10 | Get Item List | `get_item_list` |
| 11 | Get Import Items | `get_import_items` |
| 12 | Update Import Item | `update_import_item` |
| 13 | Save Purchase | `save_purchase` |
| 14 | Get Purchases | `get_purchases` |
| 15 | Manual Purchase Capture | UI for manual purchase entry |
| 18 | Invoice # immutability | DB constraint preventing modification |
| 21 | Debit Notes | `submit_debit_note` (FLAG=DEBIT) |
| 22-23 | Invoice immutability after generation | RLS/trigger to lock finalized invoices |
| 24 | Reprint with "COPY" label | UI flag on reprint |
| 27 | Save Stock Items | `save_stock_item` |
| 28 | Get Stock Items | `get_stock_items` |
| 29 | Stock quantity updates | `update_stock_quantity` |

## Implementation Plan

### 1. Expand Edge Function with All Missing VSDC Endpoints

Add ~14 new actions to `zra-smart-invoice/index.ts`:

```text
get_code_data        → GET /get_code_data_JSON.jsp
get_classification   → GET /get_classification_JSON.jsp
save_branch_customer → POST /save_branch_customer_JSON.jsp
get_branch_customers → POST /get_branch_customer_JSON.jsp
save_branch_user     → POST /save_branch_user_JSON.jsp
get_branch_info      → POST /get_branch_info_JSON.jsp
save_item_composition→ POST /post_item_composition_JSON.jsp
get_item_list        → POST /get_item_list_JSON.jsp
get_import_items     → POST /get_import_items_JSON.jsp
update_import_item   → POST /update_import_item_JSON.jsp
save_purchase        → POST /post_receipt_Json.jsp (FLAG=PURCHASE)
get_purchases        → POST /get_purchases_JSON.jsp
save_stock_item      → POST /post_stock_item_JSON.jsp
get_stock_items      → POST /get_stock_items_JSON.jsp
submit_debit_note    → POST /post_receipt_Json.jsp (FLAG=DEBIT)
```

Each follows the same pattern: POST with `COMPANY_TIN`, `COMPANY_NAMES`, `COMPANY_SECURITY_KEY` + action-specific fields.

### 2. Invoice Immutability (Items 18, 22-23)

Database migration to:
- Add a trigger on `sales` and `invoices` that prevents UPDATE/DELETE on rows that have a corresponding `zra_invoice_log` entry with `status = 'success'`
- Sale numbers and invoice numbers cannot be modified once generated (already enforced by triggers generating them on INSERT)

### 3. Tax Invoice Compliance (Item 19)

Update `SalesReceiptModal` and `InvoiceViewModal` to include all mandatory fields:
- "TAX INVOICE" label prominently displayed
- Supplier TPIN, name, address
- Invoice date and number
- Customer TPIN/name/address (when applicable)
- Per-item: quantity, price, tax-exclusive amount
- Tax rate display
- Tax-exclusive total, discount, tax amount, tax-inclusive total
- SDC info: QR Code, SDC ID, Invoice type, VSDC date, Internal data, Fiscal signature

### 4. Credit/Debit Notes UI (Items 20-21)

Add a "Credit Note" and "Debit Note" action to the sales/invoice views that creates a reversal entry and submits to ZRA with the appropriate FLAG.

### 5. Reprint with "COPY" Label (Item 24)

Track whether a receipt/invoice has been printed before. On reprint, add "COPY" or "DUPLICATE" watermark to the document.

### 6. Manual Purchase Entry (Item 15)

Add a simple "Manual Purchase" form in the accounting section for recording purchases from suppliers not on Smart Invoice.

### 7. ZRA Transaction Report (Item 31)

Add a dedicated "ZRA Transaction Report" view showing: invoice number, date, customer name, goods/services description, value, and tax amount -- exportable to Excel/CSV/PDF.

### 8. Stock Sync with ZRA (Items 27-29)

Hook into existing inventory management to sync stock items and quantity changes to ZRA when VSDC is enabled.

## Files to Modify

**Edge Function:**
- `supabase/functions/zra-smart-invoice/index.ts` -- Add 14 new actions

**Database:**
- New migration: invoice immutability trigger, reprint tracking column

**UI Components:**
- `SalesReceiptModal.tsx` -- Full tax invoice compliance layout
- `InvoiceViewModal.tsx` -- Same compliance updates
- `ReceiptModal.tsx` -- "COPY" label on reprint
- `SalesRecorder.tsx` -- Credit/debit note actions
- `InvoicesManager.tsx` -- Credit/debit note actions, purchase entry

**New Components:**
- `ZraTransactionReport.tsx` -- Dedicated ZRA report view
- `ManualPurchaseModal.tsx` -- Manual purchase capture form

**Existing:**
- `DashboardSidebar.tsx` -- Add ZRA Report nav
- `Dashboard.tsx` -- Route for ZRA report

## Priority Order

1. Edge function expansion (covers items 2-14, 27-29) -- biggest checklist coverage
2. Invoice immutability (items 18, 22-23) -- critical compliance
3. Tax invoice layout (item 19) -- visual compliance
4. Credit/debit notes (items 20-21)
5. Reprint "COPY" (item 24)
6. Transaction report (items 30-31)
7. Manual purchase (item 15)

