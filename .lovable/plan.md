

# Simplify Detailed Measurements: Remove Diagram & Add Custom Inputs

## Overview

Based on your feedback, I'll:
1. **Remove the mannequin diagram** from detailed measurements mode (it's not feasible right now)
2. **Add fraction/slash input support** - allow entering values like "45/2" or "22.5" 
3. **Add custom measurement inputs** - allow users to add their own measurement fields

---

## Current State

The `GarmentMeasurementsForm.tsx` currently shows:
- Left side: Numbered measurement list with inputs (1-17)
- Right side: Two mannequin SVG diagrams (front/back view) with interactive highlighting

The mannequin takes up roughly half the screen and requires the `NumberedBodySVG` component and related logic.

---

## Planned Changes

### 1. Remove Mannequin Diagram Section

Remove the right-side panel containing:
- The `NumberedBodySVG` components (front/back views)
- The mobile collapsible diagram
- The instruction card that appears when hovering

**Keep:**
- The numbered measurement list (cleaner, full-width layout)
- The instruction text (show inline with each field or as a tooltip)

### 2. Add Fraction/Slash Input Support

Allow users to enter measurements using fractions:
- Input "45/2" → automatically converts to 22.5
- Input "22 1/2" → automatically converts to 22.5
- Input "22.5" → works as normal

```typescript
// Parse fraction input
function parseFractionInput(value: string): number | undefined {
  if (!value.trim()) return undefined;
  
  // Handle "22 1/2" format (mixed number)
  const mixedMatch = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const denom = parseInt(mixedMatch[3]);
    return whole + (num / denom);
  }
  
  // Handle "45/2" format (simple fraction)
  const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }
  
  // Handle decimal
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}
```

### 3. Add Custom Measurement Fields

Add a section at the bottom for custom measurements:

```text
┌─────────────────────────────────────────────────────────────┐
│  STANDARD MEASUREMENTS                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Neck                    [    45    ] cm            │ │
│  │ 2. Across Front            [    38    ] cm            │ │
│  │ 3. Bust                    [   92.5   ] cm            │ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  CUSTOM MEASUREMENTS                          [+ Add More]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Label: [  Back Hip  ]      Value: [  45/2  ] cm       │ │
│  │ Label: [  Collar    ]      Value: [   16   ] cm    [×]│ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Click "+ Add More" to add a new custom measurement row
- Each row has: Label input + Value input + Delete button
- Custom measurements stored in a special `custom_measurements` array in the form data

---

## Technical Implementation

### File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Remove diagram, add fraction parsing, add custom inputs section |
| `src/lib/numbered-measurements.ts` | Remove SVG point coordinates (no longer needed), add fraction parser utility |

### Updated Measurements Interface

```typescript
interface Measurements {
  // ... existing fields ...
  
  // Custom measurements array
  custom_measurements?: CustomMeasurement[];
}

interface CustomMeasurement {
  id: string;
  label: string;
  value: number;
}
```

### Input Handling for Fractions

Change the input type from `number` to `text` to allow "/" characters:

```typescript
<Input
  type="text"
  inputMode="decimal"  // Mobile: show numeric keyboard
  pattern="[\d\s\/\.]+" // Allow digits, spaces, slash, dot
  placeholder="e.g. 45 or 22/2"
  value={displayValue}
  onChange={(e) => handleFractionInput(e.target.value)}
/>
```

### Layout Changes

**Before (with diagram):**
```text
┌──────────────────────────────────────────────┐
│  [List w/ 17 items]   |   [Mannequin SVGs]   │
│         50%           |         50%          │
└──────────────────────────────────────────────┘
```

**After (no diagram):**
```text
┌──────────────────────────────────────────────┐
│  [Standard Measurements - Full Width Grid]   │
│  [2-3 columns on desktop, 1 on mobile]       │
│                                              │
│  [+ Add Custom Measurement Section]          │
└──────────────────────────────────────────────┘
```

---

## Cleanup

After implementing the changes, these can be removed (optional, for cleanup):
- `src/components/dashboard/mannequin/NumberedBodySVG.tsx` (no longer used in detailed mode)
- SVG coordinate data from `numbered-measurements.ts` (`frontPoint`, `backPoint` properties)

---

## Expected Outcome

1. **Cleaner UI** - No complex diagram that's hard to maintain
2. **Better input flexibility** - Support for fractions like "45/2" or "22 1/2"
3. **Custom measurements** - Users can add any additional measurements they need
4. **Full-width layout** - More space for measurement inputs
5. **Simpler codebase** - Less SVG rendering logic to maintain

