

# Plan: Remove Arbitrary Limit + Add Pagination for Large Catalogs

## Problem Identified

The inventory display is working correctly - it shows items filtered by the selected branch:
- **Downstairs**: 1,522 items
- **KITWE**: 972 items
- **Central/Unassigned**: 414 items
- Plus other branches

The `.limit(10000)` is a workaround, but enterprise clients may have 50,000+ items. We need proper pagination instead of arbitrary limits.

---

## Solution: Server-Side Pagination

Replace the fixed limit with paginated queries that load items in pages of 100. Users can navigate through pages efficiently.

---

## Technical Changes

### 1. Add Pagination State to InventoryAgent

```typescript
// New state variables
const [currentPage, setCurrentPage] = useState(1);
const [totalCount, setTotalCount] = useState(0);
const ITEMS_PER_PAGE = 100;
```

### 2. Update Query to Use Pagination

```typescript
const fetchInventory = async () => {
  if (!tenantId) return;
  
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // First get total count
  let countQuery = supabase
    .from("inventory")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  
  if (!showArchived) countQuery = countQuery.eq("is_archived", false);
  if (currentBranch && isMultiBranchEnabled) {
    countQuery = countQuery.eq("default_location_id", currentBranch.id);
  }
  
  const { count } = await countQuery;
  setTotalCount(count || 0);

  // Then fetch paginated data
  let query = supabase
    .from("inventory")
    .select(`*, branches!default_location_id(name)`)
    .eq("tenant_id", tenantId)
    .order("name")
    .range(from, to);  // Paginate instead of limit
  
  // Apply filters...
  const { data, error } = await query;
  // ...
};
```

### 3. Add Pagination UI

Add pagination controls below the inventory table:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Showing 1-100 of 1,522 items          │ ◀ 1 2 3 ... 16 ▶       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryAgent.tsx` | Add pagination state, update query to use `.range()`, add pagination UI |
| `src/components/dashboard/SmartInventory.tsx` | Same pagination pattern (if needed for Warehouse View) |

---

## UI Components

Using existing `Pagination` component from `src/components/ui/pagination.tsx`:

```typescript
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// In render:
<div className="flex items-center justify-between mt-4">
  <p className="text-sm text-muted-foreground">
    Showing {from + 1}-{Math.min(to, totalCount)} of {totalCount.toLocaleString()} items
  </p>
  <Pagination>
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
        />
      </PaginationItem>
      {/* Page numbers */}
      <PaginationItem>
        <PaginationNext 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
        />
      </PaginationItem>
    </PaginationContent>
  </Pagination>
</div>
```

---

## Reset Page on Filter Change

When branch or archive filter changes, reset to page 1:

```typescript
useEffect(() => {
  setCurrentPage(1);
}, [currentBranch?.id, showArchived, classFilter]);
```

---

## Performance Benefits

| Scenario | Before (limit 10000) | After (pagination) |
|----------|---------------------|-------------------|
| 1,500 items | Load all 1,500 at once | Load 100, navigate |
| 10,000 items | Load all 10,000 at once | Load 100, navigate |
| 50,000 items | Would hit limit | Load 100, navigate |
| Memory usage | High for large catalogs | Constant ~100 items |
| Initial load time | 2-5 seconds | ~200ms |

---

## Expected Outcome

1. **No arbitrary limits** - Enterprise catalogs of any size work
2. **Fast initial load** - Only 100 items loaded per page
3. **Clear navigation** - Users see "Page 1 of 16" etc.
4. **Branch filtering intact** - Shows only selected branch's items
5. **Total count visible** - "Showing 1-100 of 1,522 items"

