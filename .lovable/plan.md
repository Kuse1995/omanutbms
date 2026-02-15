

# Flexible Pricing Mode for Custom Orders and Alterations

## What This Solves

Currently, House of Dodo's pricing is locked into an hourly-rate model -- every order calculates cost as (hours x rate). This doesn't work for all scenarios:

- Some jobs have a known flat fee (e.g., "a dress hem is always K150")
- Some items are priced per piece or per garment, not by time
- Experienced tailors may want to quote a lump sum without breaking down hours

This plan adds a **Pricing Mode selector** so users can choose how they want to price each order.

## Three Pricing Modes

| Mode | How it works | Best for |
|---|---|---|
| **Hourly** (current default) | Hours x Hourly Rate = Labor Cost | Complex or unpredictable jobs |
| **Fixed Price** | User enters a flat total price directly | Standard/routine jobs with known pricing |
| **Per Item** | Price per alteration/service item, no hourly breakdown | Alterations, simple repairs |

## What Changes

### 1. Custom Design Wizard (Smart Pricing step)

Add a pricing mode toggle at the top of the pricing step (Step 6). Based on the selection:

- **Hourly mode**: Shows the current LaborEstimator + MaterialSelector + PricingBreakdown (no change)
- **Fixed Price mode**: Hides LaborEstimator, shows a single "Total Price" input field + optional material costs + margin
- **Per Item mode**: Shows a list where each line item gets its own price (useful when not using hourly rates)

### 2. Alteration Details Step

Currently, alterations calculate price as `hours x hourlyRate` for each alteration item. The change:

- Add a toggle: "Price by hours" vs "Set price manually"
- When manual: each alteration item gets a direct price input instead of calculating from hours
- The hourly rate field becomes optional/hidden

### 3. LaborEstimator Component

- Make the entire component conditional -- only shown when pricing mode is "hourly"
- No changes to the component itself

### 4. PricingBreakdown Component

- Accept a new `pricingMode` prop
- In "fixed" mode: show just the entered total + margin
- In "per_item" mode: show line items summed up + margin
- In "hourly" mode: current behavior (no change)

### 5. Form Data and Database

- Add a `pricing_mode` field to the form state (`'hourly' | 'fixed' | 'per_item'`)
- Store in `custom_orders.pricing_mode` column (new, nullable text column, defaults to `'hourly'`)
- The `quoted_price`, `estimated_cost`, and other financial fields already exist and will continue to be used

## Technical Details

### Database Migration

```text
ALTER TABLE custom_orders ADD COLUMN pricing_mode text DEFAULT 'hourly';
```

Single column addition. No RLS changes needed (existing policies cover it).

### Files to Modify

1. **`src/components/dashboard/CustomDesignWizard.tsx`**
   - Add `pricingMode` to formData state
   - Render pricing mode selector at top of Step 5 (Smart Pricing)
   - Conditionally render LaborEstimator vs Fixed Price input vs Per Item list
   - Save `pricing_mode` to database on submit

2. **`src/components/dashboard/AlterationDetailsStep.tsx`**
   - Add a toggle for "Calculate from hours" vs "Set price directly"
   - When manual pricing: show a direct price input on each alteration item instead of hours-based calculation
   - Update the `AlterationItem` interface to support both modes

3. **`src/components/dashboard/PricingBreakdown.tsx`**
   - Add `pricingMode` prop
   - In fixed mode: simplified view showing entered price + margin
   - In per_item mode: list items + margin

4. **`src/lib/alteration-types.ts`**
   - Update `AlterationItem` to include an optional `manualPrice` field

5. **`src/components/dashboard/LaborEstimator.tsx`**
   - No internal changes; it simply won't be rendered in non-hourly modes

### User Experience Flow

When a user opens the pricing step, they see three card-style buttons at the top:

```text
+------------------+  +------------------+  +------------------+
|   Clock icon     |  |   Tag icon       |  |   List icon      |
|   Hourly Rate    |  |   Fixed Price    |  |   Per Item       |
|   (selected)     |  |                  |  |                  |
+------------------+  +------------------+  +------------------+
```

Selecting "Fixed Price" collapses the labor estimator and material selector, replacing them with a simple total price input. The margin percentage and final quoted price still apply.

For alterations, a simpler inline toggle appears next to the hourly rate field: "Use hourly calculation" / "Set prices manually".

