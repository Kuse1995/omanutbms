

# Update Mandatory Measurements Based on Dodo Wear Client Form

## Overview

Update the `GarmentMeasurementsForm.tsx` component to use the exact measurement fields from the Dodo Wear Client Form document, making them the mandatory standard fields while keeping the custom measurements section for any additional measurements.

---

## Measurements Extracted from Dodo Wear Form

Based on the uploaded document, here are the measurements used by House of Dodo for each garment type:

### DRESS MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| FL | Full Length |
| SH | Shoulder |
| Hip | Hip |
| UB | Under Bust |
| HIP | Hip (duplicate in form) |
| Waist | Waist |

### TROUSERS MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| Waist | Waist |
| Wideness | Wideness/Width |
| UB | Upper Body/Hip |
| Crotch | Crotch/Rise |
| FL | Full Length |
| SH | Shoulder/Short Height |
| In Leg | Inside Leg |

### TOP MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| FL | Full Length |
| In Leg | Inside Leg |
| Bust | Bust |
| Waist | Waist |
| SL | Sleeve Length |
| Cuff | Cuff |
| Join | Join/Armhole |

### SKIRT MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| FL | Full Length |
| SH | Short/Hip |
| Knee | Knee Length |
| Hip | Hip |
| ND | Knee Down |
| NW Join | Narrow Width Join |

### SHIRT MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| CH | Chest |
| Waist | Waist |
| FL | Full Length |
| SH | Shoulder |
| Hip | Hip |
| SL | Sleeve Length |
| NW | Narrow Width |
| Join | Join |
| Collar | Collar |

### JACKET MEASUREMENTS
| Abbrev | Full Name |
|--------|-----------|
| SH | Shoulder |
| Bust | Bust |
| Hip | Hip |
| SL | Sleeve Length |
| Join | Join |
| FL | Full Length |
| UB | Under Bust |
| Waist | Waist |
| Slit | Slit |

### QUALITY CONTROL (Universal Reference)
These are the comprehensive measurements checked during QC:
- SH, Bust, SL, W (Waist), Hip, Cuff, Join, ND, CH (Chest)
- Under Bust, Thigh, Knee, Bottom, Crotch, Inleg, Neck, Arm Height

---

## Implementation Changes

### 1. Simplify to Two Modes

**Standard Mode (Default)** - Dodo Wear mandatory fields only
**Custom Mode** - Add-your-own fields for edge cases

This removes the complex numbered 17-point system and the 6-tab garment categories, replacing them with a single unified form based on the Dodo Wear standard.

### 2. Create Unified Dodo Wear Measurement Set

Consolidate the measurements into a single comprehensive list that covers all garment types:

```typescript
const DODO_WEAR_MEASUREMENTS: MeasurementField[] = [
  // Upper Body
  { key: 'shoulder', abbrev: 'SH', label: 'Shoulder', tooltip: 'Shoulder width across back' },
  { key: 'bust', abbrev: 'Bust', label: 'Bust', tooltip: 'Fullest part of bust/chest' },
  { key: 'chest', abbrev: 'CH', label: 'Chest', tooltip: 'Chest circumference' },
  { key: 'under_bust', abbrev: 'UB', label: 'Under Bust', tooltip: 'Measurement just below bust line' },
  { key: 'waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Natural waistline' },
  { key: 'hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Widest part of hips' },
  
  // Arms
  { key: 'sleeve_length', abbrev: 'SL', label: 'Sleeve Length', tooltip: 'Shoulder to wrist' },
  { key: 'cuff', abbrev: 'Cuff', label: 'Cuff', tooltip: 'Wrist circumference' },
  { key: 'join', abbrev: 'Join', label: 'Join', tooltip: 'Armhole to waist join point' },
  { key: 'arm_height', abbrev: 'Arm H', label: 'Arm Height', tooltip: 'Armhole depth' },
  
  // Collar/Neck
  { key: 'collar', abbrev: 'Collar', label: 'Collar', tooltip: 'Neck/collar circumference' },
  { key: 'neck', abbrev: 'Neck', label: 'Neck', tooltip: 'Neck circumference' },
  
  // Lengths
  { key: 'full_length', abbrev: 'FL', label: 'Full Length', tooltip: 'Top to hem length' },
  { key: 'knee_down', abbrev: 'ND', label: 'Knee Down', tooltip: 'Knee to ankle length' },
  { key: 'knee', abbrev: 'Knee', label: 'Knee', tooltip: 'Knee circumference' },
  
  // Lower Body
  { key: 'wideness', abbrev: 'Wide', label: 'Wideness', tooltip: 'Thigh width preference' },
  { key: 'crotch', abbrev: 'Crotch', label: 'Crotch', tooltip: 'Crotch depth/rise' },
  { key: 'in_leg', abbrev: 'In Leg', label: 'In Leg', tooltip: 'Inside leg measurement' },
  { key: 'thigh', abbrev: 'Thigh', label: 'Thigh', tooltip: 'Thigh circumference' },
  { key: 'bottom', abbrev: 'Bottom', label: 'Bottom', tooltip: 'Trouser leg opening' },
  
  // Jacket Specific
  { key: 'slit', abbrev: 'Slit', label: 'Slit', tooltip: 'Back slit length' },
  { key: 'narrow_width', abbrev: 'NW', label: 'Narrow Width', tooltip: 'Narrow part width' },
];
```

### 3. Update Form Layout

Replace the complex tabbed interface with a clean, full-width grid showing all Dodo Wear measurements in logical groups:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Unit: [cm] [in]                               [22/22 filled] ✓ Complete│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  UPPER BODY                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ SH           │  │ Bust         │  │ CH           │  │ UB           ││
│  │ Shoulder     │  │              │  │ Chest        │  │ Under Bust   ││
│  │ [45.5    ]cm │  │ [92      ]cm │  │ [88      ]cm │  │ [78      ]cm ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐                                    │
│  │ Waist        │  │ Hip          │                                    │
│  │              │  │              │                                    │
│  │ [68      ]cm │  │ [96      ]cm │                                    │
│  └──────────────┘  └──────────────┘                                    │
│                                                                         │
│  ARMS & COLLAR                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ SL           │  │ Cuff         │  │ Join         │  │ Arm H        ││
│  │ Sleeve Length│  │              │  │              │  │ Arm Height   ││
│  │ [60      ]cm │  │ [18      ]cm │  │ [42      ]cm │  │ [24      ]cm ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐                                    │
│  │ Collar       │  │ Neck         │                                    │
│  │              │  │              │                                    │
│  │ [38      ]cm │  │ [36      ]cm │                                    │
│  └──────────────┘  └──────────────┘                                    │
│                                                                         │
│  LENGTHS                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ FL           │  │ ND           │  │ Knee         │                  │
│  │ Full Length  │  │ Knee Down    │  │              │                  │
│  │ [115     ]cm │  │ [52      ]cm │  │ [38      ]cm │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
│  LOWER BODY                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Wide         │  │ Crotch       │  │ In Leg       │  │ Thigh        ││
│  │ Wideness     │  │              │  │              │  │              ││
│  │ [24      ]cm │  │ [28      ]cm │  │ [82      ]cm │  │ [56      ]cm ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Bottom       │  │ Slit         │  │ NW           │                  │
│  │              │  │              │  │ Narrow Width │                  │
│  │ [20      ]cm │  │ [15      ]cm │  │ [18      ]cm │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  CUSTOM MEASUREMENTS                                           [+ Add] │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ (Add any additional measurements not listed above)                  ││
│  │ [Back Hip          ] [45.5    ]cm  [×]                             ││
│  │ [Front Rise        ] [28      ]cm  [×]                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/GarmentMeasurementsForm.tsx` | Replace NUMBERED_MEASUREMENTS with DODO_WEAR_MEASUREMENTS, reorganize into logical groups, simplify UI |
| `src/lib/numbered-measurements.ts` | Rename to `dodo-wear-measurements.ts` and update exports |

### New Measurement Interface

```typescript
interface Measurements {
  // Upper Body
  shoulder?: number;
  bust?: number;
  chest?: number;
  under_bust?: number;
  waist?: number;
  hip?: number;
  
  // Arms & Collar
  sleeve_length?: number;
  cuff?: number;
  join?: number;
  arm_height?: number;
  collar?: number;
  neck?: number;
  
  // Lengths
  full_length?: number;
  knee_down?: number;
  knee?: number;
  
  // Lower Body
  wideness?: number;
  crotch?: number;
  in_leg?: number;
  thigh?: number;
  bottom?: number;
  
  // Jacket Specific
  slit?: number;
  narrow_width?: number;
  
  // Metadata
  _unit?: 'cm' | 'in';
  custom_measurements?: CustomMeasurement[];
}
```

### Measurement Groups for UI Organization

```typescript
const MEASUREMENT_GROUPS = [
  {
    id: 'upper_body',
    label: 'Upper Body',
    fields: ['shoulder', 'bust', 'chest', 'under_bust', 'waist', 'hip']
  },
  {
    id: 'arms_collar',
    label: 'Arms & Collar',
    fields: ['sleeve_length', 'cuff', 'join', 'arm_height', 'collar', 'neck']
  },
  {
    id: 'lengths',
    label: 'Lengths',
    fields: ['full_length', 'knee_down', 'knee']
  },
  {
    id: 'lower_body',
    label: 'Lower Body',
    fields: ['wideness', 'crotch', 'in_leg', 'thigh', 'bottom', 'slit', 'narrow_width']
  }
];
```

---

## Benefits

1. **Matches Existing Workflow** - Uses the exact same measurements from the physical Dodo Wear client form
2. **Simpler UI** - Removes complex tabbed interface and 17-point numbered system
3. **Grouped Logically** - Organized by body section for intuitive data entry
4. **Still Flexible** - Custom measurements section preserved for edge cases
5. **Fraction Support** - Keeps the existing fraction input (e.g., "45/2")
6. **Unit Toggle** - Preserves cm/in toggle for international clients

---

## Migration Considerations

The existing measurement keys in the database will be preserved where they overlap. New keys will be added. Old garment-specific prefixed keys (like `dress_fl`, `trousers_waist`) can remain supported for backward compatibility with existing orders.

