
# Plan: Add Functional Search Bar to Inventory Management

## Problem

The Inventory Management screen has **no search functionality**. With 2,500+ items paginated at 100 per page, users must click through 25+ pages to find a specific product. The only search bar visible (in the header) is decorative and not connected to any logic.

## Solution

Add a dedicated search bar to the InventoryAgent component that performs **server-side search** using Supabase's `ilike` operator, searching both product name and SKU.

---

## Technical Changes

### 1. Add Search State and Input

Add a new state variable and debounce logic:

```typescript
const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
```

Add debounce effect to prevent excessive API calls:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### 2. Update Supabase Query

Modify the `fetchInventory` function to include search filtering:

```typescript
// Add search filter to both count and data queries
if (debouncedSearch.trim()) {
  const searchPattern = `%${debouncedSearch.trim()}%`;
  countQuery = countQuery.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`);
  query = query.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`);
}
```

### 3. Add Search Input UI

Insert a search input between the header and the filter chips:

```text
+------------------------------------------------------------------+
| [Search icon] Search products by name or SKU...           [X]   |
+------------------------------------------------------------------+
| [All (865)] [Products] [Materials] [Consumables]                 |
+------------------------------------------------------------------+
```

### 4. Reset Page on Search

When search term changes, reset to page 1:

```typescript
useEffect(() => {
  setCurrentPage(1);
}, [debouncedSearch]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryAgent.tsx` | Add search state, debounce effect, update query, add Input UI |

---

## UI Design

The search bar will be placed prominently above the filter chips:

```
+----------------------------------------------------------+
| 🔍 | Search products by name or SKU...              | ✕ |
+----------------------------------------------------------+
```

- **Icon**: Search icon on the left
- **Placeholder**: "Search by name or SKU..."
- **Clear button**: Shows when text is entered
- **Debounced**: 300ms delay before triggering search

---

## Query Behavior

| User Action | Query Sent |
|-------------|------------|
| Type "cotton" | `WHERE (name ILIKE '%cotton%' OR sku ILIKE '%cotton%') AND tenant_id = X` |
| Clear search | Normal paginated query without search filter |
| Search + filter | `WHERE ... AND inventory_class = 'raw_material'` (both combined) |

---

## Dependencies

The project already has the required `Input` component at `src/components/ui/input.tsx`. No new dependencies needed.

---

## Expected Outcome

1. **Instant search** - Users can find any product by typing a few characters
2. **Server-side filtering** - Works with any catalog size (10k+ items)
3. **Combined with filters** - Search works alongside branch, archive, and category filters
4. **Clear feedback** - Shows "Showing 3 results for 'cotton'" or similar
5. **Reset on clear** - Clearing search shows all items again
