
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

## Files Modified
- `supabase/functions/whatsapp-bms-handler/index.ts` — Full rewrite with workflow engine + all 4 phases
- `supabase/functions/bms-api-bridge/index.ts` — Added `create_tenant_from_whatsapp` and `bulk_add_inventory` actions
- `supabase/functions/purge-expired-tenants/index.ts` — Rewritten: 30-day archive + 90-day purge
- `src/components/dashboard/SubscriptionRequiredModal.tsx` — 30-day countdown, softer language
- `src/components/dashboard/SubscriptionActivationGate.tsx` — Read-only mode indicator, softer messaging

## New Files
- `supabase/functions/whatsapp-stock-extractor/index.ts` — Vision AI product extraction

## DB Migrations
- `whatsapp_conversations` table with RLS, unique phone index, expiry index, auto-updated_at trigger
- `business_profiles.archived_at` column added
