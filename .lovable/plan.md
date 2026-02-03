
# Enhanced Measurement Mannequin & Custom Order UX Improvements

## Overview

Based on your reference image and feedback, I'll implement two major improvements:

1. **Redesigned Measurement Mannequin**: Transform the current abstract SVG regions into a numbered reference diagram matching your vision - with clear numbered points on the body figure that correspond to a numbered list of measurements
2. **Fixed Scrolling Issue**: Prevent the background from scrolling when the modal content is scrolled

---

## Current Issues

### Issue 1: Mannequin Design
The current SVGs use abstract ellipse regions that highlight on hover. Your reference image shows a cleaner approach:
- A full-body fashion illustration with clean lines
- Numbered measurement points (1-17) on the figure
- A corresponding numbered list on the left side
- Front and back view to show all measurement locations

### Issue 2: Background Scrolling
The `CustomDesignWizard` uses a fixed overlay with `overflow-y-auto` on the content area. However, scroll events may be propagating to the body, causing the background page to scroll when the user scrolls within the modal.

---

## Solution Design

### Part 1: Redesigned Mannequin SVGs

Create a new mannequin design that matches your reference:

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│   1. Neck         ───────     ┌─○─┐                │
│   2. Across Front ─────────   │ 1 │                │
│   3. Bust         ─────────   ├─2─┼──3──┐          │
│   4. Under Bust   ─────────   │ 4 │     │          │
│   5. Waist Circ.  ─────────   ├───┤  [Front View]  │
│   6. Hip Circ.    ─────────   │ 5 │                │
│   7. Thigh Circ.  ─────────   ├─6─┤                │
│   8. Upper Arm    ─────────   │ 7 │                │
│   9. Elbow Circ.  ─────────   │   │                │
│  10. Wrist Circ.  ─────────   │ 8 │                │
│  11. Shoulder to Waist ────   │   │                │
│  12. Shoulder to Floor ────   │   │                │
│  ...                          └───┘                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Design Specifications:**
- Clean line-art figure (front + back view side by side)
- Numbered indicators at each measurement point
- Leader lines connecting numbers to body locations
- Pink/primary color highlights for active measurements
- Measurement list on the left with corresponding numbers

### Part 2: Fix Modal Scroll Containment

Add CSS properties to prevent scroll propagation:

```css
/* On the modal overlay */
.modal-overlay {
  overscroll-behavior: contain;
  touch-action: none;
}

/* On the scrollable content */
.modal-content {
  overscroll-behavior: contain;
}
```

Also add `body` scroll lock when modal is open:
```typescript
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [open]);
```

---

## Implementation Details

### Phase 1: New Measurement Diagram Component

Create a new `NumberedMannequin` component with:

| Feature | Description |
|---------|-------------|
| Front/Back Views | Show both front and back body views side by side |
| Numbered Points | 1-17 (or more) numbered measurement locations |
| Active Highlighting | When user focuses an input, highlight that number |
| Measurement List | Numbered list synced with diagram |
| Leader Lines | Connect numbers to body points |

**Measurement Points (matching your reference):**
1. Neck
2. Across Front
3. Bust (Fullest part)
4. Under Bust
5. Waist Circumference
6. Hip Circumference (Fullest part)
7. Thigh Circumference (Fullest part)
8. Upper Arm Circumference (Fullest part)
9. Elbow Circumference
10. Wrist Circumference
11. Shoulder to Waist
12. Shoulder to Floor
13. Shoulder to Shoulder
14. Back Neck to Waist
15. Across Back
16. Inner Arm Length (Armhole to wrist)
17. Ankle

### Phase 2: Update Measurement Form Layout

Redesign `GarmentMeasurementsForm.tsx`:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Basic/Detailed Toggle]              [Unit: cm | in]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌───────────────────────────────┐ │
│  │   MEASUREMENT       │  │                               │ │
│  │   LIST              │  │   [MANNEQUIN FIGURES]         │ │
│  │                     │  │                               │ │
│  │   1. Neck    [  ]   │  │    ┌─○─┐      ┌─○─┐          │ │
│  │   2. Bust    [  ]   │  │    │   │      │   │          │ │
│  │   3. Waist   [  ]   │  │    │   │      │   │          │ │
│  │   4. Hip     [  ]   │  │   Front      Back            │ │
│  │   ...               │  │                               │ │
│  │                     │  │   "Measure around the         │ │
│  │                     │  │    fullest part of bust"      │ │
│  └─────────────────────┘  └───────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Fix Scroll Containment

Update `CustomDesignWizard.tsx`:

```typescript
// Add scroll lock effect
useEffect(() => {
  if (open) {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }
}, [open]);

// Update the overlay div
<div 
  className="fixed inset-0 z-50 ... overflow-hidden"
  style={{ overscrollBehavior: 'contain' }}
>
  <motion.div className="... overflow-hidden">
    {/* Content area with isolated scroll */}
    <div 
      className="flex-1 overflow-y-auto"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Step content */}
    </div>
  </motion.div>
</div>
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/mannequin/NumberedBodySVG.tsx` | **New** - Numbered mannequin with front/back views |
| `src/components/dashboard/mannequin/UpperBodySVG.tsx` | Update with numbered points |
| `src/components/dashboard/mannequin/LowerBodySVG.tsx` | Update with numbered points |
| `src/components/dashboard/mannequin/FullBodySVG.tsx` | Update with numbered points |
| `src/components/dashboard/MeasurementMannequin.tsx` | Integrate new numbered diagram layout |
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Redesign layout with list + diagram side by side |
| `src/components/dashboard/CustomDesignWizard.tsx` | Fix scroll containment issue |
| `src/lib/measurement-areas.ts` | Add numbered mapping for all measurements |

---

## Technical Details

### Numbered Measurement Map

```typescript
const NUMBERED_MEASUREMENTS = [
  { number: 1, key: 'neck', label: 'Neck', instruction: 'Measure around the base of the neck' },
  { number: 2, key: 'across_front', label: 'Across Front', instruction: 'Measure across chest at armpit level' },
  { number: 3, key: 'bust', label: 'Bust (Fullest part)', instruction: 'Measure around the fullest part' },
  // ... 17 total measurements
];
```

### Interactive Highlighting

When user hovers/focuses measurement #3 (Bust):
- The number "3" on the mannequin highlights in pink
- The leader line becomes prominent
- An instruction tooltip appears below the figure
- The input field gets a matching highlight border

---

## Expected Outcome

1. **Professional measurement guide** matching industry standard body measurement charts
2. **Clear visual reference** with numbered points like your example image
3. **No background scrolling** - modal content scrolls independently
4. **Improved UX** - users always know exactly where to measure
5. **Mobile friendly** - responsive layout with collapsible diagram on small screens
