

# Add Asset Bulk Import via CSV/Excel Upload

## What We're Building
An "Import Assets" button on the Assets tab that lets users upload a CSV or Excel file containing a list of assets, instead of manually adding them one by one. This follows the same proven pattern as the existing inventory import system.

## How It Works

### User Flow
1. User clicks **"Import Assets"** button (next to "Add Asset")
2. A modal opens with drag-and-drop file upload (CSV/Excel) + a downloadable template
3. If column headers don't match expected fields, a **column mapper** lets users map their columns
4. A **preview table** shows parsed rows with validation status (green = valid, red = errors)
5. User clicks **Import** → assets are inserted in batches into the database

### New File: `src/components/dashboard/AssetImportModal.tsx`
- Modal with drag-and-drop upload zone for CSV/Excel files
- Reuses the existing `CSVColumnMapper` component for header mapping
- Asset-specific schema fields:
  - `name` (required), `category`, `serial_number`, `purchase_date` (required), `purchase_cost` (required)
  - `salvage_value`, `useful_life_years`, `depreciation_method`, `location`, `assigned_to`, `description`, `status`
- Validates each row (name required, cost > 0, valid category, date not in future)
- Downloadable CSV template with sample data
- Batch insert (50 at a time) with error handling per row
- Shows success/failure summary toast

### Modified File: `src/components/dashboard/AssetsManager.tsx`
- Add an **"Import CSV"** button next to "Add Asset" in the header
- Wire up the `AssetImportModal` with open/close state
- Invalidate assets query on successful import

### Template CSV columns
```
name,category,serial_number,purchase_date,purchase_cost,salvage_value,useful_life_years,depreciation_method,location,assigned_to,description
Dell Laptop,IT,SN-12345,2024-01-15,15000,1000,5,straight_line,Head Office,Finance Dept,Staff laptop
Toyota Hilux,Vehicles,VIN-67890,2023-06-01,450000,50000,10,reducing_balance,Lusaka,Operations,Delivery vehicle
```

### Validation Rules
- **Name**: Required, non-empty
- **Category**: Must match one of: IT, Vehicles, Machinery, Furniture, Buildings, Other (auto-corrected if close match)
- **Purchase Date**: Required, valid date, not in the future
- **Purchase Cost**: Required, must be > 0
- **Salvage Value**: Must be ≥ 0 and < purchase cost
- **Useful Life**: Must be 1–100 years (defaults to 5)
- **Depreciation Method**: `straight_line` or `reducing_balance` (defaults to straight_line)

### Files to create
- `src/components/dashboard/AssetImportModal.tsx`

### Files to modify
- `src/components/dashboard/AssetsManager.tsx` (add import button + modal)

