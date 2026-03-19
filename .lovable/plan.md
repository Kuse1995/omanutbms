

# Two Things: Improvements + Integration Prompt for the Omanut Project

## Part 1: What We Can Still Improve

Here are the highest-impact upgrades, roughly ordered by value:

### A. Webhook Signature Verification (Security)
Right now the callback dispatcher authenticates with a bearer token, but doesn't sign payloads. The Omanut platform has no way to verify the callback body wasn't tampered with. We should add HMAC-SHA256 signature headers to outbound callbacks so the receiving platform can verify authenticity.

### B. Two-Way Sync (Omanut → BMS)
Currently the bridge is mostly one-directional: BMS sends callbacks OUT, Omanut reads data IN. But if Omanut creates an order or updates a customer, there's no inbound webhook endpoint to receive those changes. Adding an inbound webhook handler would make it truly bidirectional.

### C. Retry Queue for Failed Callbacks
If the Omanut platform is down when a callback fires, that event is lost forever (fire-and-forget). A `callback_queue` table with retry logic (exponential backoff, max 5 attempts) would make the system reliable.

### D. API Rate Limiting
The bridge has no rate limiting. A bad actor with a valid API key could hammer the endpoint. Adding per-tenant rate limiting (e.g., 60 requests/minute) via a simple counter in the database would protect the system.

### E. Batch API Endpoints
The bridge handles one action per request. For sync scenarios, batch endpoints (e.g., "sync 200 products at once") would dramatically reduce API calls and improve the Omanut platform's ability to do initial data imports.

### F. API Versioning
There's no versioning on the bridge. Adding a `/v1/` prefix or version header now means we can evolve the API without breaking existing integrations.

---

## Part 2: Prompt for the Omanut Project

Copy and paste this into your other project so that AI understands the integration:

---

**Prompt to give the Omanut project:**

```text
This project integrates with an external Business Management System (BMS) backend 
hosted at a Supabase edge function. Here is the full integration specification:

## Connection Details
- **API Bridge URL**: POST to `{SUPABASE_URL}/functions/v1/bms-api-bridge`
- **Authentication**: Bearer token in Authorization header. The token is the 
  `api_secret` from the tenant's `bms_integration_configs` record.
- **Tenant Scoping**: Every request MUST include `tenant_id` in the JSON body.

## Request Format
All requests are POST with JSON body:
{
  "tenant_id": "<uuid>",
  "intent": "<action_name>",
  ...action-specific fields
}

## Available Actions (Inbound - Omanut → BMS)

### Health & Config
- `health_check` → { success, tenant_name, stats }

### Sales & Revenue
- `record_sale` → { product, quantity, amount, payment_method? }
- `credit_sale` → { product, quantity, amount, customer_name }
- `get_sales_summary` → { period?: "today"|"week"|"month" }
- `get_sales_details` → { period?: "today"|"week"|"month" }

### Inventory
- `check_stock` → { product? } (omit product for full list)
- `list_products` → {} (returns all products with stock levels)
- `low_stock_alerts` → {} (items below reorder level)
- `bulk_add_inventory` → { items: [{ name, price, quantity, sku?, unit? }] }

### Customers & Contacts
- `create_contact` → { name, phone?, email?, address? }
- `check_customer` → { customer_name }
- `who_owes` → {} (list of debtors with amounts)

### Invoices & Quotations
- `create_invoice` → { customer_name, items: [{ description, quantity, unit_price }], due_date?, notes? }
- `create_quotation` → { customer_name, items: [...], valid_until?, notes? }
- `create_order` → { customer_name, items: [...], notes? }

### Documents
- `send_receipt` → { sale_number? } (generates and sends PDF via WhatsApp)
- `send_invoice` → { invoice_number }
- `send_quotation` → { quotation_number }
- `send_payslip` → { employee_name?, period? }

### HR & Attendance
- `clock_in` → {} (uses authenticated user's employee record)
- `clock_out` → {}
- `my_attendance` → { period?: "today"|"week"|"month" }
- `my_tasks` → {}
- `my_pay` → {}
- `my_schedule` → {}
- `team_attendance` → {} (managers only)

### Orders & Production
- `pending_orders` → {}
- `update_order_status` → { order_number, new_status }

### Expenses
- `record_expense` → { description, amount, category? }

### Reports
- `daily_report` → {} (end-of-day summary: revenue, expenses, profit, attendance, receivables)

## Callback Events (Outbound - BMS → Omanut)

The BMS fires HTTP POST callbacks to the URL configured in `bms_integration_configs.callback_url`. 
Each callback includes:
{
  "event": "<event_name>",
  "tenant_id": "<uuid>",
  "data": { ...event-specific },
  "timestamp": "ISO8601"
}
Authorization: Bearer <api_secret>

### Available Events
| Event | Trigger | Data |
|---|---|---|
| `payment_confirmed` | Sale recorded | sale_number, amount, product, payment_method |
| `large_sale` | Sale >= K5,000 | sale_number, amount, threshold |
| `new_order` | Invoice/order/credit sale created | invoice_number/order_number, customer, amount |
| `low_stock` | Stock below reorder level | product_name, current_stock, reorder_level |
| `out_of_stock` | Stock hits zero | product_name, sku |
| `new_contact` | Contact created | contact_name, phone |
| `daily_summary` | Scheduled (end of day) | total_sales, total_expenses, net_profit, top_products, low_stock_items |
| `invoice_overdue` | Scheduled (daily check) | invoice_number, customer, amount, days_overdue |

## WhatsApp Channel
The BMS also has a WhatsApp interface (via Twilio) that processes natural language 
messages and routes them through the same bridge. Users can:
- Record sales, check stock, create invoices via chat
- Upload product photos for AI-powered stock extraction
- Go through guided multi-step workflows (registration, invoicing)
- Receive PDF documents (receipts, invoices, payslips) as WhatsApp media

## Authentication Model
- External API: Bearer token (api_secret from bms_integration_configs)
- WhatsApp: Phone number → whatsapp_user_mappings → tenant_id + role
- Dashboard: Supabase Auth → tenant membership

## Role-Based Access
Roles: admin, manager, accountant, hr_manager, sales_rep, cashier, staff, viewer
Each role has a defined set of permitted actions. Admin and Manager have full access.
Sales reps cannot view reports or record expenses. Viewers are read-only.

## Error Responses
All errors follow: { success: false, error: "Human-readable message" }
Common errors: "Product not found", "Insufficient stock", "Permission denied", 
"Missing required field: X"
```

---

This prompt gives the Omanut project's AI a complete contract of every action, callback event, authentication method, and data format -- so it can build its side of the integration correctly.

