import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MeasurementUnit = 'cm' | 'in';

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
  
  // Store the unit used for input
  _unit?: MeasurementUnit;
  
  [key: string]: number | MeasurementUnit | undefined;
}

interface GarmentMeasurementsFormProps {
  measurements: Measurements;
  onChange: (measurements: Measurements) => void;
  designType?: string;
  showValidation?: boolean;
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

// Conversion functions
const cmToInches = (cm: number): number => Math.round((cm / 2.54) * 100) / 100;
const inchesToCm = (inches: number): number => Math.round((inches * 2.54) * 100) / 100;

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
  return category.fields.filter(f => measurements[f.key] && (measurements[f.key] as number) > 0).length;
}

// Get total fields for a category
function getTotalFields(categoryId: string): number {
  const category = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  return category?.fields.length || 0;
}

// Check if all measurements in active category are complete
export function isGarmentCategoryComplete(measurements: Measurements, categoryId: string): boolean {
  const category = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return false;
  return category.fields.every(f => measurements[f.key] && (measurements[f.key] as number) > 0);
}

// Get missing measurements for a category
export function getMissingMeasurements(measurements: Measurements, categoryId: string): string[] {
  const category = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return [];
  return category.fields
    .filter(f => !measurements[f.key] || (measurements[f.key] as number) <= 0)
    .map(f => f.label);
}

export function GarmentMeasurementsForm({ measurements, onChange, designType, showValidation = false }: GarmentMeasurementsFormProps) {
  const [activeTab, setActiveTab] = useState(getDefaultTab(designType));
  const [unit, setUnit] = useState<MeasurementUnit>((measurements._unit as MeasurementUnit) || 'cm');

  const handleChange = (key: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    // Store in cm internally, convert if needed
    const storedValue = numValue !== undefined && unit === 'in' ? inchesToCm(numValue) : numValue;
    onChange({ ...measurements, [key]: storedValue, _unit: unit });
  };

  const getDisplayValue = (key: string): string => {
    const value = measurements[key] as number | undefined;
    if (value === undefined || value === null) return '';
    // Convert from stored cm to display unit
    if (unit === 'in') {
      return cmToInches(value).toString();
    }
    return value.toString();
  };

  const handleUnitToggle = (newUnit: MeasurementUnit) => {
    setUnit(newUnit);
    onChange({ ...measurements, _unit: newUnit });
  };

  const activeCategory = GARMENT_CATEGORIES.find(c => c.id === activeTab);
  const filledCount = countFilledMeasurements(measurements, activeTab);
  const totalCount = getTotalFields(activeTab);
  const isComplete = filledCount === totalCount;

  const renderMeasurementField = (field: MeasurementField) => {
    const hasValue = measurements[field.key] && (measurements[field.key] as number) > 0;
    const showError = showValidation && !hasValue;
    
    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center gap-1">
          <Label htmlFor={field.key} className="text-xs text-muted-foreground flex items-center gap-1">
            <span className={cn("font-semibold", showError ? "text-destructive" : "text-foreground")}>
              {field.abbrev}
            </span>
            <span className="hidden sm:inline">- {field.label}</span>
            {showError && <span className="text-destructive">*</span>}
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
            step={unit === 'in' ? '0.25' : '0.5'}
            min="0"
            placeholder={unit}
            value={getDisplayValue(field.key)}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={cn(
              "h-9 text-sm pr-10",
              showError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Unit Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Unit:</span>
            <div className="flex rounded-md border">
              <Button
                type="button"
                variant={unit === 'cm' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none h-8 px-3"
                onClick={() => handleUnitToggle('cm')}
              >
                Centimeters (cm)
              </Button>
              <Button
                type="button"
                variant={unit === 'in' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none h-8 px-3"
                onClick={() => handleUnitToggle('in')}
              >
                Inches (in)
              </Button>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Badge variant="default" className="bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="secondary">
                {filledCount}/{totalCount} filled
              </Badge>
            )}
          </div>
        </div>

        {showValidation && !isComplete && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Please complete all measurements</p>
              <p className="text-xs mt-1">
                Missing: {getMissingMeasurements(measurements, activeTab).join(', ')}
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 mb-4">
            {GARMENT_CATEGORIES.map(category => {
              const filled = countFilledMeasurements(measurements, category.id);
              const total = getTotalFields(category.id);
              const complete = filled === total && total > 0;
              return (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="relative text-xs sm:text-sm"
                >
                  {category.label}
                  {filled > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center",
                        complete 
                          ? "bg-emerald-600 text-white border-emerald-700" 
                          : "bg-emerald-100 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {complete ? '✓' : filled}
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
      </div>
    </TooltipProvider>
  );
}

export type { Measurements as GarmentMeasurements };
export { GARMENT_CATEGORIES, getDefaultTab };
