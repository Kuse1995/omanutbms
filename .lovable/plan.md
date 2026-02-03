

# Interactive Mannequin Measurement Guide

## Overview

Add a visual mannequin/body diagram that highlights measurement locations when users enable detailed measurements mode. The diagram will be interactive - hovering or clicking on measurement labels will highlight the corresponding area on the mannequin, making it intuitive for tailors and customers to understand exactly where each measurement is taken.

---

## Solution Design

### Visual Approach

Create SVG-based mannequin diagrams for different garment types:

```text
┌──────────────────────────────────────────────┐
│  ┌─────────┐           ┌─────────────────┐   │
│  │         │           │ Measurements    │   │
│  │   ○     │ ◄──────── │ • Shoulder ✓    │   │
│  │  /|\    │           │ • Bust [      ] │   │
│  │  / \    │           │ • Waist ✓       │   │
│  │         │           │ • Hip [      ]  │   │
│  └─────────┘           └─────────────────┘   │
│  [Mannequin]           [Input Fields]        │
└──────────────────────────────────────────────┘
```

### Key Features

1. **Two Mannequin Types**: Upper body (for tops/dresses) and lower body (for trousers/skirts)
2. **Interactive Highlighting**: Hover over a measurement field to highlight the corresponding body area
3. **SVG Line Indicators**: Dotted lines from measurement points to labels
4. **Gender-Neutral Design**: Simple silhouette suitable for all clients
5. **Responsive Layout**: Diagram on left (desktop) or top (mobile)

---

## Implementation Details

### Phase 1: Create SVG Mannequin Components

Create reusable SVG components with highlighted regions:

| Component | Purpose |
|-----------|---------|
| `MannequinUpperBody.tsx` | Shoulder, bust, waist, chest, arm measurements |
| `MannequinLowerBody.tsx` | Waist, hip, thigh, inseam, outseam measurements |
| `MannequinFull.tsx` | Combined for dresses/full outfits |

**SVG Structure Example:**

```typescript
interface MannequinProps {
  highlightedArea?: string;  // e.g., 'bust', 'waist', 'shoulder'
  onAreaClick?: (area: string) => void;
}

function MannequinUpperBody({ highlightedArea, onAreaClick }: MannequinProps) {
  return (
    <svg viewBox="0 0 200 300" className="w-full max-w-[180px]">
      {/* Body outline */}
      <path 
        d="M100,20 ... " 
        className="fill-slate-100 stroke-slate-400"
      />
      
      {/* Measurement regions - highlighted on hover */}
      <ellipse 
        id="bust-region"
        cx="100" cy="100" rx="45" ry="20"
        className={cn(
          "fill-transparent stroke-dashed transition-all cursor-pointer",
          highlightedArea === 'bust' 
            ? "fill-primary/20 stroke-primary stroke-2" 
            : "stroke-muted-foreground/30"
        )}
        onClick={() => onAreaClick?.('bust')}
      />
      
      {/* Measurement labels with leader lines */}
      <line x1="145" y1="100" x2="180" y2="100" className="stroke-muted" />
      <text x="182" y="104" className="text-xs fill-muted-foreground">Bust</text>
    </svg>
  );
}
```

### Phase 2: Measurement Areas Mapping

Define which body areas correspond to each measurement field:

```typescript
const MEASUREMENT_AREA_MAP: Record<string, {
  region: string;
  description: string;
  instruction: string;
}> = {
  // Dress measurements
  'dress_bust_full': { 
    region: 'bust', 
    description: 'Full Bust', 
    instruction: 'Measure around the fullest part of the bust' 
  },
  'dress_bust_front': { 
    region: 'bust-front', 
    description: 'Front Bust', 
    instruction: 'From center front to side seam at bust level' 
  },
  'dress_waist_full': { 
    region: 'waist', 
    description: 'Full Waist', 
    instruction: 'Measure around natural waistline' 
  },
  'dress_sh': { 
    region: 'shoulder', 
    description: 'Shoulder Width', 
    instruction: 'From shoulder point to shoulder point across back' 
  },
  // ... more mappings
};
```

### Phase 3: Integrate with GarmentMeasurementsForm

Update the form to show mannequin alongside measurement inputs:

```typescript
export function GarmentMeasurementsForm({...}) {
  const [highlightedMeasurement, setHighlightedMeasurement] = useState<string | null>(null);
  const [detailedMode, setDetailedMode] = useState(false);

  // Determine which mannequin to show based on garment type
  const mannequinType = useMemo(() => {
    if (['trousers', 'skirt'].includes(activeTab)) return 'lower';
    if (['dress', 'jacket'].includes(activeTab)) return 'full';
    return 'upper';
  }, [activeTab]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Mannequin Guide - Left side on desktop */}
      {detailedMode && (
        <div className="lg:col-span-1 flex flex-col items-center">
          <MeasurementMannequin
            type={mannequinType}
            highlightedArea={highlightedMeasurement}
            garmentCategory={activeTab}
            onAreaClick={(area) => {
              // Focus the corresponding input field
              const input = document.getElementById(area);
              input?.focus();
            }}
          />
          
          {/* Instruction card for highlighted measurement */}
          {highlightedMeasurement && (
            <Card className="mt-4 p-3 bg-primary/5 border-primary/20">
              <p className="text-sm font-medium">
                {MEASUREMENT_AREA_MAP[highlightedMeasurement]?.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {MEASUREMENT_AREA_MAP[highlightedMeasurement]?.instruction}
              </p>
            </Card>
          )}
        </div>
      )}
      
      {/* Measurement Inputs - Right side */}
      <div className={cn(
        detailedMode ? "lg:col-span-2" : "lg:col-span-3"
      )}>
        {/* Existing measurement fields */}
        {category.fields.map((field) => (
          <div 
            key={field.key}
            onMouseEnter={() => setHighlightedMeasurement(field.key)}
            onMouseLeave={() => setHighlightedMeasurement(null)}
            onFocus={() => setHighlightedMeasurement(field.key)}
          >
            {renderMeasurementField(field)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 4: Mobile-Responsive Layout

On smaller screens, show the mannequin as a collapsible reference:

```typescript
// Mobile: Show as expandable panel at top
<div className="lg:hidden">
  <Collapsible>
    <CollapsibleTrigger className="w-full">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View Measurement Guide
        </span>
        <ChevronDown className="h-4 w-4" />
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <MeasurementMannequin ... />
    </CollapsibleContent>
  </Collapsible>
</div>

// Desktop: Show inline
<div className="hidden lg:block">
  <MeasurementMannequin ... />
</div>
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/MeasurementMannequin.tsx` | **New** - Main mannequin component with SVG |
| `src/components/dashboard/mannequin/UpperBodySVG.tsx` | **New** - SVG for upper body measurements |
| `src/components/dashboard/mannequin/LowerBodySVG.tsx` | **New** - SVG for lower body measurements |
| `src/components/dashboard/mannequin/FullBodySVG.tsx` | **New** - SVG for full body (dresses) |
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Add mannequin integration, detailed mode toggle |
| `src/lib/measurement-areas.ts` | **New** - Measurement-to-body-area mapping |

---

## SVG Design Specifications

The mannequin SVGs will be:

- **Minimalist**: Clean line art, not photorealistic
- **Gender-neutral**: Simple silhouette that works for all clients
- **Scalable**: SVG format for crisp rendering at any size
- **Accessible**: Proper ARIA labels for screen readers
- **Theme-aware**: Uses CSS variables for colors (works in dark mode)

**Measurement Regions (Upper Body):**
- Shoulder points
- Neck/collar area
- Bust line
- Under-bust line
- Waist line
- Armhole
- Sleeve length path
- Back length line

**Measurement Regions (Lower Body):**
- Waist line
- Hip line
- Thigh area
- Crotch point
- Inseam line
- Outseam line
- Knee line
- Ankle/hem line

---

## Expected Outcome

1. **Visual guidance**: Users see exactly where each measurement is taken
2. **Interactive learning**: Hover/focus highlights the body area
3. **Reduced errors**: Clear visual reference prevents measuring mistakes
4. **Professional appearance**: Clean diagram enhances the tailoring experience
5. **Optional feature**: Only shows when detailed mode is enabled (doesn't clutter basic mode)

