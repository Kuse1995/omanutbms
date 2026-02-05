// Alteration types and pricing configuration

export interface AlterationType {
  id: string;
  label: string;
  category: 'sizing' | 'hem' | 'sleeves' | 'repair' | 'adjust' | 'other';
  defaultHours: number;
  description?: string;
}

export interface AlterationItem {
  id: string;
  type: string;
  label: string;
  estimatedHours: number;
  price: number;
  notes?: string;
}

export const ALTERATION_TYPES: AlterationType[] = [
  // Sizing
  { id: 'take_in_sides', label: 'Take In Sides', category: 'sizing', defaultHours: 2, description: 'Reduce width at sides' },
  { id: 'let_out_sides', label: 'Let Out Sides', category: 'sizing', defaultHours: 2.5, description: 'Increase width at sides' },
  { id: 'taper_trousers', label: 'Taper Trousers', category: 'sizing', defaultHours: 2, description: 'Slim the leg from knee down' },
  { id: 'slim_dress', label: 'Slim Dress/Skirt', category: 'sizing', defaultHours: 2.5, description: 'Take in entire dress or skirt' },
  
  // Hem
  { id: 'shorten_hem', label: 'Shorten Hem', category: 'hem', defaultHours: 1, description: 'Reduce length at hem' },
  { id: 'lengthen_hem', label: 'Lengthen Hem', category: 'hem', defaultHours: 2, description: 'Add length at hem' },
  { id: 'original_hem', label: 'Keep Original Hem', category: 'hem', defaultHours: 1.5, description: 'Shorten while preserving original hem' },
  
  // Sleeves
  { id: 'shorten_sleeves', label: 'Shorten Sleeves', category: 'sleeves', defaultHours: 1.5, description: 'Reduce sleeve length' },
  { id: 'lengthen_sleeves', label: 'Lengthen Sleeves', category: 'sleeves', defaultHours: 2.5, description: 'Add length to sleeves' },
  { id: 'slim_sleeves', label: 'Slim Sleeves', category: 'sleeves', defaultHours: 2, description: 'Take in sleeve width' },
  
  // Repairs
  { id: 'replace_zipper', label: 'Replace Zipper', category: 'repair', defaultHours: 1.5, description: 'Install new zipper' },
  { id: 'repair_seam', label: 'Repair Seam', category: 'repair', defaultHours: 0.5, description: 'Fix split or open seam' },
  { id: 'patch_hole', label: 'Patch Hole', category: 'repair', defaultHours: 1, description: 'Mend hole or tear' },
  { id: 'replace_lining', label: 'Replace Lining', category: 'repair', defaultHours: 4, description: 'Install new lining' },
  { id: 'fix_buttons', label: 'Fix/Replace Buttons', category: 'repair', defaultHours: 0.5, description: 'Replace missing or damaged buttons' },
  
  // Adjustments
  { id: 'adjust_waist', label: 'Adjust Waistband', category: 'adjust', defaultHours: 2, description: 'Take in or let out waist' },
  { id: 'adjust_shoulders', label: 'Adjust Shoulders', category: 'adjust', defaultHours: 3, description: 'Modify shoulder width or position' },
  { id: 'add_darts', label: 'Add Darts', category: 'adjust', defaultHours: 1.5, description: 'Add shaping darts' },
  { id: 'adjust_neckline', label: 'Adjust Neckline', category: 'adjust', defaultHours: 2, description: 'Modify neckline shape or depth' },
  { id: 'move_buttons', label: 'Move Buttons', category: 'adjust', defaultHours: 1, description: 'Reposition buttons for better fit' },
  
  // Other
  { id: 'custom', label: 'Custom Alteration', category: 'other', defaultHours: 0, description: 'Custom work - specify in notes' },
];

export const ALTERATION_CATEGORIES: Record<string, { label: string; icon: string }> = {
  sizing: { label: 'Sizing', icon: '📏' },
  hem: { label: 'Hem & Length', icon: '✂️' },
  sleeves: { label: 'Sleeves', icon: '🧥' },
  repair: { label: 'Repairs', icon: '🔧' },
  adjust: { label: 'Adjustments', icon: '🎯' },
  other: { label: 'Other', icon: '📝' },
};

export const GARMENT_TYPES_FOR_ALTERATION = [
  'Dress',
  'Suit Jacket',
  'Suit Trousers',
  'Blazer',
  'Shirt/Blouse',
  'Trousers/Pants',
  'Skirt',
  'Coat/Overcoat',
  'Wedding Dress',
  'Evening Gown',
  'Traditional Attire',
  'Jeans',
  'Shorts',
  'Other',
];

export const GARMENT_CONDITIONS = [
  { value: 'good', label: 'Good Condition', description: 'Garment is in excellent state' },
  { value: 'fair', label: 'Fair Condition', description: 'Some wear but workable' },
  { value: 'fragile', label: 'Fragile/Delicate', description: 'Requires careful handling' },
];

export function calculateAlterationPrice(hours: number, hourlyRate: number): number {
  return Math.round(hours * hourlyRate);
}

export function getAlterationsByCategory(category: string): AlterationType[] {
  return ALTERATION_TYPES.filter(a => a.category === category);
}

export function getAlterationById(id: string): AlterationType | undefined {
  return ALTERATION_TYPES.find(a => a.id === id);
}
