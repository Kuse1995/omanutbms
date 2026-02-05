
# Implement Alteration Orders for Custom Orders

## Overview

This plan adds first-class support for **Alteration Orders** - a streamlined order type for clients who bring in existing garments (either purchased elsewhere or previously made by the shop) that need to be altered. This is distinct from the current "New Custom Design" flow and offers a simplified, faster intake process.

---

## Current State Analysis

### What Already Exists
1. **Adjustments Tracking Panel** - The `AdjustmentsTrackingPanel` component tracks post-fitting alterations for orders already in the system
2. **Adjustments Production Stage** - The Kanban workflow includes an "adjustments" stage between fitting and ready
3. **Alterations Buffer Fee** - The `AdditionalCostsSection` has a preset "Alterations Buffer" fee
4. **AI Labor Estimation** - Already mentions "Simple alterations: 4-8 hours, Junior"

### What's Missing
- No way to create a **standalone alteration order** for walk-in clients bringing existing garments
- The wizard is optimized for new garment creation, not alterations
- No differentiation in pricing, workflow, or UI for alteration-specific needs

---

## Proposed Solution

### 1. Add Order Type Selection (Step 0.5)

Before the current wizard flow, add a choice between:
- **New Custom Design** - Create a garment from scratch (current flow)
- **Alteration Only** - Modify an existing garment

This selection will be stored in a new `order_type` column in `custom_orders`.

### 2. Simplified Alteration Wizard Flow

For alterations, reduce the 7-step wizard to a focused 5-step flow:

| Step | Alteration Flow | Notes |
|------|-----------------|-------|
| 1 | Client Info | Same as current |
| 2 | Garment & Alteration Details | New combined step |
| 3 | Measurements (optional) | Only if needed for the alteration |
| 4 | Photos & Notes | Reference photos of garment |
| 5 | Pricing & Sign | Simplified pricing |

### 3. Alteration-Specific Fields

Add new fields for alteration orders:

| Field | Description |
|-------|-------------|
| `order_type` | "custom" or "alteration" |
| `garment_source` | "shop_made" (we made it) or "external" (brought in) |
| `original_order_id` | Reference to original order if shop-made |
| `alteration_items` | JSON array of specific alterations needed |
| `garment_condition` | "good", "fair", "fragile" |
| `bring_in_date` | Date garment was brought in |

### 4. Alteration Types Presets

Provide common alteration presets for quick selection:

```typescript
const ALTERATION_TYPES = [
  // Sizing
  { id: 'take_in_sides', label: 'Take In Sides', category: 'sizing', defaultHours: 2 },
  { id: 'let_out_sides', label: 'Let Out Sides', category: 'sizing', defaultHours: 2.5 },
  { id: 'shorten_hem', label: 'Shorten Hem', category: 'hem', defaultHours: 1 },
  { id: 'lengthen_hem', label: 'Lengthen Hem', category: 'hem', defaultHours: 2 },
  { id: 'shorten_sleeves', label: 'Shorten Sleeves', category: 'sleeves', defaultHours: 1.5 },
  { id: 'taper_trousers', label: 'Taper Trousers', category: 'sizing', defaultHours: 2 },
  
  // Repairs
  { id: 'replace_zipper', label: 'Replace Zipper', category: 'repair', defaultHours: 1.5 },
  { id: 'repair_seam', label: 'Repair Seam', category: 'repair', defaultHours: 0.5 },
  { id: 'patch_hole', label: 'Patch Hole', category: 'repair', defaultHours: 1 },
  { id: 'replace_lining', label: 'Replace Lining', category: 'repair', defaultHours: 4 },
  { id: 'fix_buttons', label: 'Fix/Replace Buttons', category: 'repair', defaultHours: 0.5 },
  
  // Adjustments
  { id: 'adjust_waist', label: 'Adjust Waistband', category: 'adjust', defaultHours: 2 },
  { id: 'adjust_shoulders', label: 'Adjust Shoulders', category: 'adjust', defaultHours: 3 },
  { id: 'add_darts', label: 'Add Darts', category: 'adjust', defaultHours: 1.5 },
  
  // Other
  { id: 'custom', label: 'Custom Alteration', category: 'other', defaultHours: 0 },
];
```

---

## Database Changes

### Migration SQL

```sql
-- Add order_type to distinguish custom vs alteration orders
ALTER TABLE custom_orders 
ADD COLUMN order_type text DEFAULT 'custom' CHECK (order_type IN ('custom', 'alteration'));

-- Add alteration-specific fields
ALTER TABLE custom_orders
ADD COLUMN garment_source text CHECK (garment_source IN ('shop_made', 'external')),
ADD COLUMN original_order_id uuid REFERENCES custom_orders(id),
ADD COLUMN alteration_items jsonb DEFAULT '[]',
ADD COLUMN garment_condition text CHECK (garment_condition IN ('good', 'fair', 'fragile')),
ADD COLUMN bring_in_date date;

-- Index for querying alterations
CREATE INDEX idx_custom_orders_order_type ON custom_orders(tenant_id, order_type);
```

---

## UI Changes

### 1. Order Type Selector Component

Create a new step that appears before the current wizard:

```text
┌─────────────────────────────────────────────────────────────┐
│                    What type of order is this?              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────┐  ┌───────────────────────┐     │
│   │   ✂️ NEW CUSTOM       │  │   🔧 ALTERATION       │     │
│   │      DESIGN           │  │      ONLY             │     │
│   │                       │  │                       │     │
│   │ Create a garment from │  │ Modify an existing    │     │
│   │ scratch with custom   │  │ garment - sizing,     │     │
│   │ measurements, fabric, │  │ repairs, adjustments  │     │
│   │ and design            │  │                       │     │
│   │                       │  │                       │     │
│   └───────────────────────┘  └───────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Alteration Details Step

For alteration orders, Step 2 becomes:

```text
┌─────────────────────────────────────────────────────────────┐
│              Garment & Alteration Details                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Garment Type: [Select: Dress / Suit / Trousers / ...]     │
│                                                             │
│  Garment Source:                                            │
│  ○ We made this garment (link to original order)           │
│  ● Client brought it in                                     │
│                                                             │
│  Garment Condition: [Good ▼]                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Alterations Needed:          [+ Add Custom Alteration]     │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☑ Shorten Hem                    Est: 1 hr    K 75     ││
│  │ ☑ Take In Sides                  Est: 2 hrs   K 150    ││
│  │ ☑ Replace Zipper                 Est: 1.5 hrs K 112    ││
│  │ ☐ Shorten Sleeves                                       ││
│  │ ☐ Taper Trousers                                        ││
│  │ ☐ Adjust Waistband                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Custom Notes:                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Client wants subtle adjustment, not too tight...        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                              Estimated Total: K 337.00      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Custom Orders Manager Updates

Add filter for order type and visual indicator:

```text
┌─────────────────────────────────────────────────────────────┐
│  Custom Orders                                              │
│                                                             │
│  [+ New Custom Order ▼]                                     │
│    ├─ New Custom Design                                     │
│    └─ New Alteration Order                                  │
│                                                             │
│  Filter: [All Types ▼] [All Statuses ▼]  🔍 Search...      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ CO2026-0042        🔧 Alteration    Draft    K 337     ││
│  │ Jane Smith • Dress • Shorten Hem, Take In Sides        ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ CO2026-0041        ✂️ Custom        Sewing    K 4,500   ││
│  │ John Doe • Wedding Suit • 3 Piece                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/CustomDesignWizard.tsx` | Add order type selection, conditional step rendering, alteration-specific UI |
| `src/components/dashboard/CustomOrdersManager.tsx` | Add order type filter, visual badges, split "New Order" button |
| `src/lib/alteration-types.ts` (new) | Alteration presets and pricing logic |
| `src/components/dashboard/AlterationDetailsStep.tsx` (new) | Dedicated alteration step component |
| Database migration | Add new columns |

### New AlterationDetailsStep Component

```typescript
interface AlterationItem {
  id: string;
  type: string;
  label: string;
  estimatedHours: number;
  price: number;
  notes?: string;
}

interface AlterationDetailsStepProps {
  selectedAlterations: AlterationItem[];
  onAlterationsChange: (items: AlterationItem[]) => void;
  garmentType: string;
  onGarmentTypeChange: (type: string) => void;
  garmentSource: 'shop_made' | 'external';
  onGarmentSourceChange: (source: 'shop_made' | 'external') => void;
  garmentCondition: string;
  onGarmentConditionChange: (condition: string) => void;
  originalOrderId?: string;
  onOriginalOrderChange: (orderId: string | null) => void;
  customNotes: string;
  onNotesChange: (notes: string) => void;
  hourlyRate: number;
}
```

### Wizard Step Logic

```typescript
// Dynamic step configuration based on order type
const getWizardSteps = (orderType: 'custom' | 'alteration') => {
  if (orderType === 'alteration') {
    return [
      { id: 'client', label: 'Client Info', icon: User },
      { id: 'alteration', label: 'Alteration Details', icon: Scissors },
      { id: 'measurements', label: 'Measurements', icon: Ruler, optional: true },
      { id: 'photos', label: 'Photos & Notes', icon: Camera },
      { id: 'review', label: 'Review & Sign', icon: FileText },
    ];
  }
  return WIZARD_STEPS; // Current 7-step flow
};
```

---

## Workflow Integration

### Production Stages for Alterations

Alteration orders use a simplified workflow:

| Stage | Description |
|-------|-------------|
| `draft` | Order created, awaiting confirmation |
| `confirmed` | Customer approved, work can begin |
| `in_progress` | Alteration work underway |
| `fitting` | Ready for customer fitting |
| `adjustments` | Post-fitting tweaks (if needed) |
| `ready` | Complete and ready for pickup |
| `delivered` | Collected by customer |

### AI Labor Estimation Update

Update the `estimate-design-labor` edge function to recognize alteration orders and provide appropriate estimates based on selected alteration types.

---

## Benefits

1. **Faster Intake** - Alterations skip irrelevant steps (new design, materials)
2. **Accurate Pricing** - Preset labor estimates for common alterations
3. **Better Tracking** - Distinguish revenue from custom vs alteration work
4. **Shop-Made Link** - Connect alterations back to original orders
5. **Reporting** - Filter and analyze alteration volume separately

---

## Future Enhancements

- **Alteration Packages** - Bundle common alterations at discount
- **Repeat Alteration Discount** - Loyalty pricing for returning clients
- **Photo Comparison** - Before/after documentation
- **Quick Alteration Mode** - Ultra-fast intake for simple jobs
