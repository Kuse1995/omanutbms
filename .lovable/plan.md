

# Plan: Fix User Access Issues for Manually Created Accounts

## Problem Summary

Users who were manually given access (like `zalfred81@gmail.com`) are experiencing:
1. Being logged out when they log in
2. Missing modules showing on the sidebar

## Root Cause Analysis

After thorough investigation, I identified **three interconnected issues**:

### 1. Token Refresh Storm (Causing Logouts)
Auth logs show 30+ token refresh requests within 10 seconds, triggering Supabase rate limiting (429 errors). When rate-limited, the session becomes invalid and users are logged out.

**Evidence from logs:**
```text
07:03:06 - 07:03:18: Over 30 token_revoked events
07:03:18: "429: Request rate limit reached" error
```

### 2. Missing user_roles Entries
18 out of 24 users in `tenant_users` are missing entries in `user_roles`. While the app is designed to fall back to `tenant_users.role`, this data inconsistency may cause edge-case failures.

**Affected users include:**
- zalfred81@gmail.com (admin)
- wellnessmushrooms95@gmail.com (admin)
- freezambianman@gmail.com (admin)
- houseofdodozm@gmail.com (admin)
- And 14 others

### 3. Role Resolution Timing
The `useAuth` hook fetches the role from `tenant_users` first, but if this query fails silently during auth state changes (especially during the token refresh storm), the `role` state becomes `null`, causing `hasModuleAccess()` to return `false` for all modules.

---

## Solution Overview

```text
┌────────────────────────────────────────────────────────────────────┐
│                        FIX APPROACH                                │
├────────────────────────────────────────────────────────────────────┤
│  1. Backfill user_roles table for all affected users               │
│  2. Add retry logic to role fetching in useAuth                    │
│  3. Add debouncing to prevent auth state refresh storms            │
│  4. Update ensure_tenant_membership to also sync user_roles        │
└────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Backfill Missing user_roles Entries (Database Migration)

Create a SQL migration to populate `user_roles` for all users who have `tenant_users` entries but are missing `user_roles` entries.

```sql
-- Backfill user_roles from tenant_users for users missing entries
INSERT INTO public.user_roles (user_id, role)
SELECT tu.user_id, tu.role
FROM tenant_users tu
LEFT JOIN user_roles ur ON ur.user_id = tu.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
```

This will immediately fix the data inconsistency for all 18 affected users.

### Step 2: Update ensure_tenant_membership RPC

Modify the database function to also sync `user_roles` when provisioning tenant membership, ensuring this data stays consistent for future users.

**Changes:**
- After inserting into `tenant_users`, also insert into `user_roles`
- Use ON CONFLICT to handle existing entries

### Step 3: Add Retry Logic to useAuth Role Fetching

Modify `src/hooks/useAuth.tsx` to:
- Add exponential backoff retry for the tenant_users role query
- Ensure role is never left as null if it exists in the database
- Add a small delay before initial fetch to allow session to stabilize

### Step 4: Add Debouncing to Auth State Changes

The token refresh storm suggests multiple rapid auth state changes. Add debouncing to prevent rapid-fire queries:
- Debounce `fetchUserData` calls with a 500ms delay
- Cancel pending fetches if a new auth state change occurs

### Step 5: Improve Error Handling

Add better error handling and fallback behavior:
- If all role queries fail, retry once after a short delay
- Log errors to help diagnose future issues

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add retry logic, debouncing, and improved error handling |
| Database (Migration) | Backfill `user_roles` table entries |
| Database (Function) | Update `ensure_tenant_membership` to sync `user_roles` |

---

## Technical Details

### useAuth.tsx Changes

1. **Debounce mechanism**: Use a ref to track pending timeouts and cancel previous fetches
2. **Retry logic**: If tenant_users query returns no data, wait 1s and retry once
3. **Session stabilization**: Add 200ms delay after auth state change before fetching data

### Database Migration

The backfill query ensures:
- All 18 affected users get their `user_roles` entries
- No duplicates are created (ON CONFLICT DO NOTHING)
- Roles match what's already in `tenant_users`

---

## Expected Outcome

After implementation:
1. All existing users will have proper `user_roles` entries matching their `tenant_users` roles
2. Token refresh storms will be mitigated by debouncing
3. Role queries will retry on failure, reducing null role states
4. Sidebar modules will display correctly for all users
5. Future users will have both tables populated correctly

---

## Testing Recommendations

1. Have `zalfred81@gmail.com` log in and verify:
   - They are not logged out
   - Sidebar shows all admin modules
2. Check other affected users from the list
3. Monitor auth logs for any remaining rate limiting issues

