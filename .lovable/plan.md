

# Fix Tenant Branding Leakage on Public Pages

## Problem Identified

When a tenant like "House of Dodo" is logged in, their company name and logo appear on public-facing website pages (like `/contact`) instead of the platform's default "Omanut BMS" branding. This happens because the `Navbar` and `Footer` components use `useBusinessConfig()` which fetches tenant-specific data.

## Root Cause

The `Navbar.tsx` component uses:
```typescript
const { companyName, logoUrl } = useBusinessConfig();
```

This hook returns the logged-in tenant's branding from their `business_profiles` record. When "House of Dodo" is logged in, their name and logo appear on all public pages.

The same issue affects `Footer.tsx`.

## Solution

Update the `Navbar` and `Footer` components to use hardcoded platform branding (from `DEFAULT_BRANDING` in `branding-config.ts`) instead of fetching tenant-specific data. This ensures public pages always show "Omanut BMS" branding regardless of who is logged in.

## Implementation Plan

### Files to Modify

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Remove `useBusinessConfig()`, use hardcoded platform branding |
| `src/components/Footer.tsx` | Remove `useBusinessConfig()`, use hardcoded platform branding |

### 1. Navbar.tsx Changes

Replace the tenant-specific branding with platform defaults:

**Before:**
```typescript
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
// ...
const { companyName, logoUrl } = useBusinessConfig();
```

**After:**
```typescript
// Remove useBusinessConfig import
// Use hardcoded platform branding
const platformName = "Omanut";
const platformLogo = "/omanut-logo.png";
```

The logo will always display `/omanut-logo.png` and the brand name will be "Omanut" (without "BMS" since navigation items provide context).

### 2. Footer.tsx Changes

Replace tenant branding with platform defaults:

**Before:**
```typescript
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
// ...
const { companyName, logoUrl, companyEmail, companyPhone, companyAddress, tagline } = useBusinessConfig();
```

**After:**
```typescript
// Remove useBusinessConfig import
// Use hardcoded platform branding
const platformName = "Omanut";
const platformLogo = "/omanut-logo.png";
const platformTagline = "Authorized distributor of quality water filtration products.";
```

The footer contact details are already hardcoded correctly (WhatsApp, email, phone).

## Technical Notes

- The `SaaSNavbar` (used on the homepage `/`) already uses hardcoded branding and is not affected
- The dashboard components (`DashboardSidebar`, `DashboardHeader`) should continue using tenant branding since those are tenant-specific areas
- The `ContactSection` component already has hardcoded contact info which is correct

## Summary

| Component | Current Behavior | Fixed Behavior |
|-----------|------------------|----------------|
| Navbar | Shows tenant branding (House of Dodo) | Shows platform branding (Omanut) |
| Footer | Shows tenant branding | Shows platform branding |
| Dashboard | Shows tenant branding | No change (correct behavior) |

This fix ensures the public-facing website consistently displays Omanut branding while tenant-specific branding remains in the dashboard area.

