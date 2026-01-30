

# Fix Inventory CSV Import for All Tenant Admins

## Problem Identified

The CSV/document import feature fails silently at 100% for all users (including tenant admins) because of **Row Level Security (RLS) policy restrictions** and **poor error visibility**.

### Root Cause Analysis

**1. RLS Policy is Too Restrictive**

The current INSERT policy on the `inventory` table:
```sql
is_tenant_admin_or_manager(tenant_id)
```

This function only allows roles `admin` and `manager`:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.tenant_users 
  WHERE user_id = auth.uid() 
    AND tenant_id = _tenant_id 
    AND role IN ('admin', 'manager')
)
```

**2. Error Handling Doesn't Surface the Real Error**

In `InventoryImportModal.tsx`, errors are caught and logged to console, but the user only sees a generic "failed" count without understanding WHY:
```typescript
} catch (error) {
  console.error("Import error for row:", row, error);  // Silent!
  failed++;
}
```

**3. Possible Tenant ID Mismatch**

If `tenantId` from `useTenant()` doesn't match what's expected by the RLS policy (e.g., if the user's session JWT doesn't have the correct tenant context), all inserts will fail.

---

## Solution

### Part 1: Better Error Visibility (Quick Win)

Add proper error logging and user feedback so we can see exactly what's failing:

```typescript
// In handleImport function
} catch (error: any) {
  console.error("Import error for row:", row, error);
  
  // Capture the first error message to show user
  if (failed === 0 && error?.message) {
    firstError = error.message;
  }
  failed++;
}

// After loop, show meaningful error
if (failed > 0 && failed === validRows.length) {
  toast({
    title: "Import Failed",
    description: firstError || "Permission denied. Check your role allows inventory management.",
    variant: "destructive",
  });
}
```

### Part 2: Update RLS Policy for Inventory Operations

Create a new function that properly covers inventory management roles:

```sql
-- Create function for inventory operations
CREATE OR REPLACE FUNCTION public.can_manage_inventory(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'operations_manager', 'sales_rep')
  )
$$;

-- Update INSERT policy
DROP POLICY IF EXISTS "Admins/managers can insert inventory" ON public.inventory;
CREATE POLICY "Inventory management roles can insert"
  ON public.inventory FOR INSERT
  WITH CHECK (can_manage_inventory(tenant_id));
```

### Part 3: Add Debug Logging During Import

Add temporary console logging to capture the exact tenant context:

```typescript
console.log("Import context:", { 
  tenantId, 
  userId: user?.id,
  role: tenantUser?.role 
});
```

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `can_manage_inventory()` function and update RLS policy |
| `src/components/dashboard/InventoryImportModal.tsx` | Improve error handling and add debug logging |

### Database Changes

```sql
-- 1. Create helper function for inventory permissions
CREATE OR REPLACE FUNCTION public.can_manage_inventory(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND role IN ('admin', 'manager', 'operations_manager', 'sales_rep')
  )
$$;

-- 2. Drop old restrictive policy
DROP POLICY IF EXISTS "Admins/managers can insert inventory" ON public.inventory;

-- 3. Create new inclusive policy
CREATE POLICY "Inventory management roles can insert"
  ON public.inventory FOR INSERT
  WITH CHECK (can_manage_inventory(tenant_id));
```

### Code Changes

Update error handling in `InventoryImportModal.tsx`:

```typescript
const handleImport = async () => {
  // ... existing validation ...

  setIsImporting(true);
  setImportProgress(0);

  let added = 0;
  let updated = 0;
  let failed = 0;
  let firstErrorMessage: string | null = null;

  // Debug: log context
  console.log("Import context:", { tenantId, userRole: tenantUser?.role });

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    try {
      // ... existing insert/update logic ...
    } catch (error: any) {
      console.error("Import error for row:", row, error);
      
      // Capture first error for user feedback
      if (!firstErrorMessage && error?.message) {
        firstErrorMessage = error.message;
      }
      failed++;
    }

    setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
  }

  setIsImporting(false);
  setImportResults({ added, updated, failed });

  // Show appropriate toast
  if (failed === validRows.length && firstErrorMessage) {
    toast({
      title: "Import Failed",
      description: firstErrorMessage.includes("row-level security")
        ? "Permission denied. Your role may not allow inventory imports."
        : firstErrorMessage,
      variant: "destructive",
    });
  } else {
    toast({
      title: "Import Complete",
      description: `${added} added, ${updated} updated, ${failed} failed`,
    });
  }

  if (added > 0 || updated > 0) {
    onSuccess();
  }
};
```

---

## Access Matrix After Fix

| Role | Can Import Inventory |
|------|---------------------|
| Admin | Yes |
| Manager | Yes |
| Operations Manager | Yes |
| Sales Rep | Yes |
| HR Manager | No |
| Accountant | No |
| Cashier | No |
| Viewer | No |

---

## Benefits

1. **Fixes the Silent Failure**: Users will see actual error messages instead of generic "failed"
2. **Enables More Roles**: Operations managers and sales reps can now import inventory
3. **Maintains Security**: Tenant isolation is preserved via RLS
4. **Better Debugging**: Console logs help identify issues during development

