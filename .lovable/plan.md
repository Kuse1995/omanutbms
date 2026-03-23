
## What I found

The failure is real and reproducible from the stored WhatsApp audit logs. I also checked the live database constraint:

- `inventory.category` only allows values like `primary`, `secondary`, `bulk`, `other`, etc.
- `inventory.inventory_class` is where values like `finished_good` belong.
- The error strongly suggests the WhatsApp add-stock flow is still trying to insert `finished_good` into `category`, which violates `inventory_category_check`.

I also inspected the current code:

- `supabase/functions/bms-api-bridge/index.ts` already contains normalization that should convert unknown categories to `other`.
- `supabase/functions/whatsapp-bms-handler/index.ts` sends products through `bulk_add_inventory`.
- Since the live error still happens, the likely issue is one of these:
  1. the live bridge is not aligned with the current source,
  2. another path still injects `category: 'finished_good'`,
  3. the workflow is mixing `category` and `inventory_class`.

## Plan

1. **Make the inventory contract explicit in the bridge**
   - Update `handleBulkAddInventory` so it clearly treats:
     - `inventory_class` as `finished_good | raw_material | consumable`
     - `category` as business taxonomy only (`other`, `primary`, etc.)
   - Add defensive mapping so if incoming `category` is `finished_good`, `raw_material`, or `consumable`, it gets moved to `inventory_class` and `category` falls back to `other`.

2. **Make WhatsApp workflows send safe values**
   - In `supabase/functions/whatsapp-bms-handler/index.ts`, ensure both:
     - `processAddStockWorkflow`
     - `processStockUploadWorkflow`
   send products with an explicit safe payload, e.g. `category: 'other'` and `inventory_class: 'finished_good'` unless a valid category is known.

3. **Improve bridge error visibility**
   - Add targeted logging around the final normalized insert payload in `bms-api-bridge` so category/class mistakes are visible immediately if this happens again.
   - Return a clearer business error instead of only surfacing the raw constraint message.

4. **Redeploy and verify the live functions**
   - Redeploy both:
     - `bms-api-bridge`
     - `whatsapp-bms-handler`
   - Then test both WhatsApp entry points:
     - text flow: “add stock”
     - image flow: “upload stock”

5. **Tighten post-fix QA**
   - Confirm inserted inventory rows have:
     - `category = 'other'` (or another valid taxonomy value)
     - `inventory_class = 'finished_good'`
   - Confirm no new `inventory_category_check` errors appear in logs.

## Technical details

```text
Current bad shape:
category = 'finished_good'   -> invalid

Correct shape:
category = 'other'           -> valid
inventory_class = 'finished_good' -> valid
```

### Files to update
- `supabase/functions/bms-api-bridge/index.ts`
- `supabase/functions/whatsapp-bms-handler/index.ts`

### No database migration needed
The database constraint is already correct. This is an application-layer mapping bug, not a schema problem.
