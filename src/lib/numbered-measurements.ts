// Numbered measurement system for fashion measurement guides

export interface NumberedMeasurement {
  number: number;
  key: string;
  label: string;
  instruction: string;
  frontPoint?: { x: number; y: number };
  backPoint?: { x: number; y: number };
}

// Standard 17-point measurement system matching professional fashion design charts
export const NUMBERED_MEASUREMENTS: NumberedMeasurement[] = [
  { 
    number: 1, 
    key: 'neck', 
    label: 'Neck', 
    instruction: 'Measure around the base of the neck, at the collar position',
    frontPoint: { x: 100, y: 42 },
  },
  { 
    number: 2, 
    key: 'across_front', 
    label: 'Across Front', 
    instruction: 'Measure horizontally across the chest, from armpit to armpit at the front',
    frontPoint: { x: 100, y: 70 },
  },
  { 
    number: 3, 
    key: 'bust', 
    label: 'Bust (Fullest part)', 
    instruction: 'Measure around the fullest part of the bust, keeping tape parallel to floor',
    frontPoint: { x: 65, y: 85 },
  },
  { 
    number: 4, 
    key: 'under_bust', 
    label: 'Under Bust', 
    instruction: 'Measure around the ribcage, directly below the bust line',
    frontPoint: { x: 65, y: 105 },
  },
  { 
    number: 5, 
    key: 'waist', 
    label: 'Waist Circumference', 
    instruction: 'Measure around the natural waist - the narrowest part of the torso',
    frontPoint: { x: 65, y: 130 },
  },
  { 
    number: 6, 
    key: 'hip', 
    label: 'Hip Circumference (Fullest part)', 
    instruction: 'Measure around the fullest part of the hips, approximately 20cm below waist',
    frontPoint: { x: 65, y: 175 },
  },
  { 
    number: 7, 
    key: 'thigh', 
    label: 'Thigh Circumference (Fullest part)', 
    instruction: 'Measure around the fullest part of the upper thigh',
    frontPoint: { x: 80, y: 220 },
  },
  { 
    number: 8, 
    key: 'upper_arm', 
    label: 'Upper Arm Circumference', 
    instruction: 'Measure around the fullest part of the upper arm (bicep)',
    frontPoint: { x: 35, y: 95 },
  },
  { 
    number: 9, 
    key: 'elbow', 
    label: 'Elbow Circumference', 
    instruction: 'Measure around the elbow with arm slightly bent',
    frontPoint: { x: 25, y: 140 },
  },
  { 
    number: 10, 
    key: 'wrist', 
    label: 'Wrist Circumference', 
    instruction: 'Measure around the wrist bone',
    frontPoint: { x: 20, y: 185 },
  },
  { 
    number: 11, 
    key: 'shoulder_to_waist', 
    label: 'Shoulder to Waist', 
    instruction: 'Measure from the shoulder point straight down to the waist',
    backPoint: { x: 100, y: 55 },
  },
  { 
    number: 12, 
    key: 'shoulder_to_floor', 
    label: 'Shoulder to Floor', 
    instruction: 'Measure from the shoulder point straight down to the floor',
    backPoint: { x: 100, y: 55 },
  },
  { 
    number: 13, 
    key: 'shoulder', 
    label: 'Shoulder to Shoulder', 
    instruction: 'Measure across the back from one shoulder point to the other',
    backPoint: { x: 100, y: 55 },
  },
  { 
    number: 14, 
    key: 'back_neck_to_waist', 
    label: 'Back Neck to Waist', 
    instruction: 'Measure from the back neckline (base of neck) down to waist',
    backPoint: { x: 100, y: 42 },
  },
  { 
    number: 15, 
    key: 'across_back', 
    label: 'Across Back', 
    instruction: 'Measure horizontally across the back, from armpit to armpit',
    backPoint: { x: 100, y: 70 },
  },
  { 
    number: 16, 
    key: 'arm_length', 
    label: 'Inner Arm Length', 
    instruction: 'Measure from armhole to wrist along the inside of the arm',
    frontPoint: { x: 42, y: 95 },
  },
  { 
    number: 17, 
    key: 'ankle', 
    label: 'Ankle', 
    instruction: 'Measure around the ankle bone',
    frontPoint: { x: 90, y: 340 },
  },
];

// Get measurement by number
export function getMeasurementByNumber(num: number): NumberedMeasurement | undefined {
  return NUMBERED_MEASUREMENTS.find(m => m.number === num);
}

// Get measurement by key
export function getMeasurementByKey(key: string): NumberedMeasurement | undefined {
  return NUMBERED_MEASUREMENTS.find(m => m.key === key);
}

// Get all front measurements
export function getFrontMeasurements(): NumberedMeasurement[] {
  return NUMBERED_MEASUREMENTS.filter(m => m.frontPoint);
}

// Get all back measurements
export function getBackMeasurements(): NumberedMeasurement[] {
  return NUMBERED_MEASUREMENTS.filter(m => m.backPoint);
}
