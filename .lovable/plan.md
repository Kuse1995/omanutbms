
# Updated Plan: Background Uploads + Batch Processing + Performance

## Problem Summary

1. **Uploads Stop on Tab Change**: Component unmounts, stopping the import
2. **One-by-One Processing**: Currently making 1 DB call per row = thousands of network requests
3. **Performance Issues**: Re-render loops and sluggish navigation

---

## NEW: Batch Processing Strategy

### Current Speed Issue

```text
CURRENT (SLOW):
Row 1 → API call → wait → Row 2 → API call → wait → Row 3 → ...
1000 items = 1000 API calls = ~5-10 minutes

NEW (FAST):
[Row 1-50] → 1 API call → [Row 51-100] → 1 API call → ...
1000 items = 20 API calls = ~10-30 seconds
```

### Batch Processing Implementation

**Strategy:** Split items into two groups:
1. **New items (no matching SKU)** → Bulk insert in batches of 50
2. **Existing items (SKU match)** → Bulk update using upsert

```typescript
// Phase 1: Separate new vs existing items
const skuList = validRows.filter(r => r.sku).map(r => r.sku);
const { data: existingItems } = await supabase
  .from("inventory")
  .select("id, sku")
  .in("sku", skuList)
  .eq("tenant_id", tenantId)
  .eq("is_archived", false);

const existingSkuMap = new Map(existingItems?.map(i => [i.sku, i.id]) || []);

// Phase 2: Categorize rows
const toInsert = validRows.filter(r => !r.sku || !existingSkuMap.has(r.sku));
const toUpdate = validRows.filter(r => r.sku && existingSkuMap.has(r.sku));

// Phase 3: Batch insert (50 at a time)
for (let i = 0; i < toInsert.length; i += 50) {
  const batch = toInsert.slice(i, i + 50).map(row => ({
    tenant_id: tenantId,
    sku: row.sku || generateAutoSku(),
    name: row.name,
    // ... other fields
  }));
  
  await supabase.from("inventory").insert(batch);
  // Update progress
}

// Phase 4: Batch update using upsert
for (let i = 0; i < toUpdate.length; i += 50) {
  const batch = toUpdate.slice(i, i + 50).map(row => ({
    id: existingSkuMap.get(row.sku),
    name: row.name,
    // ... other fields
  }));
  
  await supabase.from("inventory").upsert(batch, { onConflict: 'id' });
}
```

### Speed Comparison

| Items | Current (1-by-1) | New (Batch 50) | Improvement |
|-------|------------------|----------------|-------------|
| 100   | ~20 seconds      | ~1 second      | **20x faster** |
| 500   | ~2 minutes       | ~5 seconds     | **24x faster** |
| 1000  | ~5 minutes       | ~10 seconds    | **30x faster** |
| 5000  | ~25 minutes      | ~50 seconds    | **30x faster** |

---

## Part 1: Background Upload System

### New File: `src/contexts/UploadContext.tsx`

Global context to manage background uploads:

```typescript
interface UploadJob {
  id: string;
  type: 'inventory' | 'employees' | 'customers';
  fileName: string;
  totalItems: number;
  processedItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: { added: number; updated: number; failed: number };
}

interface UploadContextType {
  activeUploads: UploadJob[];
  startUpload: (job: UploadJob, rows: ParsedRow[]) => Promise<void>;
  cancelUpload: (jobId: string) => void;
  hasActiveUploads: boolean;
}
```

**Key Features:**
- Lives at app root - never unmounts during navigation
- Executes batch database operations
- Tracks progress with reactive state
- Shows toast notifications for completion

### Changes to `src/components/dashboard/InventoryImportModal.tsx`

**Major Refactor:**
- Remove individual row processing loop
- Add batch processing logic with phases:
  1. SKU lookup phase (single query)
  2. Categorize into insert vs update batches
  3. Execute batches with progress tracking
- Delegate to UploadContext for background execution

### New File: `src/components/dashboard/UploadProgressIndicator.tsx`

Header indicator showing:
- Active upload count badge
- Progress bar when expanded
- Cancel button

---

## Part 2: Performance Optimizations

### Fix 1: BranchSelector Infinite Loop

**File:** `src/hooks/useBranch.tsx`

Memoize context value:
```typescript
const contextValue = useMemo(() => ({
  branches,
  currentBranch,
  setCurrentBranch,
  // ...
}), [branches, currentBranch, ...deps]);
```

### Fix 2: BranchSelector Component

**File:** `src/components/dashboard/BranchSelector.tsx`

- Wrap with `React.memo`
- Memoize `accessibleBranches` computation

### Fix 3: Context Provider Memoization

**Files:** `BrandingContext.tsx`, `useTenant.tsx`

Apply stable value pattern to prevent re-renders

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/UploadContext.tsx` | **Create** | Global upload management with batch processing |
| `src/components/dashboard/UploadProgressIndicator.tsx` | **Create** | Header progress indicator |
| `src/App.tsx` | **Modify** | Add UploadProvider wrapper |
| `src/components/dashboard/InventoryImportModal.tsx` | **Modify** | Batch processing + context delegation |
| `src/components/dashboard/EmployeeImportModal.tsx` | **Modify** | Same batch pattern for employees |
| `src/components/dashboard/DashboardHeader.tsx` | **Modify** | Add upload indicator |
| `src/hooks/useBranch.tsx` | **Modify** | Memoize context value |
| `src/components/dashboard/BranchSelector.tsx` | **Modify** | React.memo + useMemo |
| `src/contexts/BrandingContext.tsx` | **Modify** | Memoize provider value |
| `src/hooks/useTenant.tsx` | **Modify** | Memoize provider value |

---

## Processing Log Adaptation

With batch processing, the log updates will change:

```text
BEFORE (one-by-one):
Processing: PROD-001... ✓
Processing: PROD-002... ✓
Processing: PROD-003... ✗

AFTER (batch):
Analyzing: Checking existing items...
Batch 1/20: Inserting 50 new items... ✓
Batch 2/20: Inserting 50 new items... ✓
Batch 3/20: Updating 48 existing items... ✓
...
```

---

## Error Handling in Batches

When a batch fails, we can:
1. Log which batch failed
2. Retry individual items from failed batch (fallback to one-by-one)
3. Continue with remaining batches

```typescript
try {
  await supabase.from("inventory").insert(batch);
  added += batch.length;
} catch (batchError) {
  // Fallback: try items individually
  for (const item of batch) {
    try {
      await supabase.from("inventory").insert(item);
      added++;
    } catch {
      failed++;
    }
  }
}
```

---

## Expected Outcomes

1. **30x faster imports** - Batch processing reduces API calls dramatically
2. **Background execution** - Navigate freely while imports run
3. **No re-render loops** - Memoized contexts
4. **Smooth navigation** - Optimized components
5. **Error resilience** - Failed batches fall back to individual processing
