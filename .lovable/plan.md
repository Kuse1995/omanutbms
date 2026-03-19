
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

## Files Modified
- `supabase/functions/whatsapp-bms-handler/index.ts` — Full rewrite with workflow engine + all 4 phases
- `supabase/functions/bms-api-bridge/index.ts` — Added `create_tenant_from_whatsapp` and `bulk_add_inventory` actions
- `supabase/config.toml` — Registered `whatsapp-stock-extractor` function

## New Files
- `supabase/functions/whatsapp-stock-extractor/index.ts` — Vision AI product extraction

## DB Migration
- `whatsapp_conversations` table with RLS, unique phone index, expiry index, auto-updated_at trigger
