
# Plan: Fix Inventory Query Limit Issue

## Problem Identified

Your database has **2,577 active inventory items**, but the UI is only showing ~865. This is caused by:

1. **Supabase's default 1,000 row limit** - When no limit is specified, queries return max 1,000 rows
2. The inventory queries in both `InventoryAgent.tsx` and `SmartInventory.tsx` don't specify a limit

## Solution

Add explicit higher limits to all inventory queries to ensure all items are fetched.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/InventoryAgent.tsx` | Add `.limit(10000)` to fetch query |
| `src/components/dashboard/SmartInventory.tsx` | Add `.limit(10000)` to fetch query |

---

## Technical Changes

### 1. InventoryAgent.tsx (Line ~129)

```typescript
// BEFORE
const { data: inventoryData, error } = await query.order("name");

// AFTER  
const { data: inventoryData, error } = await query
  .order("name")
  .limit(10000);  // Explicitly fetch up to 10,000 items
```

### 2. SmartInventory.tsx (Line ~69)

```typescript
// BEFORE
const { data, error } = await query.order("name");

// AFTER
const { data, error } = await query
  .order("name")
  .limit(10000);  // Explicitly fetch up to 10,000 items
```

---

## Why 10,000?

- Covers most business use cases without hitting performance issues
- For very large catalogs (10,000+), we would implement pagination in a future enhancement
- The batch import can still handle thousands of items efficiently

---

## Expected Outcome

After this fix:
- All 2,577 active items will display in the inventory list
- Future imports will all be visible immediately
- The "865 items" will become "2,577 items"
