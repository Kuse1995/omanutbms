
## What’s happening (root cause)
When you edit a product and change **Storage Location**, the modal shows **“No changes detected to save”** because `ProductModal.tsx` uses a helper called `getFieldChanges()` to decide whether anything changed.

Right now, `getFieldChanges()` **does not check** these fields:
- `default_location_id` (Storage Location)
- `inventory_class` (Type)
- `unit_of_measure` (Unit of Measure)
- Fashion fields like `brand`, `material`, `gender`, `collection_id` (if enabled)

So if you only change the location (or any of the fields above), the system incorrectly thinks nothing changed and blocks saving.

---

## Goal
Allow saving when changing Storage Location (and the other missing fields) by making the “change detection” aware of them.

---

## Files involved
- `src/components/dashboard/ProductModal.tsx` (main fix)

---

## Implementation steps (what I will change)

### 1) Update change detection to include “Inventory Classification” fields
In `ProductModal.tsx`, inside `getFieldChanges()`:
- Add labels:
  - “Inventory Type”
  - “Storage Location”
  - “Unit of Measure”
- Add comparisons:
  - Compare `formData.inventory_class` vs `product.inventory_class` (normalize defaults like `"finished_good"`)
  - Compare `formData.unit_of_measure` vs `product.unit_of_measure` (normalize defaults like `"pcs"`)
  - Compare `formData.default_location_id` vs `product.default_location_id` (normalize null/empty string)

For Storage Location display in the confirm dialog:
- Convert IDs to human-readable names using the already-loaded `locations` state:
  - `""` / `null` → “No default location”
  - Otherwise show the branch name (and optionally include the type icon like the dropdown does)

### 2) Update change detection to include Fashion fields (only when enabled)
Still inside `getFieldChanges()`:
- If `config.inventory.showFashionFields` is enabled, compare and track:
  - `brand`
  - `material` (handle sentinel values like `"none"`)
  - `gender` (handle `"any"`)
  - `collection_id` (handle `"none"` / empty)
- Display names for collections using the already-loaded `collections` state when possible.

### 3) Ensure the update query is tenant-scoped (safety + consistency)
In `performSave()`, when updating an existing product:
- Change the update query from:
  - `.eq("id", product.id)`
- To:
  - `.eq("id", product.id).eq("tenant_id", tenantId)`
This matches the app’s “tenant-scoped query enforcement” pattern and avoids any edge cases where RLS blocks updates unexpectedly.

---

## How we’ll verify (end-to-end)
1. Go to **/bms → Inventory** (or Shop Manager → Products & Inventory).
2. Click **Edit** on a product.
3. Change only **Storage Location** and click **Save**.
4. Expected result:
   - You should see the **Confirm Changes** dialog listing “Storage Location”.
   - After confirming, you should see “Product Updated”.
   - Re-open the product: the selected Storage Location should persist.
5. Repeat by changing only:
   - Inventory Type
   - Unit of Measure
   - (If enabled) Brand/Material/Gender/Collection  
   Each should now save properly.

---

## Notes (important behavior clarification)
Changing **Storage Location** here sets the product’s **default location metadata**. It does **not** physically move stock between locations. Physical movement should still happen via **Stock Transfers**.

---

## Optional follow-up (if you want)
If you want, we can also add an “Archive/Restore” control inside the **Product Edit modal** so it’s visible even if the table action buttons are off-screen on smaller displays. (Not required for the location-save fix, but it can reduce confusion.)
