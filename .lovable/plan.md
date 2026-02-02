

# Plan: Job Cards Sidebar Placement + Owner-Only Business Type Selection

## Problem Summary

Two issues need to be addressed:

1. **Job Cards not visible in sidebar** - The Job Cards tab exists but is not categorized in any menu group, making it invisible in the collapsible sidebar navigation
2. **Business Type wizard shows for all users** - Currently any user logging into a tenant without a business type sees the wizard. It should ONLY show to the tenant owner/creator

---

## Solution Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CHANGES REQUIRED                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  1. Add 'job-cards' to the 'Inventory & Stock' menu category                 │
│  2. Make job-cards visibility conditional on autoshop business type          │
│  3. Update Dashboard.tsx to check tenantUser.is_owner before showing wizard  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Change 1: Add Job Cards to Inventory Category

**File: `src/components/dashboard/DashboardSidebar.tsx`**

Update the `menuCategories` array to include `job-cards` in the `inventory-stock` category:

```typescript
{
  id: 'inventory-stock',
  label: 'Inventory & Stock',
  icon: Package,
  items: ['inventory', 'returns', 'shop', 'warehouse', 'stock-transfers', 'locations', 'job-cards'],
}
```

This will place Job Cards alongside inventory items, where mechanics expect to find service-related features.

### Change 2: Business-Type-Specific Visibility for Job Cards

**File: `src/components/dashboard/DashboardSidebar.tsx`**

Add logic to the `getVisibleMenuItems()` function to only show `job-cards` for the `autoshop` business type:

```typescript
// Only show job-cards for autoshop business type
if (item.id === 'job-cards' && businessType !== 'autoshop') return false;
```

This ensures Job Cards is exclusive to auto shop tenants and hidden for all other business types.

### Change 3: Owner-Only Business Type Selection

**File: `src/pages/Dashboard.tsx`**

Update the condition that renders `BusinessTypeSetupWizard` to also check if the current user is the tenant owner:

**Current Logic:**
```typescript
{!businessProfile?.onboarding_completed && !businessProfile?.business_type && (
  <BusinessTypeSetupWizard onComplete={refetchTenant} />
)}
```

**New Logic:**
```typescript
{!businessProfile?.onboarding_completed && 
 !businessProfile?.business_type && 
 tenantUser?.is_owner === true && (
  <BusinessTypeSetupWizard onComplete={refetchTenant} />
)}
```

This ensures:
- Only the tenant owner (who created the account) sees the business type selection
- Subsequent employees/staff logging into the same tenant will NOT see this wizard
- The wizard appears once for the owner and never again after selection

---

## Technical Notes

### Why `is_owner` Works

The `tenant_users` table has an `is_owner` boolean column that is set to `true` when a user creates a new tenant during signup. This is the exact field we need to distinguish between:
- **Tenant Owner**: The person who signed up and created the tenant (should see wizard)
- **Team Members**: Staff who were invited or added later (should NOT see wizard)

### Why Inventory Category for Job Cards

For auto shops, mechanics need quick access to:
1. Parts inventory (to check stock)
2. Job Cards (to log repair work)

Placing Job Cards in the "Inventory & Stock" collapsible category groups these together logically, matching the workflow where a mechanic:
1. Opens a job card for a vehicle
2. Looks up required parts in inventory
3. Records parts used on the job card

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardSidebar.tsx` | Add `job-cards` to inventory category, add autoshop-only visibility check |
| `src/pages/Dashboard.tsx` | Add `tenantUser?.is_owner` check for wizard display |

---

## Expected Outcome

1. **Auto Shop Users**: Will see "Job Cards" in the "Inventory & Stock" sidebar category alongside Inventory, Returns, and Shop Manager
2. **Non-Auto Shop Users**: Will NOT see Job Cards in their sidebar
3. **Tenant Owners**: Will see the Business Type Selection wizard on first login
4. **Team Members/Staff**: Will NOT see the wizard when they log into an existing tenant - they inherit the business type already set by the owner

