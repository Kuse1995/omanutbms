
# Plan: Job Cards Feature for Auto Shop + Business Type Selection Onboarding

## Overview

This plan addresses two interconnected features:

1. **Job Cards for Auto Shop** - Implement a "Job Cards" (work orders/repair tickets) feature as a secondary service module for the `autoshop` business type
2. **Business Type Selection Onboarding** - Create a first-login wizard that prompts new tenants to select their business type before using the system

---

## Part 1: Job Cards Feature for Auto Shop

### Current State Analysis

The `autoshop` business type is currently configured as an **"Auto Parts Store"** focused on product retail. The existing infrastructure includes:

- **Custom Orders Manager** - A sophisticated work order system for the `fashion` business type that tracks bespoke orders through production stages (pending → cutting → sewing → fitting → ready → delivered)
- **Production Floor** - A Kanban-style board for tracking work in progress
- **Enterprise Feature Flagging** - The `enabled_features` JSONB column in `business_profiles` controls access to specialized features

### Proposed Solution

Adapt the existing **Custom Orders** infrastructure for auto shop by:

1. Creating a new **Job Cards** tab in the sidebar (visible only for `autoshop` business type)
2. Building a **JobCardsManager** component that mirrors `CustomOrdersManager` but with automotive-specific fields
3. Adding automotive-specific status workflow and terminology

### Database Schema: `job_cards` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant reference |
| `job_number` | TEXT | Auto-generated (e.g., "JC2026-0001") |
| `customer_id` | UUID | Reference to customer |
| `vehicle_make` | TEXT | e.g., "Toyota" |
| `vehicle_model` | TEXT | e.g., "Corolla" |
| `vehicle_year` | INTEGER | e.g., 2015 |
| `vehicle_reg` | TEXT | Registration/license plate |
| `vehicle_vin` | TEXT | Optional VIN number |
| `odometer_reading` | INTEGER | Mileage at intake |
| `customer_complaint` | TEXT | Issue description |
| `diagnosis` | TEXT | Technician diagnosis |
| `work_required` | JSONB | Array of labor items |
| `parts_used` | JSONB | Array of parts with inventory links |
| `estimated_labor_hours` | NUMERIC | Labor time estimate |
| `labor_rate` | NUMERIC | Hourly rate |
| `parts_total` | NUMERIC | Total parts cost |
| `labor_total` | NUMERIC | Total labor cost |
| `quoted_total` | NUMERIC | Quoted price to customer |
| `status` | TEXT | received, diagnosing, in_progress, waiting_parts, ready, collected |
| `assigned_technician_id` | UUID | Reference to employee |
| `intake_date` | DATE | When vehicle was received |
| `promised_date` | DATE | Promised completion |
| `completed_date` | DATE | Actual completion |
| `invoice_id` | UUID | Link to invoice when generated |

### Status Workflow

```text
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌───────────────┐   ┌─────────┐   ┌───────────┐
│  Received   │ → │  Diagnosing  │ → │ In Progress │ → │ Waiting Parts │ → │  Ready  │ → │ Collected │
└─────────────┘   └──────────────┘   └─────────────┘   └───────────────┘   └─────────┘   └───────────┘
```

### UI Components to Create

| Component | Description |
|-----------|-------------|
| `JobCardsManager.tsx` | Main list view with filters, search, status cards |
| `JobCardModal.tsx` | Form for creating/editing job cards with vehicle info, work items, parts selection |
| `JobCardViewModal.tsx` | Read-only view with full details and print option |
| `VehicleInfoForm.tsx` | Reusable vehicle details input section |
| `PartsSelector.tsx` | Component to link inventory items to job card |

### Business Type Config Changes

Update `autoshop` configuration in `business-type-config.ts`:

- Add `'job-cards'` to `tabOrder`
- Add quick action for "New Job Card"
- Add KPI card for "Jobs in Progress"
- Update welcome message to mention repair services

### Dashboard Integration

- Add `job-cards` to the `DashboardTab` type
- Add route case in `Dashboard.tsx` → `<JobCardsManager />`
- Add sidebar item in `DashboardSidebar.tsx` for autoshop type

---

## Part 2: Business Type Selection Onboarding

### Current State

- New users sign up → tenant and business profile created with default `business_type: null` or `'retail'`
- Users must manually navigate to tenant settings to change business type
- There is NO prompt to select business type during first login

### Proposed Solution

Create a **Business Type Selection Wizard** that:

1. Displays as a full-screen modal immediately after first login for new tenants
2. Shows all 12 business types with icons and descriptions
3. Persists the selection to `business_profiles.business_type`
4. Only shows once per tenant (uses `localStorage` + database flag)

### UI Flow

```text
User Signs Up
    ↓
Email Verification (if enabled)
    ↓
First Login → Dashboard
    ↓
Business Type Selection Modal (blocks UI)
    ↓
User Selects Type → Save to DB
    ↓
Welcome Video Modal (existing)
    ↓
Onboarding Tour (existing)
    ↓
Normal Dashboard
```

### New Component: `BusinessTypeSetupWizard.tsx`

Features:
- Full-screen modal with backdrop (cannot be dismissed without selection)
- Grid of business type cards with icons (using lucide-react icons already mapped in `DemoModeModal.tsx`)
- "Continue" button enabled after selection
- Progress indicator showing step 1 of setup
- Saves selection to `business_profiles.business_type`
- Sets a flag `onboarding_completed` to prevent re-showing

### Database Changes

Add column to `business_profiles`:
```sql
ALTER TABLE business_profiles 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
```

### Integration Points

1. **Dashboard.tsx**: Check if `businessProfile.onboarding_completed === false && businessProfile.business_type === null`
2. Show `BusinessTypeSetupWizard` before `WelcomeVideoModal`
3. After business type is selected, refetch tenant data so UI adapts immediately

### Business Type Cards Design

| Type | Icon | Description |
|------|------|-------------|
| Retail | Store | Sell products directly to customers |
| Services | Briefcase | Offer professional services to clients |
| Distribution | Truck | Distribute products through agent networks |
| School | GraduationCap | Manage student fees and resources |
| NGO | HandHeart | Manage donations and track beneficiaries |
| Healthcare | Stethoscope | Manage patient consultations |
| Salon | Scissors | Manage salon appointments and beauty services |
| Hospitality | UtensilsCrossed | Hotels, restaurants, and guest services |
| Agriculture | Tractor | Farm management and produce sales |
| Auto Shop | Car | Sell vehicle parts and repair services |
| Fashion | Shirt | Custom clothing and tailoring |
| Hybrid | Layers | Products and services combined |

---

## Implementation Order

### Phase 1: Business Type Selection Onboarding
1. Add `onboarding_completed` column to `business_profiles`
2. Create `BusinessTypeSetupWizard.tsx` component
3. Integrate into `Dashboard.tsx` (show before welcome video)
4. Update `useTenant` to include the new field

### Phase 2: Job Cards Feature
1. Create `job_cards` database table with RLS policies
2. Create `JobCardsManager.tsx` and `JobCardModal.tsx` components
3. Update autoshop business type config
4. Add job-cards tab to Dashboard routing
5. Add sidebar item for autoshop users

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/BusinessTypeSetupWizard.tsx` | Onboarding modal for business type selection |
| `src/components/dashboard/JobCardsManager.tsx` | Main job cards list and management |
| `src/components/dashboard/JobCardModal.tsx` | Create/edit job card form |
| `src/components/dashboard/VehicleInfoForm.tsx` | Reusable vehicle info inputs |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add job-cards route, integrate onboarding wizard |
| `src/components/dashboard/DashboardSidebar.tsx` | Add Job Cards menu item for autoshop |
| `src/lib/business-type-config.ts` | Update autoshop config with job-cards tab and KPIs |
| `src/hooks/useTenant.tsx` | Add `onboarding_completed` to BusinessProfile type |
| Database Migration | Create `job_cards` table, add `onboarding_completed` column |

---

## Expected Outcome

1. **New tenants** will see a business type selection wizard on first login, ensuring the system adapts to their industry from day one
2. **Auto shop users** will have a dedicated Job Cards module for managing vehicle repairs alongside their parts sales
3. The Job Cards feature leverages existing patterns (Custom Orders, Production Floor) for a consistent UX
