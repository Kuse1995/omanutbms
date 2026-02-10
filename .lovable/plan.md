

# Relax Measurement Validation in Custom Orders

## Problem
Currently, the custom order wizard blocks progress unless all 22 Dodo Wear measurements are filled. This is too strict for real-world use where tailors often work with a subset of key measurements depending on the garment type.

## Solution
Replace the "all-or-nothing" requirement with a **minimum threshold** approach:
- Require at least **6 core measurements** (shoulder, bust/chest, waist, hip, full length, sleeve length) to proceed
- Show a **soft warning** (yellow banner) when fewer than 50% of measurements are filled, encouraging completion
- Show a **green success** indicator when all measurements are filled
- Allow progression at any point once the minimum is met

## Changes

### 1. Update Validation Logic
**File**: `src/components/dashboard/GarmentMeasurementsForm.tsx`

- Add a new `CORE_MEASUREMENTS` constant listing the 6 essential fields
- Add a new `hasMinimumMeasurements()` function that checks if at least the core 6 are filled
- Update `isGarmentCategoryComplete()` to use the relaxed check (returns true if minimum is met)
- Keep `isDodoMeasurementsComplete()` unchanged for the "Complete" badge

### 2. Update Wizard Step Validation
**File**: `src/components/dashboard/CustomDesignWizard.tsx`

- At step 3, only block if fewer than 6 core measurements are filled
- Show a soft warning (not an error) if the user has the minimum but not all measurements, listing what is still missing
- Allow "Next" to proceed with partial measurements

### 3. Add Visual Encouragement in the Form
**File**: `src/components/dashboard/GarmentMeasurementsForm.tsx`

- Add a progress bar or color-coded badge showing measurement completeness
- Below 6 core: red "Minimum required" message
- 6 core filled but not all: yellow "Recommended: complete remaining X measurements for best fit"
- All filled: green "Complete" badge (existing behavior)

---

## Technical Details

### Core Measurements Constant
```typescript
const CORE_MEASUREMENT_KEYS = [
  'shoulder', 'bust', 'waist', 'hip', 'full_length', 'sleeve_length'
];
```

### New Validation Function
```typescript
export function hasMinimumMeasurements(measurements: Measurements): boolean {
  const filledCore = CORE_MEASUREMENT_KEYS.filter(key => {
    const val = measurements[key];
    return val !== undefined && val !== null && Number(val) > 0;
  });
  return filledCore.length >= CORE_MEASUREMENT_KEYS.length;
}
```

### Wizard Validation Change (step 3)
```typescript
case 3: // Measurements
  const hasSome = Object.entries(formData.measurements).some(
    ([key, v]) => key !== '_unit' && typeof v === 'number' && v > 0
  );
  if (!hasSome) {
    errors.push("Please enter at least the core measurements");
  } else if (!hasMinimumMeasurements(formData.measurements)) {
    const missingCore = CORE_MEASUREMENT_KEYS
      .filter(k => !formData.measurements[k] || Number(formData.measurements[k]) <= 0)
      .map(k => getMeasurementByKey(k)?.label || k);
    errors.push(`Please complete core measurements: ${missingCore.join(', ')}`);
  }
  // No error if minimum is met -- user can proceed
  break;
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Add core measurements constant, `hasMinimumMeasurements()`, update progress indicator |
| `src/components/dashboard/CustomDesignWizard.tsx` | Relax step 3 validation to require only core 6, show soft warning for incomplete |

No database changes needed.

