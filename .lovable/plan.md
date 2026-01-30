
# Inventory Module Refactor for Auto Shop and UI Improvements

## Overview

This plan addresses 5 specific improvements to the Inventory module, focusing on Auto Shop business type customization and general UX enhancements across all business types.

---

## Task 1: Rename "Auto Parts" to "Products" for Auto Shop

**Current State**: The `autoshop` business type uses terminology like "Auto Part" and "Auto Parts" throughout the UI.

**Files to Modify**:
- `src/lib/business-type-config.ts` (lines 952-967)

**Changes**:
```typescript
// Update autoshop terminology
terminology: {
  product: 'Product',        // was 'Auto Part'
  products: 'Products',      // was 'Auto Parts'
  // ... rest unchanged
  inventory: 'Products & Spares',  // was 'Parts & Spares'
}
```

This change propagates automatically to all UI components using `useBusinessConfig()` or `useFeatures()` hooks since they read from this central config.

---

## Task 2: Hide Materials & Consumables Categories for Auto Shop

**Current State**: The inventory filter chips in `InventoryAgent.tsx` show "Materials" and "Consumables" for all business types, including Auto Shop where they're irrelevant.

**File to Modify**:
- `src/components/dashboard/InventoryAgent.tsx` (lines 388-419)

**Solution**: Gate the Materials and Consumables filter badges behind business type checks:

```typescript
// Only show Materials/Consumables for fashion business type
const showMaterialsAndConsumables = businessType === 'fashion';

// In the JSX, conditionally render:
{showMaterialsAndConsumables && (
  <Badge ... onClick={() => setClassFilter("raw_material")}>
    Materials (...)
  </Badge>
)}
{showMaterialsAndConsumables && (
  <Badge ... onClick={() => setClassFilter("consumable")}>
    Consumables (...)
  </Badge>
)}
```

Also hide the "Type" column in the inventory table for non-fashion businesses since all items will be "Products".

---

## Task 3: Make Low Stock Alerts Less Intrusive

**Current State**: Low stock alerts display as a prominent Card with full list of items (lines 368-387 in `InventoryAgent.tsx`).

**Solution**: Replace the expanded Card with a collapsible section using the Collapsible component:

```typescript
// New compact low stock alert design
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

{lowStockItems.length > 0 && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 text-sm font-medium">Low Stock Alerts</span>
        </div>
        <Badge variant="destructive" className="text-xs">
          {lowStockItems.length}
        </Badge>
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <Card className="bg-amber-50/50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (...))}
          </div>
        </CardContent>
      </Card>
    </CollapsibleContent>
  </Collapsible>
)}
```

**Benefits**:
- Shows only a small badge count by default
- Users can expand to see details when needed
- Reduces visual clutter on the inventory page

---

## Task 4: Hide Empty Categories/Headings in Inventory Dashboard

**Current State**: Filter chips show all categories with their counts, including `(0)` for empty categories.

**Solution**: Hide filter badges that have zero items:

```typescript
// Calculate counts
const materialsCount = inventoryForView.filter(i => i.inventory_class === 'raw_material').length;
const consumablesCount = inventoryForView.filter(i => i.inventory_class === 'consumable').length;

// Only render badges with items > 0 (except "All" which always shows)
{showMaterialsAndConsumables && materialsCount > 0 && (
  <Badge ...>
    Materials ({materialsCount})
  </Badge>
)}
{showMaterialsAndConsumables && consumablesCount > 0 && (
  <Badge ...>
    Consumables ({consumablesCount})
  </Badge>
)}
```

Also apply to the "Products" badge - only hide if it's the only category and we're showing "All":

```typescript
// Always show Products badge since it's the main category
// (Users still need a way to filter even if count is low)
```

---

## Task 5: Auto-Populate Warehouses in Location Dropdown

**Current State**: The `ProductModal.tsx` fetches locations when opened (lines 167-183), but if a warehouse was created AFTER the modal was last opened, users must close and reopen the modal.

**Current Code**:
```typescript
const fetchLocations = async () => {
  const { data } = await supabase
    .from("branches")
    .select("id, name, type")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");
  if (data) setLocations(data);
};

if (open) fetchLocations();  // Only fetches when modal opens
```

**Solution**: Add a real-time subscription to the `branches` table so new warehouses appear automatically:

```typescript
// In ProductModal.tsx - add real-time subscription
useEffect(() => {
  if (!tenantId) return;

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");
    if (data) setLocations(data);
  };

  // Initial fetch when modal opens
  if (open) fetchLocations();

  // Subscribe to branch changes
  const channel = supabase
    .channel('product-modal-branches')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'branches',
        filter: `tenant_id=eq.${tenantId}`,
      },
      () => fetchLocations()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [open, tenantId]);
```

**Alternative (simpler)**: Always refetch locations when the modal opens, which already happens. The "issue" might be that users expect instant updates. Adding a subscription ensures the dropdown stays current even if they create a warehouse in another tab.

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/lib/business-type-config.ts` | Update autoshop terminology from "Auto Part" to "Product" |
| `src/components/dashboard/InventoryAgent.tsx` | 1. Hide Materials/Consumables for non-fashion<br>2. Collapsible low stock alerts<br>3. Hide empty category badges |
| `src/components/dashboard/ProductModal.tsx` | Add real-time subscription for locations dropdown |

---

## Technical Notes

- All terminology changes flow through the `useBusinessConfig()` hook, so updating the config automatically updates all UI components
- The Collapsible component is already available from shadcn/ui (`@radix-ui/react-collapsible`)
- Real-time subscriptions use Supabase's existing channel system with proper cleanup
- No database migrations required for these changes
