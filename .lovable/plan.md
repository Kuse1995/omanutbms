

# WhatsApp-First BMS: Phased Implementation Plan

## Current State Summary
The system already has a solid WhatsApp foundation:
- **whatsapp-bms-handler** (1233 lines): Twilio webhook, draft conversations via `whatsapp_conversation_drafts`, pending confirmations, yes/no handling
- **bms-intent-parser** (503 lines): Gemini-based NLP with ~30 intents, Zambian English tolerance
- **bms-api-bridge** (3245 lines): Central gateway with ~40 actions, role-based permissions
- Draft system: single intent + entities JSONB, 15-minute expiry, upsert on `tenant_id,whatsapp_number`

The drafts table already provides a basic state machine. The gap is: no multi-step workflows, no image processing, no self-registration/onboarding, no bulk data entry.

---

## Phase 1: Workflow State Machine (Foundation)
**Why first**: Every other phase depends on robust multi-step conversation tracking.

### 1A. Create `whatsapp_conversations` table
```text
whatsapp_conversations
├── id (uuid PK)
├── phone (text, not null)
├── tenant_id (uuid, nullable — null during onboarding)
├── current_workflow (text) — e.g. 'onboarding', 'bulk_stock', 'guided_invoice'
├── workflow_step (text) — e.g. 'ask_business_name', 'ask_currency'
├── workflow_state (jsonb) — accumulated data
├── pending_fields (text[]) — what's still needed
├── completed_fields (text[]) — what's been collected
├── expires_at (timestamptz)
├── created_at / updated_at
└── UNIQUE(phone) — one active workflow per phone
```

### 1B. Refactor `whatsapp-bms-handler` to check workflows first
Before intent parsing, check `whatsapp_conversations` for an active workflow. If found, route to a workflow processor instead of the intent parser. This keeps the existing single-message intent system intact while adding multi-step flows on top.

### 1C. Create workflow engine utilities
Shared functions in the handler:
- `getActiveWorkflow(phone)` — fetch current workflow
- `advanceWorkflow(id, step, newState)` — move to next step
- `completeWorkflow(id)` — finalize and clean up
- `cancelWorkflow(id)` — user said "cancel"

### Files
- Migration: create `whatsapp_conversations` table with RLS
- `supabase/functions/whatsapp-bms-handler/index.ts` — add workflow check before intent parsing (~50 lines)

---

## Phase 2: WhatsApp Tenant Onboarding
**Why second**: Lets new businesses start using the system without ever touching a web browser.

### 2A. New intent: `register` / `signup`
Add to `bms-intent-parser`: when an **unregistered** number sends "I want to register", "sign up", "new business", trigger onboarding instead of the generic "ask your admin" message.

### 2B. Onboarding workflow steps
```text
Step 1: ask_business_name    → "What's your business name?"
Step 2: ask_business_type    → "What type? (1) Retail (2) Services (3) Manufacturing"
Step 3: ask_currency         → "Which currency? (1) ZMW (2) USD (3) Other"
Step 4: ask_owner_name       → "What's your full name?"
Step 5: confirm_details      → Summary + "Say yes to create your account"
Step 6: create_account       → Auto-create tenant, profile, whatsapp_user_mapping
```

### 2C. Account creation logic
On confirmation:
- Create tenant via service role (insert into `tenants`, `business_profiles`, `tenant_statistics`)
- Create a `whatsapp_user_mappings` entry linking the phone to the new tenant as `admin` + `is_owner`
- Set `billing_status = 'inactive'` (they'll need to subscribe)
- Send welcome message with quick-start commands

### 2D. Security considerations
- Rate-limit registrations per phone (max 1 per hour)
- Validate phone format before starting
- No auth.users record created (WhatsApp-only user) — or optionally create one with phone as identifier

### Files
- `supabase/functions/whatsapp-bms-handler/index.ts` — onboarding workflow processor, modify unregistered handler
- `supabase/functions/bms-api-bridge/index.ts` — new `create_tenant_from_whatsapp` action
- Migration: none beyond Phase 1 table

---

## Phase 3: Photo-Based Stock Upload (Vision AI)
**Why third**: High-impact feature for African markets where typed inventory lists are painful.

### 3A. Handle image messages from Twilio
Twilio sends `MediaUrl0`, `MediaContentType0` fields for images. Update handler to detect these and route to a stock upload workflow.

### 3B. New intent: `upload_stock` / `add_products`
Trigger words: "add stock", "upload products", "add my products", or just sending a photo without context.

### 3C. Image processing workflow
```text
Step 1: receive_image       → User sends photo of price list / stock sheet
Step 2: extract_with_vision → Call Gemini Vision to extract product rows
Step 3: confirm_extracted   → "I found 12 products. Here's what I see: [list]. Correct?"
Step 4: save_to_inventory   → Bulk insert into inventory table
```

### 3D. Vision AI extraction
New edge function `whatsapp-stock-extractor`:
- Receives base64 image
- Calls Lovable AI (Gemini 2.5 Pro — best for vision) with structured tool calling
- Returns array of `{ name, sku?, price, quantity, unit? }`
- Handles handwritten lists, printed receipts, Excel screenshots

### 3E. Bulk text upload alternative
Also support plain text: "add products: Cement 250, Blocks 15, Sand 800" — parse with intent parser, no vision needed.

### Files
- `supabase/functions/whatsapp-stock-extractor/index.ts` — new function for Vision AI extraction
- `supabase/functions/whatsapp-bms-handler/index.ts` — image message handling, stock upload workflow
- `supabase/functions/bms-api-bridge/index.ts` — new `bulk_add_inventory` action
- `supabase/config.toml` — register new function

---

## Phase 4: Guided Invoice & Document Creation
**Why last**: Builds on the workflow engine and existing create_invoice/create_quotation intents.

### 4A. Enhanced multi-item collection
Current system asks for all items at once ("invoice John 5 bags cement 2500"). New guided flow:

```text
Step 1: ask_customer     → "Who is this invoice for?"
Step 2: add_item         → "What's the first item? (name, qty, price)"
Step 3: more_items       → "Got it! Add another item or say 'done'"
Step 4: review           → Show full invoice summary
Step 5: confirm          → "Say yes to create and send"
Step 6: deliver          → Auto-generate PDF, send via WhatsApp
```

### 4B. Smart item matching
When user says "5 cement", match against existing inventory to auto-fill price. Ask for confirmation: "5x Cement @ K250 each = K1,250. Correct?"

### 4C. Auto-PDF delivery
After confirmed creation, automatically call `generate-whatsapp-document` and send the PDF back — already works for receipts, extend pattern to invoices/quotations.

### 4D. Quotation-to-Invoice conversion
New intent: "convert quote Q2026-0015 to invoice" — pulls items from existing quotation and creates invoice.

### Files
- `supabase/functions/whatsapp-bms-handler/index.ts` — guided invoice/quotation workflow
- `supabase/functions/bms-api-bridge/index.ts` — enhance `create_invoice`/`create_quotation` to accept workflow-collected data

---

## Implementation Order & Dependencies

```text
Phase 1 (Foundation)     ──→ Phase 2 (Onboarding)
    │                            │
    └──→ Phase 3 (Stock Upload)  │
    │                            │
    └──→ Phase 4 (Guided Docs) ──┘
```

Phase 1 is prerequisite for all others. Phases 2-4 can be done in any order after Phase 1, but the recommended sequence maximizes value: onboarding brings users in, stock upload gives them data, guided docs lets them transact.

