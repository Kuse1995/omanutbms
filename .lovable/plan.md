

# Fix Profile Flickering and User Management Issues

## Problem Analysis

Two distinct issues were identified:

### 1. Profile Settings Flickering
The `Profile` interface in `useAuth.tsx` (line 16-23) is missing the `phone` field that exists in the database. This causes:
- `UserProfileSettings` to use `(profile as any)?.phone` -- a type cast workaround
- The `refreshProfile()` function returns a new object reference every time, triggering the `useEffect([profile])` in `UserProfileSettings`, which resets all form fields
- This creates a visible flicker as fields blank out then refill

### 2. User Management (Authorized Emails)
The `AuthorizedEmailsManager` has a console.log on every render (line 65) and the role update now uses the `sync_user_role_by_email` RPC. The main issue is that `fetchEmails` depends on `tenantId` which may be null during initial load, causing the component to show "Loading..." indefinitely or fail silently.

## Fixes

### Fix 1: Update `Profile` interface in `useAuth.tsx`
Add the missing `phone` field to the `Profile` interface so the type system is correct and no `as any` casts are needed.

```text
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  title: string | null;     // already exists but ensure it's here
  phone: string | null;     // ADD THIS - exists in DB but missing from interface
  last_login: string | null; // ADD THIS - exists in DB
}
```

### Fix 2: Stabilize `UserProfileSettings` to prevent flickering
The `useEffect([profile])` fires every time the profile object reference changes, resetting form state and causing flicker. Fix this by:
- Adding a `hasInitialized` ref to only sync from profile on first load (not on every profile change)
- Remove `(profile as any)?.phone` casts now that the type includes `phone`
- Prevent `refreshProfile` from triggering form resets after saves (since the local state is already correct)

```text
// Use a ref to track if we've done the initial sync
const hasInitialized = useRef(false);

useEffect(() => {
  if (profile && !hasInitialized.current) {
    setFullName(profile.full_name || "");
    setTitle(profile.title || "");
    setDepartment(profile.department || "");
    setPhone(profile.phone || "");
    setAvatarUrl(profile.avatar_url || "");
    hasInitialized.current = true;
  }
}, [profile]);
```

### Fix 3: Remove noisy console.log in AuthorizedEmailsManager
Line 65 logs auth state on every render, which adds noise. Remove it.

### Fix 4: Clean up type casts in UserProfileSettings
Replace all `(profile as any)?.phone` with `profile?.phone` and remove `as any` from the upsert calls since `phone` is now in the type.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `phone`, `last_login` to `Profile` interface (lines 16-23) |
| `src/components/dashboard/UserProfileSettings.tsx` | Add `hasInitialized` ref to prevent re-sync flicker; remove `as any` casts |
| `src/components/dashboard/AuthorizedEmailsManager.tsx` | Remove debug console.log on line 65 |

## Impact
- Profile tab will load once without flickering
- Form fields will populate on first load and stay stable
- Saves will update local state + DB without triggering a form reset loop
- User management will continue working as before but without debug noise

