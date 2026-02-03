
# Fix New User Onboarding: Mandatory Business Type & Company Name

## Issues Identified

### 1. Business Type Wizard Never Shows
**Root Cause**: The `business_profiles` table has a **default value** of `'retail'` for `business_type`. When the `handle_new_user` trigger creates a new business profile, it doesn't explicitly set `business_type`, so it defaults to `'retail'`.

The Dashboard condition checks:
```typescript
{!businessProfile?.onboarding_completed && 
 !businessProfile?.business_type &&  // <-- Always false because default is 'retail'!
 tenantUser?.is_owner === true && (
  <BusinessTypeSetupWizard />
)}
```

### 2. Company Name Validation Gap
Some users have fallback names like `"Frederick Lusale's Business"` or `"1702914's Organization"`. This happens when:
- Users sign up via **Google OAuth** (bypasses the form validation)
- The trigger falls back to generating a name from `user_full_name`

### 3. Tutorial & Tour Work Correctly
The video and tour are correctly gated behind `onboarding_completed`, which only becomes `true` after the business type wizard completes. However, since the wizard never shows, `onboarding_completed` stays `false`, and ironically the video/tour never show either!

---

## Solution Overview

### Fix 1: Database Schema - Remove Default for business_type
Change the `business_type` column to default to `NULL` instead of `'retail'`. This ensures new signups don't have a business type pre-set, allowing the wizard to show.

### Fix 2: Update handle_new_user Trigger
Ensure the trigger explicitly sets `business_type = NULL` and `onboarding_completed = false` for new signups.

### Fix 3: Update Dashboard Condition
Change the wizard condition to check `onboarding_completed` instead of `business_type`:
```typescript
{!businessProfile?.onboarding_completed && tenantUser?.is_owner === true && (
  <BusinessTypeSetupWizard />
)}
```

### Fix 4: Handle Google OAuth Signups
Create a **mandatory onboarding modal** that appears for OAuth users who are missing company name. This catches users who bypassed the standard form.

---

## Implementation Plan

### 1. Database Migration
```sql
-- Remove the default value for business_type
ALTER TABLE business_profiles 
ALTER COLUMN business_type DROP DEFAULT;

-- Update existing profiles that have retail + onboarding_completed = false
-- to set business_type = NULL so they see the wizard
UPDATE business_profiles 
SET business_type = NULL 
WHERE business_type = 'retail' AND onboarding_completed = false;
```

### 2. Update handle_new_user Trigger
Explicitly set `business_type = NULL` in the INSERT statement to avoid any future defaults:
```sql
INSERT INTO public.business_profiles (
  tenant_id, 
  company_name, 
  business_type,  -- Explicitly set
  onboarding_completed,  -- Explicitly set
  ...
)
VALUES (
  new_tenant_id, 
  COALESCE(company_name_input, user_full_name || '''s Business'),
  NULL,  -- Force null so wizard shows
  false, -- Ensure onboarding is not complete
  ...
);
```

### 3. Update Dashboard.tsx Wizard Condition
Simplify to only check `onboarding_completed`:
```typescript
{/* Business Type Setup Wizard - shows for new tenants (owner only) */}
{!businessProfile?.onboarding_completed && tenantUser?.is_owner === true && (
  <BusinessTypeSetupWizard onComplete={refetchTenant} />
)}
```

### 4. Add Company Name to BusinessTypeSetupWizard
Add a **Step 0** (or combine with Step 1) that asks for company name if it's missing or has a fallback pattern:
- Add input field for company name
- Pre-fill with existing `businessProfile.company_name` if valid
- Validate minimum 2 characters
- Save along with business type selection

### 5. Update BusinessTypeSetupWizard UI
Convert to a 2-step wizard:
1. **Step 1**: Company Name (required)
2. **Step 2**: Business Type Selection (required)

---

## Technical Changes

| File | Changes |
|------|---------|
| **Migration SQL** | Remove `business_type` default, update existing incomplete profiles |
| `src/pages/Dashboard.tsx` | Simplify wizard condition to `!onboarding_completed` |
| `src/components/dashboard/BusinessTypeSetupWizard.tsx` | Add company name input field as mandatory first step |

---

## UI Mockup for Enhanced Wizard

```text
┌─────────────────────────────────────────────────────────────┐
│                    ✨ Welcome! Let's get started            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1 of 2                                                │
│                                                             │
│  What's your company called?                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Dodo Fashion House                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  This name will appear on invoices, quotes, and receipts.  │
│                                                             │
│                                        [Next →]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               ✨ Now, tell us about your business           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 2 of 2                                                │
│                                                             │
│  Select your business type to unlock tailored features:    │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Retail Store │ │ Services     │ │ Distribution │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Fashion      │ │ Healthcare   │ │ Hospitality  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ... (remaining options)                                    │
│                                                             │
│                         [← Back]  [Complete Setup →]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Expected Outcome

After implementation:
1. **All new users** see the Business Type Setup Wizard on first login
2. **Company name is mandatory** - cannot proceed without entering it
3. **Business type is mandatory** - must select before accessing dashboard
4. After completing both, `onboarding_completed = true` is set
5. Welcome Video shows immediately after wizard completion
6. Onboarding Tour starts after video is dismissed
7. Existing users with `onboarding_completed = false` will see the wizard on their next login
