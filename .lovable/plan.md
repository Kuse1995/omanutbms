

# Asset Management Module Implementation Plan

## Overview
This plan details the implementation of a full **Asset Management** module for the Omanut BMS. The module will track company fixed assets (IT equipment, vehicles, machinery, furniture), calculate depreciation using industry-standard methods, and integrate with the existing Accounts module for financial reporting.

---

## 1. Database Schema

### Table: `assets`
Stores the master record for each fixed asset.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Links to tenants table (RLS enforced) |
| `name` | TEXT | Asset name (e.g., "Dell Laptop - Finance") |
| `description` | TEXT | Optional notes |
| `category` | TEXT | One of: 'IT', 'Vehicles', 'Machinery', 'Furniture', 'Buildings', 'Other' |
| `purchase_date` | DATE | When the asset was acquired |
| `purchase_cost` | NUMERIC | Original cost in ZMW |
| `depreciation_method` | TEXT | 'straight_line' or 'reducing_balance' |
| `useful_life_years` | INTEGER | Expected lifespan (e.g., 5 years) |
| `salvage_value` | NUMERIC | Residual value at end of life |
| `status` | TEXT | 'active', 'disposed', 'fully_depreciated' |
| `disposal_date` | DATE | When disposed (if applicable) |
| `disposal_value` | NUMERIC | Sale/scrap value on disposal |
| `serial_number` | TEXT | Optional serial/tag number |
| `location` | TEXT | Physical location |
| `assigned_to` | TEXT | Employee or department |
| `image_url` | TEXT | Photo of the asset |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last modification time |

### Table: `asset_logs`
Audit trail for asset changes (revaluations, transfers, maintenance).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `asset_id` | UUID | References assets(id) |
| `tenant_id` | UUID | For RLS |
| `action` | TEXT | 'created', 'updated', 'depreciation_run', 'disposed', 'transferred' |
| `old_value` | JSONB | Previous state (for updates) |
| `new_value` | JSONB | New state |
| `notes` | TEXT | Optional description |
| `performed_by` | UUID | User who made the change |
| `created_at` | TIMESTAMPTZ | When the action occurred |

### RLS Policies
Both tables will have RLS enabled with policies:
- **SELECT**: `user_belongs_to_tenant(tenant_id)`
- **INSERT**: `user_belongs_to_tenant(tenant_id)`
- **UPDATE**: `is_tenant_admin_or_manager(tenant_id)`
- **DELETE**: `is_tenant_admin(tenant_id)`

### Indexes
- `idx_assets_tenant_id` on `assets(tenant_id)`
- `idx_assets_status` on `assets(tenant_id, status)`
- `idx_asset_logs_asset_id` on `asset_logs(asset_id)`

---

## 2. Depreciation Calculation Logic

### TypeScript Utility: `calculateDepreciation(asset)`

```text
+------------------------------------------+
|         calculateDepreciation()           |
+------------------------------------------+
| Input: asset object                       |
|                                          |
| Returns:                                  |
|   - accumulatedDepreciation: number      |
|   - netBookValue: number                 |
|   - monthlyDepreciation: number          |
|   - percentDepreciated: number           |
|   - yearsRemaining: number               |
+------------------------------------------+
```

### Formulas

**Straight-Line Method:**
```
Annual Depreciation = (Purchase Cost - Salvage Value) / Useful Life Years
Monthly Depreciation = Annual Depreciation / 12
Accumulated = Annual Depreciation × Years Elapsed
NBV = Purchase Cost - Accumulated Depreciation
```

**Reducing Balance Method (20% rate):**
```
Year 1 NBV = Purchase Cost × (1 - 0.20)
Year N NBV = Previous Year NBV × (1 - 0.20)
Monthly = (Previous NBV - Current NBV) / 12
```

The utility will be placed in `src/lib/asset-depreciation.ts`.

---

## 3. UI Components

### 3.1 Assets Manager (`AssetsManager.tsx`)
Main container component with tabs:

| Tab | Content |
|-----|---------|
| **Dashboard** | Summary cards + alerts |
| **Registry** | Searchable table of all assets |
| **Disposal** | Disposed assets history |

### 3.2 Asset Dashboard Cards
Three summary cards:

| Card | Color | Data |
|------|-------|------|
| **Total Assets** | Blue | Count of active assets |
| **Net Book Value** | Green | Sum of all current NBVs |
| **Upcoming Depreciation** | Amber | Assets depreciating this month |

### 3.3 Asset Registry Table
Columns: Name, Category, Purchase Date, Purchase Cost, NBV, Status, Actions
- **Search**: By name, category, serial number
- **Filter**: By category, status
- **Actions**: View, Edit, Calculate Depreciation, Dispose

### 3.4 Add/Edit Asset Modal (`AssetModal.tsx`)
Multi-step dialog with validation:

**Step 1 - Basic Info:**
- Name (required)
- Category (select: IT, Vehicles, Machinery, Furniture, Buildings, Other)
- Serial Number
- Description

**Step 2 - Financial Details:**
- Purchase Date (required, must be past/today)
- Purchase Cost (required, > 0)
- Salvage Value (default: 0)
- Useful Life Years (required, 1-50)
- Depreciation Method (select)

**Step 3 - Assignment:**
- Location
- Assigned To
- Photo Upload

### 3.5 Depreciation Calculator Modal
Shows detailed breakdown for a single asset:
- Annual/monthly depreciation amounts
- Depreciation schedule table by year
- Visual progress bar of depreciation

### 3.6 CSV Export
Button to download the full asset register as CSV with columns:
`Name, Category, Serial Number, Purchase Date, Purchase Cost, Depreciation Method, Useful Life, Salvage Value, Current NBV, Status`

---

## 4. Integration Points

### 4.1 Navigation
Add "Assets" to the **Sales & Finance** category in sidebar:
- Icon: `Landmark` from lucide-react
- Position: After "Accounts"
- Feature flag: Core module (always available, or tied to `advanced_accounting`)

### 4.2 Role Access
Add "assets" to `ModuleKey` and grant access to:
- admin, manager, accountant, operations_manager

### 4.3 Dashboard Type
Add `"assets"` to the `DashboardTab` union type.

### 4.4 Accounts Integration
Add an "Assets" tab inside the Accounts Agent that shows:
- Quick summary of total asset value
- Link to full Asset Manager

### 4.5 Currency Formatting
All monetary values will use `currencySymbol` from `useFeatures()` or `useBusinessConfig()`:
```tsx
{currencySymbol} {value.toLocaleString()}
// Example: K 1,250.00
```

---

## 5. Files to Create

| File | Purpose |
|------|---------|
| `src/lib/asset-depreciation.ts` | Depreciation calculation utility |
| `src/components/dashboard/AssetsManager.tsx` | Main assets module |
| `src/components/dashboard/AssetModal.tsx` | Add/Edit asset dialog |
| `src/components/dashboard/AssetDepreciationModal.tsx` | Depreciation detail view |
| Migration SQL | Create tables with RLS |

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add "assets" case, import AssetsManager |
| `src/components/dashboard/DashboardSidebar.tsx` | Add assets menu item |
| `src/lib/role-config.ts` | Add "assets" to ModuleKey and role access |
| `src/components/dashboard/AccountsAgent.tsx` | Add Assets summary tab |

---

## 7. Testing Checklist

After implementation:
1. Create a new asset with Straight-Line depreciation
2. Verify NBV calculation matches expected formula
3. Create an asset with Reducing Balance method
4. Verify depreciation schedule displays correctly
5. Test CSV export downloads with all assets
6. Verify only Admin/Manager can edit/delete assets
7. Test disposal workflow updates status correctly
8. Confirm all values show "K" currency formatting

---

## 8. Sample Depreciation Output

For a K 10,000 asset with 5-year life and K 1,000 salvage:

**Straight-Line:**
```
Annual Depreciation: K 1,800
Monthly Depreciation: K 150
After 2 Years:
  - Accumulated: K 3,600
  - NBV: K 6,400
```

**Reducing Balance (20%):**
```
Year 1: K 10,000 → K 8,000 (K 2,000 depreciation)
Year 2: K 8,000 → K 6,400 (K 1,600 depreciation)
After 2 Years:
  - Accumulated: K 3,600
  - NBV: K 6,400
```

