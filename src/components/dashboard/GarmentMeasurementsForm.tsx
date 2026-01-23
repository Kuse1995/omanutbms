import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface Measurements {
  // Dress measurements
  dress_fl?: number;        // Full Length
  dress_sh?: number;        // Shoulder
  dress_hip?: number;       // Hip
  dress_ub?: number;        // Under Bust
  dress_waist?: number;     // Waist
  dress_sl?: number;        // Sleeve Length
  dress_cuff?: number;      // Cuff
  dress_join?: number;      // Join
  
  // Trousers measurements
  trousers_waist?: number;  // Waist
  trousers_wideness?: number; // Wideness
  trousers_ub?: number;     // Upper Body/Hip
  trousers_crotch?: number; // Crotch
  trousers_bottom?: number; // Bottom
  trousers_nd?: number;     // Knee Down
  trousers_fl?: number;     // Full Length
  trousers_nw?: number;     // Narrow Width
  trousers_join?: number;   // Join
  
  // Top/Shirt measurements
  top_fl?: number;          // Full Length
  top_in_leg?: number;      // In Leg
  top_bust?: number;        // Bust
  top_waist?: number;       // Waist
  top_hip?: number;         // Hip
  top_ch?: number;          // Chest
  
  // Skirt measurements
  skirt_fl?: number;        // Full Length
  skirt_sh?: number;        // Shoulder/Short
  skirt_knee?: number;      // Knee
  skirt_hip?: number;       // Hip
  skirt_waist?: number;     // Waist
  
  // Jacket measurements
  jacket_sh?: number;       // Shoulder
  jacket_bust?: number;     // Bust
  jacket_hip?: number;      // Hip
  jacket_sl?: number;       // Sleeve Length
  jacket_join?: number;     // Join
  jacket_fl?: number;       // Full Length
  jacket_ub?: number;       // Under Bust
  jacket_waist?: number;    // Waist
  jacket_slit?: number;     // Slit
  
  [key: string]: number | undefined;
}

interface GarmentMeasurementsFormProps {
  measurements: Measurements;
  onChange: (measurements: Measurements) => void;
  designType?: string;
}

interface MeasurementField {
  key: string;
  abbrev: string;
  label: string;
  tooltip: string;
}

const DRESS_FIELDS: MeasurementField[] = [
  { key: 'dress_fl', abbrev: 'FL', label: 'Full Length', tooltip: 'Measure from shoulder to hem' },
  { key: 'dress_sh', abbrev: 'SH', label: 'Shoulder', tooltip: 'Shoulder width across back' },
  { key: 'dress_hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Widest part of hips' },
  { key: 'dress_ub', abbrev: 'UB', label: 'Under Bust', tooltip: 'Measurement just below bust line' },
  { key: 'dress_waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Natural waistline' },
  { key: 'dress_sl', abbrev: 'SL', label: 'Sleeve Length', tooltip: 'Shoulder to wrist' },
  { key: 'dress_cuff', abbrev: 'Cuff', label: 'Cuff', tooltip: 'Wrist circumference' },
  { key: 'dress_join', abbrev: 'Join', label: 'Join', tooltip: 'Armhole to waist join point' },
];

const TROUSERS_FIELDS: MeasurementField[] = [
  { key: 'trousers_waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Waist circumference' },
  { key: 'trousers_wideness', abbrev: 'Wide', label: 'Wideness', tooltip: 'Thigh width preference' },
  { key: 'trousers_ub', abbrev: 'UB', label: 'Upper Body', tooltip: 'Hip measurement' },
  { key: 'trousers_crotch', abbrev: 'Crotch', label: 'Crotch', tooltip: 'Crotch depth/rise' },
  { key: 'trousers_bottom', abbrev: 'Bottom', label: 'Bottom', tooltip: 'Trouser leg opening' },
  { key: 'trousers_nd', abbrev: 'ND', label: 'Knee Down', tooltip: 'Knee to ankle length' },
  { key: 'trousers_fl', abbrev: 'FL', label: 'Full Length', tooltip: 'Waist to ankle' },
  { key: 'trousers_nw', abbrev: 'NW', label: 'Narrow Width', tooltip: 'Narrow part width' },
  { key: 'trousers_join', abbrev: 'Join', label: 'Join', tooltip: 'Inseam join point' },
];

const TOP_FIELDS: MeasurementField[] = [
  { key: 'top_fl', abbrev: 'FL', label: 'Full Length', tooltip: 'Shoulder to hem' },
  { key: 'top_in_leg', abbrev: 'In Leg', label: 'In Leg', tooltip: 'Inside leg measurement' },
  { key: 'top_bust', abbrev: 'Bust', label: 'Bust', tooltip: 'Fullest part of bust' },
  { key: 'top_waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Natural waistline' },
  { key: 'top_hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Hip circumference' },
  { key: 'top_ch', abbrev: 'CH', label: 'Chest', tooltip: 'Chest measurement' },
];

const SKIRT_FIELDS: MeasurementField[] = [
  { key: 'skirt_fl', abbrev: 'FL', label: 'Full Length', tooltip: 'Waist to hem' },
  { key: 'skirt_sh', abbrev: 'SH', label: 'Short', tooltip: 'Short length option' },
  { key: 'skirt_knee', abbrev: 'Knee', label: 'Knee', tooltip: 'Knee length' },
  { key: 'skirt_hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Hip circumference' },
  { key: 'skirt_waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Waist circumference' },
];

const JACKET_FIELDS: MeasurementField[] = [
  { key: 'jacket_sh', abbrev: 'SH', label: 'Shoulder', tooltip: 'Shoulder width' },
  { key: 'jacket_bust', abbrev: 'Bust', label: 'Bust', tooltip: 'Bust measurement' },
  { key: 'jacket_hip', abbrev: 'Hip', label: 'Hip', tooltip: 'Hip measurement' },
  { key: 'jacket_sl', abbrev: 'SL', label: 'Sleeve Length', tooltip: 'Sleeve length' },
  { key: 'jacket_join', abbrev: 'Join', label: 'Join', tooltip: 'Join point' },
  { key: 'jacket_fl', abbrev: 'FL', label: 'Full Length', tooltip: 'Full jacket length' },
  { key: 'jacket_ub', abbrev: 'UB', label: 'Under Bust', tooltip: 'Under bust measurement' },
  { key: 'jacket_waist', abbrev: 'Waist', label: 'Waist', tooltip: 'Waist measurement' },
  { key: 'jacket_slit', abbrev: 'Slit', label: 'Slit', tooltip: 'Back slit length' },
];

const GARMENT_CATEGORIES = [
  { id: 'dress', label: 'Dress', fields: DRESS_FIELDS },
  { id: 'trousers', label: 'Trousers', fields: TROUSERS_FIELDS },
  { id: 'top', label: 'Top/Shirt', fields: TOP_FIELDS },
  { id: 'skirt', label: 'Skirt', fields: SKIRT_FIELDS },
  { id: 'jacket', label: 'Jacket', fields: JACKET_FIELDS },
];

// Helper to determine default tab based on design type
function getDefaultTab(designType?: string): string {
  if (!designType) return 'dress';
  const lower = designType.toLowerCase();
  if (lower.includes('trouser') || lower.includes('pant')) return 'trousers';
  if (lower.includes('shirt') || lower.includes('blouse') || lower.includes('top')) return 'top';
  if (lower.includes('skirt')) return 'skirt';
  if (lower.includes('jacket') || lower.includes('blazer') || lower.includes('suit')) return 'jacket';
  if (lower.includes('dress') || lower.includes('gown')) return 'dress';
  return 'dress';
}

// Count filled measurements per category
function countFilledMeasurements(measurements: Measurements, categoryId: string): number {
  const category = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return 0;
  return category.fields.filter(f => measurements[f.key] && measurements[f.key]! > 0).length;
}

export function GarmentMeasurementsForm({ measurements, onChange, designType }: GarmentMeasurementsFormProps) {
  const [activeTab, setActiveTab] = useState(getDefaultTab(designType));

  const handleChange = (key: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({ ...measurements, [key]: numValue });
  };

  const renderMeasurementField = (field: MeasurementField) => (
    <div key={field.key} className="space-y-1">
      <div className="flex items-center gap-1">
        <Label htmlFor={field.key} className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="font-semibold text-foreground">{field.abbrev}</span>
          <span className="hidden sm:inline">- {field.label}</span>
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">{field.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative">
        <Input
          id={field.key}
          type="number"
          step="0.5"
          placeholder="cm"
          value={measurements[field.key] ?? ''}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="h-9 text-sm pr-8"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          cm
        </span>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 mb-4">
          {GARMENT_CATEGORIES.map(category => {
            const filledCount = countFilledMeasurements(measurements, category.id);
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="relative text-xs sm:text-sm"
              >
                {category.label}
                {filledCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-emerald-100 text-emerald-700 border-emerald-200"
                  >
                    {filledCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GARMENT_CATEGORIES.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {category.fields.map(renderMeasurementField)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </TooltipProvider>
  );
}

export type { Measurements as GarmentMeasurements };
