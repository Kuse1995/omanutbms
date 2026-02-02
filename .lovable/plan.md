
# Plan: Smart Import Resume & Duplicate Detection

## Problem

When importing a large file (e.g., 7,000 items) and only 500 succeed due to errors or interruptions, users have no clear way to:
1. Know which items were successfully uploaded vs which failed
2. Re-upload the remaining 6,500 items without creating duplicates
3. Easily "retry failed items only" from a previous import

## Current State

The system already has some building blocks:
- `FailedItem[]` tracking with row index, SKU, name, and error reason
- "Download Failed Items CSV" button in `UploadProgressIndicator`
- Duplicate SKU detection during import (existing items are updated, not inserted)

**What's Missing:**
- No pre-import analysis showing "X items already exist"
- No option to "Skip existing" or "Update existing"
- No way to easily re-import only the failed items

---

## Solution

### 1. Pre-Import Analysis Phase

Before starting the upload, scan the database to identify:
- Items that **already exist** (matched by SKU)
- Items that are **new** (no matching SKU)
- Items with **missing/auto-generate SKU** (will always be treated as new)

Display this in a summary:

```text
+--------------------------------------------------+
| Import Analysis                                   |
+--------------------------------------------------+
| 📊 Total items in file:        7,000             |
| ✅ New items (will be added):  6,200             |
| 🔄 Existing items (by SKU):      800             |
| ⚠️ Without SKU (auto-generate):  150             |
+--------------------------------------------------+
| How should we handle existing items?             |
| ○ Skip existing (faster, adds only new items)    |
| ● Update existing (merge with current data)      |
+--------------------------------------------------+
```

### 2. Enhanced Import Options

Add a new option before import starts:

| Option | Behavior |
|--------|----------|
| **Skip existing** | Only insert new items, completely skip rows where SKU already exists in inventory |
| **Update existing** | Current behavior - update existing items with new data from the file |

### 3. "Retry Failed Only" Feature

After an import with failures, provide a button to:
1. Download a **corrected CSV template** pre-filled with failed items
2. Or a "Retry failed items" action that re-queues just the failed rows

---

## Technical Changes

### File 1: `src/contexts/UploadContext.tsx`

Add analysis function and skip-existing mode:

```typescript
interface UploadOptions {
  tenantId: string;
  targetBranchId?: string;
  onSuccess?: () => void;
  skipExisting?: boolean;  // NEW: Skip items that already exist
}

// NEW: Pre-import analysis function
async analyzeImport(rows: InventoryRow[], tenantId: string): Promise<ImportAnalysis> {
  const skuList = rows.filter(r => r.sku).map(r => r.sku);
  
  const { data: existingItems } = await supabase
    .from('inventory')
    .select('sku')
    .in('sku', skuList)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false);
  
  const existingSkus = new Set(existingItems?.map(i => i.sku) || []);
  
  return {
    total: rows.length,
    newItems: rows.filter(r => r.sku && !existingSkus.has(r.sku)).length,
    existingItems: rows.filter(r => r.sku && existingSkus.has(r.sku)).length,
    autoGenerate: rows.filter(r => !r.sku).length,
    existingSkus: Array.from(existingSkus),
  };
}
```

Modify `startInventoryUpload` to respect `skipExisting`:

```typescript
// If skipExisting is true, filter out items that already exist
const toInsert = skipExisting
  ? rows.filter(r => !r.sku || !existingSkuMap.has(r.sku))
  : rows.filter(r => !r.sku || !existingSkuMap.has(r.sku));

const toUpdate = skipExisting
  ? []  // Skip all updates when skipExisting is true
  : rows.filter(r => r.sku && existingSkuMap.has(r.sku));
```

### File 2: `src/components/dashboard/InventoryImportModal.tsx`

Add analysis step UI between mapping and import:

1. After preview step, add an "Analyze" phase
2. Show the breakdown of new vs existing items
3. Add radio buttons for skip/update mode
4. Only then show the "Import" button

```typescript
// New state
const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
const [existingItemMode, setExistingItemMode] = useState<'skip' | 'update'>('update');
const [isAnalyzing, setIsAnalyzing] = useState(false);

// Analysis UI component
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
  <h4 className="font-medium text-blue-900">📊 Import Analysis</h4>
  <div className="grid grid-cols-2 gap-2 text-sm">
    <span>New items:</span>
    <span className="font-medium text-green-700">{analysis.newItems}</span>
    <span>Already in inventory:</span>
    <span className="font-medium text-amber-700">{analysis.existingItems}</span>
    <span>Auto-generate SKU:</span>
    <span className="font-medium text-blue-700">{analysis.autoGenerate}</span>
  </div>
  
  {analysis.existingItems > 0 && (
    <div className="pt-2 border-t border-blue-200">
      <Label className="text-sm">How to handle existing items?</Label>
      <RadioGroup value={existingItemMode} onValueChange={setExistingItemMode}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="skip" id="skip" />
          <Label htmlFor="skip">Skip existing (only add new)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="update" id="update" />
          <Label htmlFor="update">Update existing with file data</Label>
        </div>
      </RadioGroup>
    </div>
  )}
</div>
```

### File 3: `src/components/dashboard/UploadProgressIndicator.tsx`

Add "Download Ready-to-Retry CSV" button that exports failed items in the correct import format:

```typescript
function downloadRetryCSV(job: UploadJob) {
  if (!job.failedItems?.length) return;
  
  const csv = [
    'sku,name,current_stock,unit_price,cost_price,reorder_level,category,description',
    ...job.failedItems.map(item => 
      `${item.sku},"${item.name}",0,0,0,10,,`
    )
  ].join('\n');
  
  // Download as retry-import-{timestamp}.csv
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/UploadContext.tsx` | Add `analyzeImport()`, add `skipExisting` option |
| `src/components/dashboard/InventoryImportModal.tsx` | Add analysis UI, radio buttons for skip/update |
| `src/components/dashboard/UploadProgressIndicator.tsx` | Add "Download Retry CSV" button |

---

## User Flow (After Implementation)

### Scenario: Partial Upload Resume

1. **Day 1**: User uploads 7,000 items → 500 succeed, 6,500 fail
2. User downloads "Failed Items CSV" with 6,500 rows
3. User fixes data issues in the CSV

4. **Day 2**: User re-uploads the corrected 6,500-item file
5. System shows analysis:
   ```
   New items: 6,200
   Already in inventory: 300 (from yesterday's successful 500)
   ```
6. User selects "Skip existing" → Only 6,200 new items are imported
7. No duplicates, no unnecessary updates

### Scenario: Quick Retry

1. After import with 100 failures, user clicks "Download Retry CSV"
2. Gets a clean CSV with just the 100 failed items
3. Fixes errors, re-imports
4. System shows "100 new items" (no conflicts)

---

## Expected Outcome

1. **Pre-import visibility**: Users know exactly what will be added vs updated before clicking Import
2. **Duplicate prevention**: "Skip existing" mode prevents re-processing already-imported items
3. **Easy retry flow**: One-click download of failed items in import-ready format
4. **No data loss**: Users never lose track of what succeeded or failed
