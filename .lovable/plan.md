
# Plan: Bulk Selection Feature for Inventory + Branch Assignment on Import

## Overview

This plan implements two improvements to the inventory management system:

1. **Bulk Selection Actions** - Add checkboxes to select multiple inventory items and perform bulk delete or move-to-branch operations
2. **Branch Selection on Import** - Add option to assign imported inventory to a specific branch during the CSV/Excel import process

---

## Current Gap Analysis

| Feature | Current State | Proposed |
|---------|---------------|----------|
| Item Selection | None - single-item actions only | Checkbox on each row + "Select All" |
| Bulk Delete | Not available | Delete multiple selected items |
| Bulk Move | Not available (transfers exist but require approval) | Direct branch reassignment for selected items |
| Import to Branch | No branch option | Branch dropdown in import modal |

---

## Part 1: Bulk Selection Feature

### UI Changes to InventoryAgent.tsx

Add selection state and action bar:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ☐  │ SKU        │ Product     │ Location │ Stock │ Price │ Status │ Actions │
├──────────────────────────────────────────────────────────────────────────────┤
│  ☑  │ PROD-001   │ Brake Pads  │ Branch A │  45   │ K250  │ In Stock│ ...     │
│  ☑  │ PROD-002   │ Oil Filter  │ Branch A │  30   │ K85   │ In Stock│ ...     │
│  ☐  │ PROD-003   │ Spark Plugs │ Branch B │  12   │ K45   │ Low     │ ...     │
└──────────────────────────────────────────────────────────────────────────────┘
             ▲
             │
    ┌────────┴────────────────────────────────────────────────────────┐
    │  ⚡ Bulk Actions Bar (appears when items selected)              │
    │  [3 items selected]  [🗑 Delete Selected]  [📍 Move to Branch ▼] │
    └─────────────────────────────────────────────────────────────────┘
```

### Implementation Details

1. **Selection State**
   - Add `selectedIds: Set<string>` state to track selected item IDs
   - Add "Select All" checkbox in table header
   - Add individual checkbox in each table row

2. **Bulk Actions Bar**
   - Appears when `selectedIds.size > 0`
   - Shows count of selected items
   - "Delete Selected" button (with confirmation dialog)
   - "Move to Branch" dropdown selector

3. **Bulk Delete Logic**
   - Confirmation dialog showing count of items to delete
   - Loop through selected IDs and delete from `inventory` table
   - Clear selection after operation
   - Refresh inventory list

4. **Bulk Move Logic**
   - Branch selector dropdown (populated from `branches` table)
   - Updates `default_location_id` for all selected items
   - No transfer approval required (direct reassignment)
   - Useful for correcting imports or reorganizing stock

---

## Part 2: Branch Selection on Import

### UI Changes to InventoryImportModal.tsx

Add branch selector before import confirmation:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Import Preview                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ✓ 25 Valid   ✗ 2 Invalid                                       │
│                                                                  │
│  📍 Assign to Branch: [▼ Select Branch      ]                   │
│     ○ Headquarters                                               │
│     ○ Branch A                                                   │
│     ○ Branch B                                                   │
│     • No Branch (Central Stock)                                  │
│                                                                  │
│  [Preview Table...]                                              │
│                                                                  │
│  [Cancel]                          [Import 25 Items]            │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Details

1. **Add Branch State**
   - Add `targetBranchId: string | null` state
   - Fetch branches on modal open using `useBranch` hook or direct query

2. **Branch Selector UI**
   - Show above the preview table in "preview" step
   - Default to "No Branch" (null) for central/unassigned stock
   - Only visible when multi-branch is enabled

3. **Import Logic Update**
   - Pass `default_location_id: targetBranchId` when inserting/updating inventory items
   - Applied to all imported rows

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryAgent.tsx` | Add selection state, checkboxes, bulk actions bar |
| `src/components/dashboard/InventoryImportModal.tsx` | Add branch selector, update import logic |

### New Components (Optional)

Could extract bulk actions bar to a reusable component, but for simplicity it will be integrated directly into InventoryAgent.

---

## User Experience Flow

### Bulk Move Flow
1. User views inventory list
2. Checks boxes next to items they want to move
3. Clicks "Move to Branch" dropdown
4. Selects target branch
5. Confirmation: "Move 5 items to Branch A?"
6. Items updated, selection cleared, list refreshed

### Bulk Delete Flow
1. User selects items
2. Clicks "Delete Selected"
3. Confirmation dialog: "Permanently delete 5 items?"
4. Items deleted from database
5. Selection cleared, list refreshed

### Import with Branch Flow
1. User opens Import modal
2. Uploads CSV/Excel file
3. Preview shows parsed data
4. User selects target branch from dropdown
5. Clicks "Import X Items"
6. All items created with selected branch as `default_location_id`

---

## Security Considerations

- Bulk delete follows existing RLS policies (only items in user's tenant)
- Bulk move uses `default_location_id` update (covered by existing inventory UPDATE policy)
- Import already respects tenant_id isolation

---

## Expected Outcome

1. Users can efficiently manage multiple inventory items at once
2. Imported stock can be directly assigned to the correct branch
3. "Move" is distinct from "Transfer" - no approval workflow needed
4. Reduces manual work when reorganizing inventory across locations
