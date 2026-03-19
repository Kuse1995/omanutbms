
# WhatsApp-First BMS: All 4 Phases Implemented

## Phase 1: Workflow State Machine ✅
- Created `whatsapp_conversations` table (phone, tenant_id, current_workflow, workflow_step, workflow_state JSONB, expires_at)
- UNIQUE index on phone — one active workflow per number
- RLS enabled with service role full access
- Workflow engine utilities: `getActiveWorkflow`, `startWorkflow`, `advanceWorkflow`, `completeWorkflow`, `cancelWorkflow`
- Handler checks for active workflow BEFORE intent parsing

## Phase 2: WhatsApp Tenant Onboarding ✅
- Unregistered users can say "register" / "sign up" to start onboarding
- 5-step guided flow: business name → type → currency → owner name → confirm
- `create_tenant_from_whatsapp` action in bms-api-bridge creates tenant, business_profile, tenant_statistics, and whatsapp_user_mapping
- Rate limiting: checks for existing workflow before allowing new registration
- UNREGISTERED_MESSAGE updated to mention registration option

## Phase 3: Photo-Based Stock Upload ✅
- New `whatsapp-stock-extractor` edge function using Lovable AI (Gemini 2.5 Pro vision)
- Downloads image from Twilio with auth, sends to vision AI with structured tool calling
- Extracts product array: name, price, quantity, sku, unit
- Stock upload workflow: receive image → extract → confirm → bulk insert
- `bulk_add_inventory` action in bms-api-bridge for batch inventory insertion (max 100 items)
- Triggers: sending an image, or saying "add stock" / "upload products"

## Phase 4: Guided Invoice & Document Creation ✅
- Step-by-step invoice/quotation creation: ask customer → add items loop → review → create → deliver PDF
- Smart item matching: looks up inventory prices when user enters product name
- Price prompt if price not found in inventory
- Auto-PDF delivery after creation via generate-whatsapp-document
- Triggers: "guided invoice", "new invoice", "guided quote", "new quotation"

## Phase 5: Softer Grace Period Strategy ✅
- Extended grace period from 5 days to 30 days
- Replaced permanent deletion with soft-archive (`archived_at` column)
- Tiered lifecycle: Day 0 inactive → Day 14 read-only → Day 30 archived → Day 120 permanent purge
- Updated `purge-expired-tenants` to archive at 30 days, purge at 90 days after archive
- Softened all user-facing messaging ("archived" not "deleted", data preserved 90 days)
- `SubscriptionActivationGate` shows read-only mode indicator after day 14

## Phase 6: WhatsApp-Automation Callback Alignment ✅
- Added `fireCallback()` helper to `bms-api-bridge` (fire-and-forget, non-blocking)
- Wired callbacks to key operations:
  - `record_sale` → `payment_confirmed` + `large_sale` (if ≥K5,000)
  - `credit_sale` → `new_order`
  - `create_invoice` → `new_order`
  - `create_order` → `new_order`
  - `create_contact` → `new_contact`
  - Stock drops → `low_stock` / `out_of_stock` (automatic after sales)
- Created `bms-daily-summary-callback` edge function for scheduled `daily_summary` + `invoice_overdue` callbacks
- Updated CORS headers on `bms-callback-dispatcher`

## Files Modified
- `supabase/functions/whatsapp-bms-handler/index.ts` — Full rewrite with workflow engine + all 4 phases
- `supabase/functions/bms-api-bridge/index.ts` — Added callback wiring, `fireCallback()`, `checkStockCallbacks()`, `create_tenant_from_whatsapp`, `bulk_add_inventory`
- `supabase/functions/bms-callback-dispatcher/index.ts` — Updated CORS headers
- `supabase/functions/purge-expired-tenants/index.ts` — Rewritten: 30-day archive + 90-day purge
- `src/components/dashboard/SubscriptionRequiredModal.tsx` — 30-day countdown, softer language
- `src/components/dashboard/SubscriptionActivationGate.tsx` — Read-only mode indicator, softer messaging

## New Files
- `supabase/functions/whatsapp-stock-extractor/index.ts` — Vision AI product extraction
- `supabase/functions/bms-daily-summary-callback/index.ts` — Scheduled daily summary + invoice overdue callbacks

## DB Migrations
- `whatsapp_conversations` table with RLS, unique phone index, expiry index, auto-updated_at trigger
- `business_profiles.archived_at` column added

## Phase 7: Advanced Integration Hardening ✅

### A. HMAC-SHA256 Webhook Signatures
- All outbound callbacks now include `X-BMS-Signature` header (HMAC-SHA256 of payload using api_secret)
- Additional headers: `X-BMS-Event`, `X-BMS-Timestamp`, `X-BMS-Version`
- Omanut platform can verify payload authenticity by computing HMAC and comparing

### B. Callback Retry Queue
- New `callback_queue` table: stores failed callbacks with exponential backoff (30s → 2m → 8m → 32m → 2h)
- Max 5 attempts per callback before marking as permanently failed
- `bms-callback-dispatcher` auto-queues failed deliveries and supports `mode: 'process_retry_queue'`
- No more lost events when Omanut platform is temporarily down

### C. API Rate Limiting
- New `api_rate_limits` table: sliding window counter per tenant per minute
- Default: 60 requests/minute per tenant for external API calls
- Returns HTTP 429 with `Retry-After` header when exceeded
- Auto-cleanup trigger removes entries older than 5 minutes

### D. Batch API Endpoint
- New `batch_operations` intent: execute up to 50 operations in a single API call
- Supports: check_stock, list_products, record_sale, create_contact, create_invoice, create_quotation, create_order, record_expense, bulk_add_inventory
- Returns per-operation results with success/failure counts
- Prevents recursive batch nesting

### E. API Versioning
- All responses include `X-BMS-Version: v1` header
- Health check reports version, rate limit info
- Foundation for future breaking changes via version negotiation

## Files Modified (Phase 7)
- `supabase/functions/bms-callback-dispatcher/index.ts` — Full rewrite: HMAC signatures, retry queue processing, failed callback queuing
- `supabase/functions/bms-api-bridge/index.ts` — Rate limiting, batch_operations handler, API versioning headers

## DB Migrations (Phase 7)
- `callback_queue` table with indexes for retry polling
- `api_rate_limits` table with sliding window counter + auto-cleanup trigger
