

# Plan: Replace Delete with Archive + Allow Re-Import Over Archived Items

## Problem Summary

1. **Delete Button Fails**: Items with sales history can't be deleted due to foreign key constraints
2. **Re-Import Blocked**: When an archived item exists with the same SKU, importing updates the archived item instead of creating a fresh one

---

## Solution Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CHANGES REQUIRED                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  1. Replace "Delete Selected" button with "Archive Selected" button             │
│  2. Update bulk action to use archive (is_archived = true) instead of delete   │
│  3. Modify import logic to skip archived items when checking for existing SKU  │
│     → This allows creating new items with same SKU as archived ones            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Replace Bulk Delete with Bulk Archive

### Changes to InventoryAgent.tsx

**Button Label Change:**
- Change "Delete Selected" → "Archive Selected"
- Change icon from `Trash2` → `Archive`
- Change button style from red to amber/warning

**Handler Change:**
- Rename `handleBulkDelete` → `handleBulkArchive`
- Change from `.delete()` to `.update({ is_archived: true })`
- Update toast messages accordingly

**Dialog Update:**
- Change title from "Delete X Products?" to "Archive X Products?"
- Change description to explain items will be hidden but kept for history
- Remove warning about "cannot be undone" (archived items can be restored)

---

## Part 2: Allow Re-Import Over Archived Items

### Changes to InventoryImportModal.tsx

**Current Logic (Problem):**
```typescript
const { data: existing } = await supabase
  .from("inventory")
  .select("id")
  .eq("sku", row.sku)
  .eq("tenant_id", tenantId)
  .maybeSingle();  // ❌ Finds archived items too
```

**New Logic (Solution):**
```typescript
const { data: existing } = await supabase
  .from("inventory")
  .select("id")
  .eq("sku", row.sku)
  .eq("tenant_id", tenantId)
  .eq("is_archived", false)  // ✅ Only find active items
  .maybeSingle();
```

This means:
- If SKU exists and is **active** → Update the existing item
- If SKU exists but is **archived** → Create a NEW item with that SKU
- If SKU doesn't exist → Create a new item

---

## User Experience Flow

### Archiving Items
```text
User selects items → Clicks "Archive Selected"
         │
         ▼
┌─────────────────────────────────┐
│  Archive Confirmation Dialog    │
│  "Archive 5 Products?"          │
│  These will be hidden but kept  │
│  for sales history. Restore     │
│  anytime via "Show Archived".   │
└─────────────────────────────────┘
         │
         ▼
Items set to is_archived = true
Disappear from main list
Visible in "Show Archived" mode
```

### Re-Importing Archived SKUs
```text
User has archived item: SKU = "BRAKE-001"
User uploads CSV with same SKU "BRAKE-001"
         │
         ▼
Import finds no ACTIVE item with that SKU
         │
         ▼
Creates NEW item with SKU "BRAKE-001"
Old archived version preserved for history
```

---

## Technical Implementation

### File: src/components/dashboard/InventoryAgent.tsx

| Change | Location | Description |
|--------|----------|-------------|
| State rename | Line ~99 | `bulkDeleteDialogOpen` → `bulkArchiveDialogOpen` |
| Handler rename | Line ~293-321 | `handleBulkDelete` → `handleBulkArchive`, change to `.update({ is_archived: true })` |
| Button UI | Lines ~566-574 | Change to Archive style (amber, Archive icon) |
| Dialog content | Lines ~876-906 | Update title, description, button text for archive |

### File: src/components/dashboard/InventoryImportModal.tsx

| Change | Location | Description |
|--------|----------|-------------|
| SKU lookup query | Lines ~413-418 | Add `.eq("is_archived", false)` filter |

---

## Expected Outcome

1. **No more FK constraint errors** - Archive preserves data relationships
2. **Fresh imports work** - Same SKU can be imported again after archiving
3. **History preserved** - Archived items remain visible in "Show Archived" mode
4. **Restorable** - Accidentally archived items can be restored anytime
5. **Clean workflow** - Upload mistake? Archive old items, re-import correct data

