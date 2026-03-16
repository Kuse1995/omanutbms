

# Fix Inventory Visibility: Admin Access + Cache Resilience

## Problem

1. **5 admin users have `can_access_all_branches = false`** in `tenant_users` -- this is incorrect and may cause RLS/query filtering issues for branch-aware inventory queries
2. **InventoryAgent has a 2-minute staleTime with `refetchOnWindowFocus: false`** -- if a transient network error returns empty data, it stays cached for 2 minutes with no automatic recovery

## Fix

### 1. Data fix: Update admin users' `can_access_all_branches`
Run a data UPDATE (via insert tool) to set `can_access_all_branches = true` for all tenant_users where `role = 'admin'`.

```sql
UPDATE public.tenant_users 
SET can_access_all_branches = true 
WHERE role = 'admin' AND (can_access_all_branches = false OR can_access_all_branches IS NULL);
```

### 2. Reduce staleTime + enable refetchOnWindowFocus

**`src/components/dashboard/InventoryAgent.tsx`** (line 263-265):
- Change `staleTime` from 2 minutes → 30 seconds
- Enable `refetchOnWindowFocus: true`

**`src/components/dashboard/SmartInventory.tsx`**:
- SmartInventory uses manual `useEffect` fetching without React Query caching, so no staleTime to change -- but add `retry: 2` pattern isn't applicable here. Instead, ensure the realtime subscription properly refetches.

### 3. Add retry to InventoryAgent query
Add `retry: 2` to the useQuery config so transient failures auto-recover.

## Files to modify
- `src/components/dashboard/InventoryAgent.tsx` -- reduce staleTime, enable refetchOnWindowFocus, add retry
- Data UPDATE via insert tool for tenant_users

