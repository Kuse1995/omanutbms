
# Mobile UX/UI Optimization for Custom Orders

## Overview

This plan enhances the Custom Orders section for optimal mobile usability, focusing on the `CustomDesignWizard`, `GarmentMeasurementsForm`, `MaterialSelector`, `LaborEstimator`, `AdditionalCostsSection`, and `CustomOrdersManager` components.

---

## Current Mobile Issues Identified

| Component | Issue |
|-----------|-------|
| **CustomDesignWizard** | Modal too cramped; step navigation icons small; footer buttons crowded |
| **GarmentMeasurementsForm** | 3-column grid unreadable on mobile; input fields too narrow |
| **MaterialSelector** | Row layout with 5+ elements overflows; Select dropdowns too small |
| **LaborEstimator** | 2-column grid cramped; AI button text truncates |
| **AdditionalCostsSection** | 3-column preset grid unreadable; row items overflow |
| **CustomOrdersManager** | Table-based layout unusable on mobile; action buttons cramped |
| **Client Info Form** | 2-column grid forces tiny inputs |

---

## Implementation Plan

### 1. CustomDesignWizard Mobile Overhaul

**File:** `src/components/dashboard/CustomDesignWizard.tsx`

**Changes:**

a) **Full-screen mobile modal:**
```typescript
// Change from max-w-4xl to full-screen on mobile
className="bg-background ... w-full max-w-4xl sm:max-w-4xl max-h-[100vh] sm:max-h-[90vh] sm:rounded-2xl rounded-none"
```

b) **Collapsible step navigation on mobile:**
- Show only current step indicator on mobile with swipe gestures
- Replace horizontal step bar with a dropdown or compact stepper

c) **Larger touch targets:**
- Increase step icons from `w-8 h-8` to `w-11 h-11` on mobile
- Footer buttons get larger padding

d) **Sticky footer optimization:**
- Stack "Save Draft" below navigation on very small screens
- Ensure buttons don't overlap

e) **Step content responsiveness:**
- Change `grid-cols-2` to `grid-cols-1` on mobile for Client Info, Work Details
- Add proper spacing for date/time pickers

### 2. GarmentMeasurementsForm Mobile Layout

**File:** `src/components/dashboard/GarmentMeasurementsForm.tsx`

**Changes:**

a) **Single-column layout on mobile:**
```typescript
// Change from lg:grid-cols-3 to responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
```
Already correct, but needs adjustment for the measurement field container.

b) **Wider input fields:**
```typescript
// Increase from w-24 to w-28 on mobile, or make responsive
<div className="relative w-24 sm:w-24 shrink-0">
```

c) **Touch-friendly measurement rows:**
- Increase row padding from `p-2.5` to `p-3`
- Make the entire row tappable to focus the input
- Larger abbreviation badges

d) **Floating unit toggle:**
- Make unit toggle sticky at the top when scrolling through measurements
- Progress badge more prominent

e) **Collapsible groups:**
- Allow collapsing measurement groups to reduce scroll fatigue
- Show filled count per group

### 3. MaterialSelector Mobile Optimization

**File:** `src/components/dashboard/MaterialSelector.tsx`

**Changes:**

a) **Stacked row layout:**
```typescript
// On mobile, stack the material selector vertically
<div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg">
  <div className="w-full sm:flex-1">
    <Select>...</Select>
  </div>
  <div className="flex items-center gap-2">
    <Input className="w-20" /> {/* Quantity */}
    <span className="w-12 text-sm">meters</span>
    <span className="w-20 text-right font-medium">K 375.00</span>
    <Button>×</Button>
  </div>
</div>
```

b) **Full-width select dropdown:**
- Material dropdown spans full width on mobile
- Bottom sheet-style selection on mobile for easier browsing

c) **AI Estimate button:**
- Stack buttons vertically on mobile header
- Full-width action buttons

### 4. LaborEstimator Mobile Optimization

**File:** `src/components/dashboard/LaborEstimator.tsx`

**Changes:**

a) **Single-column form:**
```typescript
// Stack all inputs vertically on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

b) **AI Estimate button placement:**
- Move to full-width below the title on mobile
- Or make it a floating action button

c) **Larger input touch targets:**
- `h-10` instead of `h-9` on mobile

### 5. AdditionalCostsSection Mobile Optimization

**File:** `src/components/dashboard/AdditionalCostsSection.tsx`

**Changes:**

a) **2-column preset grid:**
```typescript
// Change from grid-cols-3 to responsive
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
```

b) **Stacked item rows:**
```typescript
// Each cost item becomes a card on mobile
<div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
  <div className="flex items-center gap-2">
    <Select className="flex-1">...</Select>  {/* Type */}
    <Button size="icon">×</Button>
  </div>
  <Input placeholder="Description..." />
  <div className="flex items-center gap-2">
    <Input className="w-20" placeholder="Qty" />
    <Input className="w-24" placeholder="K0" />
    <span className="ml-auto font-medium">K 50.00</span>
  </div>
</div>
```

### 6. CustomOrdersManager List View

**File:** `src/components/dashboard/CustomOrdersManager.tsx`

**Changes:**

a) **Card-based list instead of table on mobile:**
```typescript
// Mobile: render cards; Desktop: render table
const isMobile = useIsMobile();

{isMobile ? (
  <div className="space-y-3">
    {filteredOrders.map(order => (
      <Card key={order.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">{order.customers?.name}</p>
          </div>
          <Badge>{order.status}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span>{order.design_type}</span>
          <span className="font-medium">K {order.quoted_price}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="outline">Invoice</Button>
        </div>
      </Card>
    ))}
  </div>
) : (
  <Table>...</Table>
)}
```

b) **Status cards:**
- Horizontal scroll for status summary cards
- Or collapse to 2-per-row

c) **Search/filter bar:**
- Stack filter controls vertically on mobile

### 7. Client Info Step (Step 0) Mobile Layout

**File:** `src/components/dashboard/CustomDesignWizard.tsx`

**Changes:**

a) **Single-column input layout:**
```typescript
// Change Client Info grid
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

b) **Full-width phone inputs:**
- Phone and WhatsApp inputs span full width on mobile
- Proper spacing between input groups

### 8. Review Step (Step 6) Mobile Layout

**Changes:**

a) **Summary cards stacked:**
```typescript
// Change from grid-cols-4 to responsive
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
```

b) **Generated images:**
- 2 columns on mobile instead of 4

c) **Signature pad:**
- Ensure signature canvas is wide enough and easy to draw on

---

## Technical Changes Summary

| File | Changes |
|------|---------|
| `src/components/dashboard/CustomDesignWizard.tsx` | Full-screen mobile modal, responsive grids, larger touch targets, stacked footer buttons |
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Single-column on mobile, collapsible groups, sticky unit toggle, larger inputs |
| `src/components/dashboard/MaterialSelector.tsx` | Stacked row layout, full-width select, vertical action buttons |
| `src/components/dashboard/LaborEstimator.tsx` | Single-column form, larger inputs, repositioned AI button |
| `src/components/dashboard/AdditionalCostsSection.tsx` | 2-column presets, card-style rows on mobile |
| `src/components/dashboard/CustomOrdersManager.tsx` | Card-based list view on mobile, scrollable status cards |
| `src/components/dashboard/CustomMeasurementsSection.tsx` | Stacked layout for custom measurement rows |

---

## Additional Mobile Enhancements

1. **Sheet-based modals:** Use `Sheet` component (slide from bottom) instead of dialog for better mobile UX on sub-selections
2. **Haptic feedback:** Add subtle vibration on form completion
3. **Pull-to-refresh:** Enable on orders list
4. **Keyboard optimization:** Use `inputMode="decimal"` for number inputs, proper keyboard types
5. **Scroll indicators:** Visual cues when content extends beyond visible area

---

## Expected Outcome

After implementation:
- Wizard steps are fully visible and tappable without zooming
- Measurement form is easily readable and editable with one hand
- Material/labor/pricing sections have clear visual hierarchy
- Orders list is browsable with quick actions visible
- All buttons meet minimum 44px touch target guidelines
- No horizontal scrolling required
