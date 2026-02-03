// Measurement areas mapping - connects measurement keys to body regions

export interface MeasurementAreaInfo {
  region: string;
  description: string;
  instruction: string;
}

export const MEASUREMENT_AREA_MAP: Record<string, MeasurementAreaInfo> = {
  // Dress measurements
  'dress_fl': { 
    region: 'full-length', 
    description: 'Full Length', 
    instruction: 'Measure from shoulder point straight down to desired hem length' 
  },
  'dress_sh': { 
    region: 'shoulder', 
    description: 'Shoulder Width', 
    instruction: 'Measure across the back from shoulder point to shoulder point' 
  },
  'dress_hip': { 
    region: 'hip', 
    description: 'Hip', 
    instruction: 'Measure around the fullest part of the hips, about 20cm below waist' 
  },
  'dress_ub': { 
    region: 'under-bust', 
    description: 'Under Bust', 
    instruction: 'Measure around the ribcage directly under the bust line' 
  },
  'dress_waist': { 
    region: 'waist', 
    description: 'Waist', 
    instruction: 'Measure around the natural waistline, the narrowest part of the torso' 
  },
  'dress_sl': { 
    region: 'sleeve', 
    description: 'Sleeve Length', 
    instruction: 'Measure from shoulder point, over bent elbow, to wrist bone' 
  },
  'dress_cuff': { 
    region: 'cuff', 
    description: 'Cuff/Wrist', 
    instruction: 'Measure around the wrist bone' 
  },
  'dress_join': { 
    region: 'armhole', 
    description: 'Join/Armhole', 
    instruction: 'Measure around the armhole from shoulder through underarm' 
  },

  // Trousers measurements
  'trousers_waist': { 
    region: 'waist', 
    description: 'Waist', 
    instruction: 'Measure around where trousers will sit, usually at natural waist or hip' 
  },
  'trousers_wideness': { 
    region: 'thigh', 
    description: 'Thigh Width', 
    instruction: 'Measure around the fullest part of the thigh' 
  },
  'trousers_ub': { 
    region: 'hip', 
    description: 'Hip/Seat', 
    instruction: 'Measure around the fullest part of the hips and seat' 
  },
  'trousers_crotch': { 
    region: 'crotch', 
    description: 'Crotch/Rise', 
    instruction: 'Measure from waistband at front, through legs, to waistband at back' 
  },
  'trousers_bottom': { 
    region: 'ankle', 
    description: 'Bottom/Hem', 
    instruction: 'Desired trouser leg opening width at the ankle' 
  },
  'trousers_nd': { 
    region: 'knee', 
    description: 'Knee Down', 
    instruction: 'Measure from knee to desired hem length' 
  },
  'trousers_fl': { 
    region: 'outseam', 
    description: 'Full Length', 
    instruction: 'Measure from waist to ankle along the outside of the leg' 
  },
  'trousers_nw': { 
    region: 'knee', 
    description: 'Knee Width', 
    instruction: 'Measure around the knee area' 
  },
  'trousers_join': { 
    region: 'inseam', 
    description: 'Inseam', 
    instruction: 'Measure from crotch point to ankle along inside leg' 
  },

  // Top/Blouse measurements
  'top_fl': { 
    region: 'full-length', 
    description: 'Full Length', 
    instruction: 'Measure from shoulder to desired hem length' 
  },
  'top_in_leg': { 
    region: 'inseam', 
    description: 'In Leg', 
    instruction: 'Inside leg measurement for bodysuits' 
  },
  'top_bust': { 
    region: 'bust', 
    description: 'Bust', 
    instruction: 'Measure around the fullest part of the bust' 
  },
  'top_waist': { 
    region: 'waist', 
    description: 'Waist', 
    instruction: 'Measure around the natural waistline' 
  },
  'top_hip': { 
    region: 'hip', 
    description: 'Hip', 
    instruction: 'Measure around the fullest part of the hips' 
  },
  'top_ch': { 
    region: 'chest', 
    description: 'Chest', 
    instruction: 'Measure across the chest, armpit to armpit' 
  },

  // Shirt measurements
  'shirt_fl': { 
    region: 'full-length', 
    description: 'Full Length', 
    instruction: 'Measure from shoulder to desired hem length' 
  },
  'shirt_sh': { 
    region: 'shoulder', 
    description: 'Shoulder', 
    instruction: 'Measure across the back from shoulder point to shoulder point' 
  },
  'shirt_hip': { 
    region: 'hip', 
    description: 'Hip', 
    instruction: 'Measure around where shirt will fall at hip level' 
  },
  'shirt_chest': { 
    region: 'chest', 
    description: 'Chest', 
    instruction: 'Measure around the fullest part of the chest under arms' 
  },
  'shirt_sl': { 
    region: 'sleeve', 
    description: 'Sleeve Length', 
    instruction: 'Measure from shoulder point to wrist bone' 
  },
  'shirt_nw': { 
    region: 'cuff', 
    description: 'Wrist Width', 
    instruction: 'Measure around the wrist for cuff size' 
  },
  'shirt_join': { 
    region: 'armhole', 
    description: 'Armhole', 
    instruction: 'Measure around the armhole circumference' 
  },
  'shirt_collar': { 
    region: 'neck', 
    description: 'Collar/Neck', 
    instruction: 'Measure around the base of the neck, add 1-2cm for comfort' 
  },

  // Skirt measurements
  'skirt_fl': { 
    region: 'outseam', 
    description: 'Full Length', 
    instruction: 'Measure from waist to desired hem length' 
  },
  'skirt_sh': { 
    region: 'thigh', 
    description: 'Short Length', 
    instruction: 'Measure for short/mini skirt option' 
  },
  'skirt_knee': { 
    region: 'knee', 
    description: 'Knee Length', 
    instruction: 'Measure from waist to just below knee' 
  },
  'skirt_hip': { 
    region: 'hip', 
    description: 'Hip', 
    instruction: 'Measure around the fullest part of the hips' 
  },
  'skirt_waist': { 
    region: 'waist', 
    description: 'Waist', 
    instruction: 'Measure where the skirt waistband will sit' 
  },

  // Jacket measurements
  'jacket_sh': { 
    region: 'shoulder', 
    description: 'Shoulder', 
    instruction: 'Measure across back from shoulder point to shoulder point' 
  },
  'jacket_bust': { 
    region: 'bust', 
    description: 'Bust', 
    instruction: 'Measure around fullest part of bust, add ease for jacket' 
  },
  'jacket_hip': { 
    region: 'hip', 
    description: 'Hip', 
    instruction: 'Measure around hips where jacket will fall' 
  },
  'jacket_sl': { 
    region: 'sleeve', 
    description: 'Sleeve Length', 
    instruction: 'Measure from shoulder to wrist, arm slightly bent' 
  },
  'jacket_join': { 
    region: 'armhole', 
    description: 'Armhole', 
    instruction: 'Measure around the armhole, allow extra for movement' 
  },
  'jacket_fl': { 
    region: 'full-length', 
    description: 'Full Length', 
    instruction: 'Measure from shoulder to desired jacket hem' 
  },
  'jacket_ub': { 
    region: 'under-bust', 
    description: 'Under Bust', 
    instruction: 'Measure around ribcage under bust for fitted jackets' 
  },
  'jacket_waist': { 
    region: 'waist', 
    description: 'Waist', 
    instruction: 'Measure around natural waistline' 
  },
  'jacket_slit': { 
    region: 'back-slit', 
    description: 'Back Slit', 
    instruction: 'Desired slit length from hem upward' 
  },
};

// Get region for a measurement key
export function getRegionForMeasurement(key: string): string | null {
  return MEASUREMENT_AREA_MAP[key]?.region || null;
}

// Get all measurements for a region
export function getMeasurementsForRegion(region: string): string[] {
  return Object.entries(MEASUREMENT_AREA_MAP)
    .filter(([_, info]) => info.region === region)
    .map(([key]) => key);
}
