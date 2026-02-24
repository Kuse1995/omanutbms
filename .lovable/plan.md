
# Fix Profile Flickering and Maximum Update Depth Error

## Root Cause

The console shows a **"Maximum update depth exceeded"** error originating from `NotificationsCenter`. This error causes the entire dashboard (including the Settings/Profile tab) to enter a re-render loop, producing the flickering you see. The profile form also has a secondary issue where fields render empty before being populated.

## What's Going Wrong

1. **NotificationsCenter infinite loop**: The `fetchNotifications` function is defined inside the component but NOT wrapped in `useCallback`. It gets recreated on every render. The `throttledFetch` useMemo captures a stale reference, and when notifications state updates, it triggers a re-render, which creates a new `fetchNotifications`, which can trigger another fetch cycle -- causing the "Maximum update depth exceeded" error.

2. **Profile form double-render**: The form fields initialize with `useState(profile?.phone || "")` on line 31-35. Since `profile` is `null` on the first render, all fields start empty (`""`). Then the `useEffect` on line 41 fires and sets them again, causing a visible flash from empty to filled.

3. **Auth context cascade**: Every `refreshProfile()` call (after save/upload) creates a new profile object reference. Even with the `JSON.stringify` comparison, the auth state change propagates through `TenantProvider` and `BranchProvider`, causing the whole dashboard to re-render.

## Fixes

### Fix 1: Stabilize NotificationsCenter (stops the infinite loop)
- Wrap `fetchNotifications` in `useCallback` so it has a stable reference
- This prevents the "Maximum update depth exceeded" error that cascades into all other components

### Fix 2: Eliminate profile form flash
- Remove the `useEffect` sync pattern entirely
- Instead, derive initial values directly: don't render the form until `profile` is available
- Use a simple early return with no spinner (just render nothing or the card shell) so there's no loading flash
- Keep the `hasInitialized` ref but use it to set initial state only once via lazy initialization

### Fix 3: Prevent refreshProfile from triggering unnecessary re-renders
- After saving profile data, DON'T call `refreshProfile()` since the local state already has the correct values
- Only call `refreshProfile` for avatar changes where the URL comes from the server

## Technical Details

### File: `src/components/dashboard/NotificationsCenter.tsx`
- Wrap `fetchNotifications` in `useCallback` with proper dependencies
- Update `throttledFetch` useMemo to depend on the stable callback

### File: `src/components/dashboard/UserProfileSettings.tsx`
- Remove the `useEffect` that syncs profile to form state
- Instead, use a guard: if `!profile`, return the Card with a minimal placeholder (no spinner)
- Initialize `useState` values lazily from profile on first meaningful render using a key pattern or conditional rendering
- Remove `await refreshProfile()` from `handleSave` (local state is already correct)
- Keep `refreshProfile` only in avatar upload/remove handlers

### File: `src/hooks/useAuth.tsx`
- Memoize the `refreshProfile` function with `useCallback` to prevent it from being recreated on every render and causing downstream re-renders

## Expected Result
- No more "Maximum update depth exceeded" error
- Profile tab loads instantly without any flicker or loading spinner
- Saving profile doesn't trigger a full dashboard re-render cycle
- The fix is minimal and targeted -- no architectural changes needed
