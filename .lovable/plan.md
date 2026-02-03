

# Fix Operations Manager Access to Custom Orders

## Problem Identified

When an admin/manager hands off a custom order to an operations manager, **the operations manager cannot see or update the assigned orders** due to restrictive RLS policies at the database level.

### Root Causes

| Layer | Issue |
|-------|-------|
| **Database RLS** | The UPDATE policy on `custom_orders` only allows `admin` and `manager` roles via `is_tenant_admin_or_manager()` |
| **Missing Policy** | No policy allows updates based on assignment (`assigned_operations_user_id = auth.uid()`) |
| **profiles RLS** | Operations managers cannot view other users' profiles (needed for "Assigned by" display) |

### Current State

- `custom_orders` UPDATE policy: `is_tenant_admin_or_manager(tenant_id)` - **excludes operations_manager**
- `can_manage_operations()` helper exists but isn't used for custom_orders
- No assignment-based access control exists

---

## Solution: Assignment-Based Access

The best collaboration pattern is **assignment-based access**:
- Admins/managers can see and manage ALL custom orders
- Operations managers can see and update ONLY orders assigned to them

This follows the principle of least privilege while enabling the handoff workflow.

---

## Implementation Plan

### 1. Database Changes (SQL Migration)

#### A. Create Helper Function for Custom Order Access

```sql
CREATE OR REPLACE FUNCTION public.can_access_custom_order(
  _tenant_id UUID, 
  _assigned_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND (
        -- Admins and managers have full access
        role IN ('admin', 'manager')
        OR 
        -- Operations managers can access orders assigned to them
        (role = 'operations_manager' AND _assigned_user_id = auth.uid())
      )
  )
$$;
```

#### B. Update Custom Orders RLS Policies

Drop and recreate the UPDATE policy to include operations managers:

```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Tenant admins/managers can update custom_orders" 
  ON public.custom_orders;

-- Create new policy with assignment-based access
CREATE POLICY "Authorized users can update custom_orders"
  ON public.custom_orders FOR UPDATE
  USING (
    public.is_tenant_admin_or_manager(tenant_id)
    OR 
    (public.can_manage_operations(tenant_id) AND assigned_operations_user_id = auth.uid())
  );
```

#### C. Add SELECT Policy for Assigned Operations Managers

Currently, operations managers can see all tenant orders (via `user_belongs_to_tenant`), which is fine. But we should ensure the query in `AssignedOrdersSection` works. The existing SELECT policy is:

```sql
"Tenant users can view custom_orders" USING (user_belongs_to_tenant(tenant_id))
```

This is sufficient since operations managers are tenant users.

#### D. Update Profiles RLS for Tenant-Wide Visibility

Allow authenticated tenant members to see profiles of their tenant colleagues:

```sql
-- Allow tenant users to see colleague profiles (needed for "Assigned by" display)
CREATE POLICY "Tenant users can view colleague profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu1
      WHERE tu1.user_id = auth.uid()
        AND tu1.tenant_id IN (
          SELECT tu2.tenant_id FROM public.tenant_users tu2 
          WHERE tu2.user_id = profiles.user_id
        )
    )
  );
```

---

### 2. Technical Summary

| Change | Purpose |
|--------|---------|
| `can_access_custom_order()` function | Reusable helper for assignment-based access |
| Updated UPDATE policy | Allows ops managers to update their assigned orders |
| Profiles visibility policy | Enables "Assigned by {name}" display |

---

## Collaboration Flow (After Fix)

```text
1. Admin creates custom order via Design Wizard
   └─ Enables handoff, selects Operations Manager, saves

2. Order gets status: handoff_status = 'pending_handoff'
   └─ assigned_operations_user_id = [ops manager's user_id]

3. Operations Manager logs in
   └─ Sees "My Assigned Orders" section (AssignedOrdersSection)
   └─ Can "Pick Up" the order → handoff_status = 'in_progress'
   └─ Can continue wizard from the designated step

4. Operations Manager completes their steps
   └─ Hands back → handoff_status = 'handed_back'

5. Admin reviews and finalizes
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Add helper function + update RLS policies |

No frontend changes needed - the UI already handles the workflow correctly. The issue is purely at the database access layer.

---

## Testing Checklist

After implementation:
- [ ] Admin can create order with handoff enabled
- [ ] Admin can select Operations Manager from dropdown
- [ ] Operations Manager can view "My Assigned Orders" section
- [ ] Operations Manager can "Pick Up" an order
- [ ] Operations Manager can continue the wizard and update measurements/pricing
- [ ] Operations Manager can see who assigned the order (profiles access)
- [ ] Admin can see orders with "With Ops" status

---

## Security Considerations

- Operations managers can ONLY update orders explicitly assigned to them
- They cannot update orders assigned to other operations managers
- They cannot delete orders (reserved for admins)
- Full audit trail maintained via existing triggers

