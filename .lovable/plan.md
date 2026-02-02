

# Plan: Relaxed SKU Rule for Inventory Imports

## Problem Summary

Some tenants don't track products by SKU. Currently:
- The database requires a non-null SKU
- The import modal marks SKU as "required"
- Rows without SKU fail validation and can't be imported

---

## Proposed Solution: Auto-Generate SKU When Missing

The best approach is to **auto-generate a unique SKU** when one isn't provided. This:
- Maintains database integrity (unique constraint satisfied)
- Allows tenants without SKU systems to import freely
- Preserves SKU-based duplicate detection for tenants who DO use them
- Requires no database schema changes

---

## Implementation Details

### 1. Schema Definition Change

Update `inventorySchemaFields` to make SKU optional:

```typescript
// Before
{ key: 'sku', label: 'SKU', required: true, ... }

// After  
{ key: 'sku', label: 'SKU', required: false, ... }
```

### 2. Auto-Generate SKU Logic

When SKU is empty during import:

```text
┌─────────────────────────────────────────────────────────────────┐
│  SKU Generation Pattern                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Format: AUTO-{timestamp}-{random}                               │
│  Example: AUTO-1738500000-A7X9                                   │
│                                                                  │
│  • Guaranteed unique per import batch                            │
│  • Clearly identifiable as auto-generated                        │
│  • Can be edited later by user if needed                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Validation Logic Change

Update the validation in `convertToParsedRows`:

```typescript
// Before
if (!parsed.sku) errors.push("SKU is required");

// After
// SKU is optional - will be auto-generated if empty
// (No validation error for missing SKU)
```

### 4. Import Logic Change

Update `handleImport` to generate SKU for new items:

```typescript
// When inserting new item without SKU
const generatedSku = row.sku || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const insertData = {
  sku: generatedSku,
  // ... rest of fields
};
```

### 5. Preview Display

Show users when SKU will be auto-generated:
- Display "(Auto)" badge next to empty SKU cells in preview table
- Add info message: "Items without SKU will get one auto-generated"

---

## User Experience Flow

```text
User uploads CSV without SKU column
           │
           ▼
┌────────────────────────────────────────┐
│  Import Preview                         │
│  ─────────────────────────────────────  │
│  ℹ️ 15 items will have SKU generated    │
│                                         │
│  │ SKU        │ Name      │ Price │     │
│  │ (Auto)     │ T-Shirt   │ K150  │     │
│  │ (Auto)     │ Jeans     │ K350  │     │
│  │ SHOE-001   │ Sneakers  │ K450  │     │
│                                         │
│           [Import 3 Items]              │
└────────────────────────────────────────┘
           │
           ▼
Items created with:
- AUTO-1738500123-A7X9 → T-Shirt
- AUTO-1738500123-B3K2 → Jeans  
- SHOE-001 → Sneakers (user's SKU kept)
```

---

## Duplicate Handling

When SKU is empty:
- **Can't match existing items** → Always creates new record
- This is intentional: without a SKU, there's no identifier to match

When SKU is provided:
- **Matches existing active item** → Updates it
- **Matches archived item** → Creates new record
- **No match** → Creates new record

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryImportModal.tsx` | Remove SKU required validation, add auto-generate logic, show "(Auto)" in preview |

---

## Why This Approach?

| Alternative | Pros | Cons |
|-------------|------|------|
| ❌ Make SKU nullable in DB | Simple | Breaks unique constraint, complicates queries |
| ❌ Use product name as SKU | Uses existing data | Names aren't unique, causes conflicts |
| ✅ **Auto-generate SKU** | Maintains integrity, no DB changes | Users may need to edit later |
| ❌ Require SKU always | Maintains current behavior | Blocks tenants without SKU system |

---

## Expected Outcome

1. **Tenants with SKUs**: Import works exactly as before
2. **Tenants without SKUs**: Can now import freely with auto-generated identifiers
3. **Mixed cases**: Provided SKUs are used, missing ones are generated
4. **No database changes required**

