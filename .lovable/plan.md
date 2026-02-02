
# Plan: Track and Display Failed Import Items

## Problem

When an import completes with failures (e.g., "81 item(s) failed"), users have no way to:
- See which specific items failed
- Understand why they failed
- Export or retry just the failed items

## Solution Overview

Add detailed failure tracking to the upload system so users can:
1. Click on "81 item(s) failed" to see a list of failed items
2. See the error reason for each failure
3. Optionally download a CSV of failed items to fix and re-import

---

## Technical Changes

### 1. Update UploadJob Interface

Add a `failedItems` array to track individual failures:

```typescript
export interface FailedItem {
  rowIndex: number;
  sku: string;
  name: string;
  error: string;
}

export interface UploadJob {
  // ... existing fields
  failedItems?: FailedItem[];  // NEW: Track specific failures
}
```

### 2. Capture Failures in UploadContext

When a batch or individual item fails, capture the details:

```typescript
// In the catch block for individual items
} catch (itemError: any) {
  failed++;
  failedItemsList.push({
    rowIndex: originalIndex,
    sku: item.sku || '(no SKU)',
    name: item.name,
    error: itemError?.message || 'Unknown error',
  });
}
```

### 3. Add Failure Details Modal

Create an expandable section in `UploadProgressIndicator` that shows:

```text
+-------------------------------------------------------+
| Upload Progress                    [Clear completed]  |
+-------------------------------------------------------+
| ✓ 1603 inventory items                                |
|   1522 added, 0 updated                               |
|   ⚠ 81 item(s) failed  [View Details ▼]              |
|                                                       |
|   ┌─────────────────────────────────────────────────┐ |
|   │ Failed Items                    [Download CSV]  │ |
|   ├─────────────────────────────────────────────────┤ |
|   │ Row │ SKU        │ Name          │ Error        │ |
|   │ 45  │ PROD-001   │ Brake Pad     │ Duplicate    │ |
|   │ 102 │ (auto)     │ Oil Filter    │ DB constraint│ |
|   │ 156 │ PART-X     │ Wheel Bearing │ Invalid price│ |
|   │ ... + 78 more                                   │ |
|   └─────────────────────────────────────────────────┘ |
+-------------------------------------------------------+
```

### 4. Download Failed Items as CSV

Add a button to export failed items so users can:
- Fix the issues in their spreadsheet
- Re-import only the failed items

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/UploadContext.tsx` | Add `FailedItem` interface, capture failure details in catch blocks, include in job state |
| `src/components/dashboard/UploadProgressIndicator.tsx` | Add expandable failed items section, download CSV button |

---

## Implementation Details

### Failure Capture Logic

```typescript
// Track failures with details
const failedItemsList: FailedItem[] = [];

// When batch fails and we try individually
for (let idx = 0; idx < insertData.length; idx++) {
  const item = insertData[idx];
  const originalRow = batch[idx];
  try {
    const { error } = await supabase.from('inventory').insert(item);
    if (error) throw error;
    added++;
  } catch (itemError: any) {
    failed++;
    failedItemsList.push({
      rowIndex: originalRow.rowNumber || idx,
      sku: item.sku || '',
      name: item.name || '',
      error: itemError?.message?.includes('duplicate') 
        ? 'Duplicate SKU exists' 
        : itemError?.message || 'Database error',
    });
  }
}
```

### CSV Download Function

```typescript
const downloadFailedItems = (job: UploadJob) => {
  if (!job.failedItems?.length) return;
  
  const csv = [
    'Row,SKU,Name,Error',
    ...job.failedItems.map(item => 
      `${item.rowIndex},"${item.sku}","${item.name}","${item.error}"`
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  // ... download logic
};
```

---

## User Experience

1. **During Import**: Progress shows as normal
2. **After Completion**: If failures exist, shows amber warning with count
3. **Click "View Details"**: Expands to show table of failed items
4. **Click "Download CSV"**: Downloads failed items for fixing
5. **Re-import**: User can import the fixed CSV (only the failed items)

---

## Error Message Cleanup

Make error messages user-friendly:

| Database Error | User-Friendly Message |
|----------------|----------------------|
| `duplicate key value violates unique constraint` | "Duplicate SKU already exists" |
| `null value in column "name" violates not-null` | "Product name is required" |
| `invalid input syntax for type numeric` | "Invalid number format" |
| Other errors | Show shortened version of original |
