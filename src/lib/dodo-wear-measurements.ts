// Dodo Wear measurement system based on the official House of Dodo client form

export interface DodoMeasurementField {
  key: string;
  abbrev: string;
  label: string;
  tooltip: string;
}

export interface MeasurementGroup {
  id: string;
  label: string;
  fields: DodoMeasurementField[];
}

// Comprehensive measurement fields from Dodo Wear Client Form
export const DODO_WEAR_MEASUREMENTS: DodoMeasurementField[] = [
  // Upper Body
  { key: 'shoulder', abbrev: 'SH', label: 'Shoulder', tooltip: 'Shoulder width across back' },
  { key: 'bust', abbrev: 'Bust', label: 'Bust', tooltip: 'Fullest part of bust/chest' },
  { key: 'chest', abbrev: 'CH', label: 'Chest', tooltip: 'Chest circumference' },
  { key: 'under_bust', abbrev: 'UB', label: 'Under Bust', tooltip: 'Measurement just below bust line' },
  { key: 'waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Natural waistline' },
  { key: 'hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Widest part of hips' },
  
  // Arms & Collar
  { key: 'sleeve_length', abbrev: 'SL', label: 'Sleeve Length', tooltip: 'Shoulder to wrist' },
  { key: 'cuff', abbrev: 'Cuff', label: 'Cuff', tooltip: 'Wrist circumference' },
  { key: 'join', abbrev: 'Join', label: 'Join', tooltip: 'Armhole to waist join point' },
  { key: 'arm_height', abbrev: 'Arm H', label: 'Arm Height', tooltip: 'Armhole depth' },
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

// Measurement groups for UI organization
export const MEASUREMENT_GROUPS: MeasurementGroup[] = [
  {
    id: 'upper_body',
    label: 'Upper Body',
    fields: DODO_WEAR_MEASUREMENTS.filter(m => 
      ['shoulder', 'bust', 'chest', 'under_bust', 'waist', 'hip'].includes(m.key)
    )
  },
  {
    id: 'arms_collar',
    label: 'Arms & Collar',
    fields: DODO_WEAR_MEASUREMENTS.filter(m => 
      ['sleeve_length', 'cuff', 'join', 'arm_height', 'collar', 'neck'].includes(m.key)
    )
  },
  {
    id: 'lengths',
    label: 'Lengths',
    fields: DODO_WEAR_MEASUREMENTS.filter(m => 
      ['full_length', 'knee_down', 'knee'].includes(m.key)
    )
  },
  {
    id: 'lower_body',
    label: 'Lower Body',
    fields: DODO_WEAR_MEASUREMENTS.filter(m => 
      ['wideness', 'crotch', 'in_leg', 'thigh', 'bottom', 'slit', 'narrow_width'].includes(m.key)
    )
  }
];

// Get measurement by key
export function getMeasurementByKey(key: string): DodoMeasurementField | undefined {
  return DODO_WEAR_MEASUREMENTS.find(m => m.key === key);
}

// Get all measurement keys
export function getAllMeasurementKeys(): string[] {
  return DODO_WEAR_MEASUREMENTS.map(m => m.key);
}

// Count filled measurements
export function countFilledMeasurements(measurements: Record<string, unknown>): number {
  return DODO_WEAR_MEASUREMENTS.filter(m => {
    const val = measurements[m.key];
    return val !== undefined && val !== null && val !== '' && Number(val) > 0;
  }).length;
}

// Check if all mandatory measurements are complete
export function isAllMeasurementsComplete(measurements: Record<string, unknown>): boolean {
  return countFilledMeasurements(measurements) === DODO_WEAR_MEASUREMENTS.length;
}
