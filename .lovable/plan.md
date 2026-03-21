

# Add Conversational "Add Stock" Workflow + Fix cost_price in Bridge

## Overview

Two changes: (1) a new guided `add_stock` workflow in the WhatsApp handler for text-based product addition, and (2) fixing `handleBulkAddInventory` in the bridge to persist `cost_price`.

## Changes

### 1. `supabase/functions/bms-api-bridge/index.ts`

**Fix `handleBulkAddInventory`** (line ~3567-3574): Add `cost_price` mapping so the field isn't lost.

```typescript
// Before
unit_price: Math.max(0, Number(p.price) || 0),
current_stock: Math.max(0, Math.round(Number(p.quantity) || 0)),
reorder_level: 10, status: 'healthy', category: 'finished_good',

// After — add cost_price
unit_price: Math.max(0, Number(p.price) || Number(p.unit_price) || 0),
cost_price: Math.max(0, Number(p.cost_price) || Number(p.cost) || 0),
current_stock: Math.max(0, Math.round(Number(p.quantity) || Number(p.current_stock) || 0)),
reorder_level: 10, status: 'healthy', category: 'finished_good',
```

### 2. `supabase/functions/whatsapp-bms-handler/index.ts`

**a) Add `processAddStockWorkflow()` function** (~80 lines, placed after the stock upload workflow section around line 670):

Steps: `ask_name` → `ask_quantity` → `ask_price` → `ask_cost` → `confirm`

- Each step validates input (numeric for quantity/price/cost)
- On confirm: calls `bms-api-bridge` with `bulk_add_inventory` intent for all collected products
- After confirm: asks "Add another?" — if yes, loops back to `ask_name` with accumulated products list
- User can say "cancel" at any step

**b) Add `add_stock` case to workflow router** (line ~682):

```typescript
case 'add_stock':
  return processAddStockWorkflow(supabase, workflow, body, phone);
```

**c) Split trigger patterns** (line ~1112, ~1148):

Current `stockUploadPatterns` triggers photo upload for ALL phrases including "add stock". Split into:
- **Text triggers** → start `add_stock` workflow: "add stock", "new product", "add product", "add item", "restock"
- **Photo triggers** → keep `stock_upload` workflow: "upload stock", "upload products", "bulk stock", "add my products"

Text triggers show: "What's the product name?" instead of asking for a photo.

### Conversation Example

```text
User: "add stock"
AI: "📦 Let's add a product!\n\nWhat's the product name?"
User: "Cement"
AI: "How many units of *Cement* should we stock?"
User: "50"
AI: "What's the selling price per unit?"
User: "250"
AI: "What's the cost price per unit? (what you paid — say 0 or skip if unsure)"
User: "180"
AI: "📦 *Cement*\n• Qty: 50\n• Sell: K250\n• Cost: K180\n\nAdd this? (yes/no)"
User: "yes"
AI: "✅ Cement added! Want to add another product? (yes/no)"
User: "no"
AI: "All done! Added 1 product. Say 'check stock' to see your inventory."
```

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/bms-api-bridge/index.ts` | Add `cost_price` mapping in `handleBulkAddInventory` |
| `supabase/functions/whatsapp-bms-handler/index.ts` | Add `processAddStockWorkflow`, update workflow router, split trigger patterns |

