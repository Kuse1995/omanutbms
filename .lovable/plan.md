
# Fix Signup Database Error

## Problem Identified

The signup is failing with **"there is no unique or exclusion constraint matching the ON CONFLICT specification"** because the `handle_new_user()` trigger uses incorrect conflict columns.

### Root Cause

| Table | Trigger Uses | Actual Unique Constraint |
|-------|--------------|-------------------------|
| `user_roles` | `ON CONFLICT (user_id)` | `(user_id, role)` |
| `tenant_users` | `ON CONFLICT (user_id)` | `(tenant_id, user_id)` |

PostgreSQL requires the `ON CONFLICT` columns to exactly match an existing unique constraint.

---

## Solution

### Option 1: Fix the Trigger (Recommended)

Update `handle_new_user()` to match the actual constraints:

**For `user_roles`:**
```sql
-- OLD (broken)
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, assigned_role)
ON CONFLICT (user_id) DO UPDATE SET role = assigned_role;

-- NEW (fixed)
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, assigned_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

**For `tenant_users` (existing member case):**
```sql
-- OLD (broken)
ON CONFLICT (user_id) DO NOTHING;

-- NEW (fixed)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
```

### Option 2: Add Missing Unique Constraints

Alternative: Add a unique constraint on `user_roles(user_id)` alone. However, Option 1 is cleaner because:
- It matches the intended data model (one user can have multiple roles)
- No schema changes needed

---

## Implementation

### Database Migration

Create a new migration to replace the `handle_new_user()` function with corrected `ON CONFLICT` clauses:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- [same declarations]
BEGIN
  -- [same user_email and metadata extraction]
  
  -- Insert profile (this one is CORRECT - profiles has unique on user_id)
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert role into user_roles (FIXED: use both columns)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Handle tenant assignment
  IF existing_tenant_id IS NOT NULL THEN
    -- Invited member (FIXED: use tenant_id + user_id)
    INSERT INTO public.tenant_users (...)
    VALUES (...)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  ELSE
    -- [NEW SIGNUP logic - no conflict needed, always creates new tenant]
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

## Files to Modify

| Type | File/Action |
|------|-------------|
| Database | Create migration to fix `handle_new_user()` trigger function |

---

## Expected Result

After this fix:
- New user signups will complete successfully
- Tenant and business profile will be auto-provisioned
- User will be redirected to dashboard with all trial features
- Welcome video modal will appear on first login
