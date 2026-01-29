
# Fix Sidebar Features & Add Welcome Video

## Issues Identified

### Issue 1: Sidebar Features Not Showing
**Root Cause**: The feature resolution has two layers of checks:
1. **Billing Plan Check** (`useBilling.isFeatureAllowed`) - Starter plan has `payroll: false`, `agents: false`, `impact: false`, `website: false`
2. **Database Check** (`getFeatureConfig`) - User's database shows `payroll_enabled: true`, etc.

Both must be `true` for a feature to show. Even though the database has features enabled, the Starter plan's billing config blocks them.

**The Fix**: During trial period, users should get full feature access to experience the platform. The billing plan restrictions should only apply after the trial ends or when actively subscribed.

### Issue 2: Welcome Video for New Users
**Request**: Embed YouTube video `https://youtu.be/AAQ6RWDECrs` when a new user logs in.

---

## Implementation Plan

### Part 1: Enable Full Features During Trial

**File: `src/hooks/useBilling.ts`**

Update the `isFeatureAllowed` function to grant full feature access during trial period:

```
Current logic:
- Check if billing status is active/trial
- Check if plan includes the feature

New logic:
- If billing status is "trial", grant ALL features (full platform experience)
- If billing status is "active", check plan-specific features
- If billing status is inactive/suspended, deny all features
```

This ensures trial users can explore the full platform before deciding which plan to purchase.

### Part 2: Welcome Video Modal for New Users

**New Component: `src/components/dashboard/WelcomeVideoModal.tsx`**

Create a modal that:
- Shows YouTube video embedded in an iframe
- Displays on first login (check localStorage or profile flag)
- Has a "Get Started" button to dismiss
- Stores dismissal state to prevent showing again
- Uses responsive sizing for mobile/desktop

**File: `src/pages/Dashboard.tsx`**

- Import and render the WelcomeVideoModal
- Control visibility based on first-time user detection
- Integrate with existing onboarding tour (show video first, then tour)

**File: `src/hooks/useOnboardingTour.ts`**

- Add state for welcome video completion
- Sequence: Welcome Video → Onboarding Tour → Dashboard

---

## Technical Details

### Trial Feature Access Logic

```text
useBilling.ts changes:

function isFeatureAllowed(featureKey):
  if (status === "inactive" || status === "suspended"):
    return false
  
  if (status === "trial"):
    return true  // Full access during trial
  
  if (status === "active"):
    return planConfig.features[featureKey]  // Plan-specific
```

### Welcome Video Modal Structure

```text
WelcomeVideoModal.tsx:
- Dialog component with YouTube embed
- Title: "Welcome to Omanut BMS!"
- Description: "Watch this quick introduction to get started"
- YouTube iframe: https://www.youtube.com/embed/AAQ6RWDECrs
- Button: "Start Exploring" to dismiss
- Checkbox: "Don't show this again" (optional)
```

### New User Detection

```text
Detection logic (localStorage + profile):
1. Check localStorage for `welcome_video_seen_{userId}`
2. If not found, check profile created_at timestamp
3. If new user (< 5 minutes old), show modal
4. On dismiss, set localStorage flag
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useBilling.ts` | Grant full features during trial |
| `src/components/dashboard/WelcomeVideoModal.tsx` | **New** - YouTube welcome modal |
| `src/pages/Dashboard.tsx` | Render welcome modal for new users |
| `src/hooks/useOnboardingTour.ts` | Add welcome video state tracking |

---

## Expected Results

After implementation:
1. **Trial users** will see ALL sidebar features (Inventory, HR, Agents, etc.)
2. **New users** will see a welcome video modal on first login
3. After watching/dismissing the video, the onboarding tour begins
4. Video won't show again for returning users
5. When trial expires, features will be restricted based on their chosen plan
