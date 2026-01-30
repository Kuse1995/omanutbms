
# Fix Branch Filtering in Inventory Tab

## Problem Identified

The **InventoryAgent.tsx** component (the main Inventory tab at `/bms?tab=inventory`) does NOT filter inventory by the selected branch. When you select "Town Centre" from the dropdown, it still shows items from "Downstairs" because:

1. The `fetchInventory()` function queries ALL inventory for the tenant without filtering by branch
2. The `useEffect` only watches `tenantId`, not the selected branch - so changing branches doesn't trigger a refetch

## Root Cause

In `src/components/dashboard/InventoryAgent.tsx`:

```typescript
// Line 91: Branch hook is imported but...
const { currentBranch, isMultiBranchEnabled } = useBranch();

// Lines 101-108: ...never used in the query!
const { data: inventoryData, error } = await supabase
  .from("inventory")
  .select(`*,branches!default_location_id(name)`)
  .eq("tenant_id", tenantId)  // ← Only filters by tenant
  .order("name");             // ← No branch filter!

// Lines 161-165: Branch change doesn't trigger refetch
useEffect(() => {
  if (tenantId) {
    fetchInventory();
  }
}, [tenantId]);  // ← Missing currentBranch?.id
```

## Solution

### Changes to InventoryAgent.tsx

1. **Add branch filter to the query** when a specific branch is selected:
   ```typescript
   let query = supabase
     .from("inventory")
     .select(`*,branches!default_location_id(name)`)
     .eq("tenant_id", tenantId);
   
   // Filter by branch when one is selected
   if (currentBranch && isMultiBranchEnabled) {
     query = query.eq("default_location_id", currentBranch.id);
   }
   
   const { data: inventoryData, error } = await query.order("name");
   ```

2. **Add `currentBranch?.id` to the useEffect dependency array** so switching branches triggers a refetch:
   ```typescript
   useEffect(() => {
     if (tenantId) {
       fetchInventory();
     }
   }, [tenantId, currentBranch?.id]);  // ← Added branch dependency
   ```

3. **Also filter variants query by branch** to keep counts consistent with visible products

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryAgent.tsx` | Add branch filtering to inventory query; add `currentBranch?.id` to useEffect dependencies |

## Expected Behavior After Fix

- **Select "Town Centre"** → Only items with `default_location_id` matching Town Centre branch ID appear
- **Select "Downstairs"** → Only items assigned to Downstairs appear (like the BRAKE PAD)
- **Select "All Branches"** (null) → All tenant inventory appears (admin view)
- **Switch branches** → Inventory table automatically refreshes with filtered data
