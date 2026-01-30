
# Fix Settings & User Management Module Issues

## Issues Identified

### Issue 1: Profile Settings Button Not Working
**Location**: `DashboardHeader.tsx` lines 125-128

The "Profile Settings" dropdown menu item has no `onClick` handler - it's just a static menu item that doesn't navigate anywhere.

```typescript
// Current (broken)
<DropdownMenuItem className="hover:bg-muted cursor-pointer">
  <User className="w-4 h-4 mr-2" />
  Profile Settings
</DropdownMenuItem>
```

**Fix**: Add an `onClick` handler to navigate to the Settings tab with the profile sub-tab selected.

---

### Issue 2: Role Changes Not Persisting to Database
**Location**: `AuthorizedEmailsManager.tsx` lines 205-227

The `handleUpdateRole` function only updates the `authorized_emails` table:
```typescript
const { error } = await supabase
  .from("authorized_emails")
  .update({ default_role: newRole })
  .eq("id", id);
```

However, roles are **read from multiple tables** in `useAuth.tsx`:
1. `tenant_users.role` (primary)
2. `user_roles.role` (fallback)
3. `authorized_emails.default_role` (fallback)

**Problem**: When a user has already logged in, their role is stored in `tenant_users`. Updating `authorized_emails.default_role` doesn't sync to `tenant_users`, so the change appears to not persist.

**Fix**: Update the `handleUpdateRole` function to:
1. Find the user by email in `auth.users`
2. Update their role in `tenant_users` table (if they already have a membership)
3. Optionally update `user_roles` for backwards compatibility

---

### Issue 3: WhatsApp Number Not Linked from Profile
**Location**: `UserProfileSettings.tsx` and `EmployeeAccessSection.tsx`

The `profiles` table does NOT have a `phone` or `whatsapp_number` column - it only stores:
- `full_name`, `avatar_url`, `department`, `title`, `last_login`

The employee's WhatsApp number is stored in:
- `employees.phone` (personal info)
- `whatsapp_user_mappings.whatsapp_number` (for WhatsApp bot integration)

**Current Gap**: There's no phone/WhatsApp field in `UserProfileSettings.tsx` that can link to an employee record.

**Fix**:
1. Add a `phone` field to the `profiles` table
2. Add a phone input to `UserProfileSettings.tsx`
3. Create logic to sync profile phone with `whatsapp_user_mappings` when the user is linked to an employee

---

### Issue 4: Branch-Based View-Only Inventory Permissions
**Current State**: The `branch_inventory` and `inventory` tables use tenant-scoped RLS policies. However, branch-restricted users can currently see AND edit inventory from all branches if they have the right role.

**Required Behavior**:
- Users assigned to a specific branch should have **full access** to their branch's inventory
- They should have **view-only access** to other branches' inventory

**Fix**: Create new RLS policies that:
1. Allow `SELECT` on all inventory within the tenant
2. Allow `INSERT/UPDATE/DELETE` only on inventory where `branch_id` matches the user's assigned branch OR user has `can_access_all_branches = true`

---

## Technical Implementation

### Part 1: Fix Profile Settings Navigation

**File**: `src/components/dashboard/DashboardHeader.tsx`

Add navigation handler to Profile Settings menu item that redirects to `/bms?tab=settings` (which defaults to the "profile" sub-tab).

### Part 2: Fix Role Update Synchronization

**File**: `src/components/dashboard/AuthorizedEmailsManager.tsx`

Update `handleUpdateRole` to also sync roles to `tenant_users`:
```typescript
const handleUpdateRole = async (id: string, newRole: AppRole) => {
  // 1. Update authorized_emails (for future logins)
  await supabase.from("authorized_emails")
    .update({ default_role: newRole })
    .eq("id", id);
  
  // 2. Find the email address
  const email = emails.find(e => e.id === id)?.email;
  
  // 3. Find user by email and update tenant_users (for current session)
  const { data: authUser } = await supabase
    .from("tenant_users")
    .select("user_id, tenant_id")
    .eq("tenant_id", tenantId)
    // Need to join with profiles or auth.users to find by email
    
  // 4. Update tenant_users.role
  await supabase.from("tenant_users")
    .update({ role: newRole, branch_id: branchId, can_access_all_branches: ... })
    .eq("user_id", foundUserId)
    .eq("tenant_id", tenantId);
};
```

### Part 3: Add Phone Field to Profile

**Database Migration**:
```sql
ALTER TABLE public.profiles 
ADD COLUMN phone text;
```

**File**: `src/components/dashboard/UserProfileSettings.tsx`

Add phone input field and sync logic.

### Part 4: Branch-Restricted Inventory RLS

**Database Migration**:
```sql
-- Helper function to check if user can edit specific branch inventory
CREATE OR REPLACE FUNCTION public.can_edit_branch_inventory(_tenant_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND (
        can_access_all_branches = true 
        OR branch_id = _branch_id 
        OR _branch_id IS NULL
      )
  )
$$;

-- Update inventory UPDATE/DELETE policies to use branch check
CREATE POLICY "Branch users can only edit own branch inventory"
  ON public.inventory FOR UPDATE
  USING (user_belongs_to_tenant(tenant_id))
  WITH CHECK (can_edit_branch_inventory(tenant_id, branch_id));
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardHeader.tsx` | Add onClick handler to Profile Settings menu item |
| `src/components/dashboard/AuthorizedEmailsManager.tsx` | Sync role changes to `tenant_users` table |
| `src/components/dashboard/UserProfileSettings.tsx` | Add phone field with WhatsApp link logic |
| Database migration | Add `phone` column to profiles, create branch-restricted RLS policies |

---

## Security Considerations

- Role changes require admin privileges (already enforced)
- Branch-based editing restriction follows principle of least privilege
- WhatsApp number linking maintains existing self-service boundaries
- All changes maintain tenant isolation via existing RLS patterns
