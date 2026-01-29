

# Auto Parts Shop - Premium Retail Experience

## Overview
Transform the "autoshop" business type from a repair/garage-focused system to a **vehicle parts retail shop** with repair services as a secondary offering. This repositions the business for parts stores, motor spares dealers, and accessories shops where selling parts is the primary revenue driver.

## Key Transformation

| Current Focus | New Focus |
|--------------|-----------|
| Repair garage (services first) | Parts retail store (products first) |
| "Job Card" terminology | "Sale" terminology |
| Parts as secondary to repairs | Parts as primary inventory |
| Mechanic-focused workflow | Counter sales workflow |

---

## Implementation Plan

### Phase 1: Terminology & Branding Updates

**New Premium Terminology:**

| Current | New |
|---------|-----|
| Auto Shop / Garage | Auto Parts Store |
| Job Card | Sale |
| Job Cards | Sales |
| Part | Auto Part |
| Parts | Auto Parts |
| Parts & Services | Parts & Spares |
| Customer | Customer |
| Jobs Revenue | Sales Revenue |
| Jobs In Progress | (removed - not applicable) |

**Files to modify:**
- `src/lib/business-type-config.ts` - Full autoshop config overhaul
- `src/lib/terminology-config.ts` - Updated terminology map

### Phase 2: Expanded Inventory Categories

Premium parts categories for a professional auto spares shop:

```text
Categories:
- engine_parts: Engine Parts
- filters: Filters & Fluids  
- brakes: Brakes & Suspension
- electrical: Electrical & Batteries
- tyres: Tyres & Wheels
- body_parts: Body Parts
- lighting: Lighting & Bulbs
- accessories: Accessories
- lubricants: Oils & Lubricants
- cooling: Cooling System
- transmission: Transmission Parts
- service_labor: Service & Labor (secondary)
```

### Phase 3: Enhanced Form Fields

**Product Form Enhancements:**

```text
SKU Placeholder: "e.g., BRK-TOY-2015"
Name Placeholder: "e.g., Front Brake Pads - Toyota Corolla 2015-2020"
Highlight Placeholder: "e.g., OEM Quality / Genuine Part"
Description Placeholder: "Part specifications, vehicle compatibility, warranty..."

Default Specs:
- Vehicle Compatibility (e.g., "Toyota Corolla 2015-2020")
- Part Number / OEM Reference
- Brand / Manufacturer
- Warranty Period

Certifications (Quality Marks):
- OEM Equivalent
- Genuine Part
- Aftermarket Quality
- 6 Month Warranty
- 12 Month Warranty
- Universal Fit
```

### Phase 4: Dashboard Layout Redesign

**New Quick Actions (Parts-First):**
1. **New Sale** (Primary) - Quick counter sale
2. **Parts Lookup** - Search inventory by vehicle/part
3. **Restock Alert** - View low stock items
4. **Record Payment** - Collect pending payments

**New KPI Cards:**
1. **Today's Sales** - Daily sales revenue
2. **Parts in Stock** - Total inventory value
3. **Low Stock Alerts** - Parts below reorder level
4. **Pending Payments** - Outstanding invoices

**Updated Welcome Message:**
"Manage your auto parts inventory, sales, and customer orders"

**Dashboard Icon:** `Car` (represents automotive focus)

### Phase 5: Demo Data Enhancement

Expanded realistic inventory for Zambian auto parts market:

```text
ENGINE & FILTERS:
- Engine Oil 5W-30 (5L) - K320
- Engine Oil 10W-40 (5L) - K280
- Oil Filter - Universal - K85
- Air Filter - Toyota - K180
- Fuel Filter - Universal - K120
- Spark Plugs (set of 4) - K350

BRAKES & SUSPENSION:
- Brake Pads Front - Universal - K450
- Brake Pads Rear - K380
- Brake Discs Front (pair) - K850
- Shock Absorbers Front - K650
- Ball Joint - K280

ELECTRICAL:
- Car Battery 12V 60Ah - K1,400
- Alternator - Universal - K1,800
- Starter Motor - K2,200
- Headlight Bulb H4 - K85
- Fuse Box Kit - K150

TYRES & WHEELS:
- Tyre 195/65R15 - K850
- Tyre 205/55R16 - K950
- Wheel Bearing Kit - K320
- Tyre Valve (set of 4) - K45

COOLING SYSTEM:
- Radiator Coolant (5L) - K180
- Water Pump - K650
- Thermostat - K280
- Radiator Hose Set - K220

ACCESSORIES:
- Wiper Blades (pair) - K150
- Car Mat Set - K250
- Phone Holder - K80
- Air Freshener (3-pack) - K45

SERVICE LABOR (Secondary):
- Oil Change Service - K350
- Brake Inspection - K200
- Battery Installation - K100
- Tyre Fitting (per tyre) - K50
```

---

## Technical Implementation

### Files to Create
None - all changes to existing files

### Files to Modify

1. **`src/lib/business-type-config.ts`**
   - Complete overhaul of autoshop section (lines 944-1027)
   - New label: "Auto Parts Store"
   - New description: "Sell vehicle parts and offer repair services"
   - Terminology: Sale-focused instead of Job Card
   - Categories: 12 automotive-specific categories
   - KPIs: Sales-focused metrics
   - Quick actions: Counter sales workflow

2. **`src/lib/terminology-config.ts`**
   - Update autoshop terminology map (lines 256-278)
   - Change "Job Card" to "Sale"
   - Change "Parts" to "Auto Parts"

3. **`src/lib/demo-data-seeder.ts`**
   - Expand autoshop inventory template (lines 97-106)
   - Add 25+ realistic auto parts products
   - Include both parts (physical stock) and services (labor)

---

## Expected User Experience

### For Counter Staff
- Quick "New Sale" button for walk-in customers
- Fast product lookup by name, SKU, or category
- Clear stock levels visible during sales
- Easy receipt generation

### For Stock Managers
- Low stock alerts prominently displayed
- Reorder level tracking per part
- Cost price and margin visibility
- Supplier compatibility notes in descriptions

### For Business Owners
- Sales-focused dashboard KPIs
- Inventory value tracking
- Pending payment visibility
- Professional auto parts branding

---

## Summary of Changes

| Area | Change |
|------|--------|
| Business Label | "Auto Shop / Garage" → "Auto Parts Store" |
| Primary Action | "New Job Card" → "New Sale" |
| Transaction Name | "Job Card" → "Sale" |
| Product Term | "Part" → "Auto Part" |
| Inventory Label | "Parts & Services" → "Parts & Spares" |
| Categories | 6 → 12 automotive categories |
| Demo Products | 8 → 25+ realistic parts |
| Dashboard Icon | Wrench → Car |
| KPI Focus | Jobs → Sales |

