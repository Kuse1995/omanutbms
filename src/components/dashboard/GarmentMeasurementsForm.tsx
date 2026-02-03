import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Info, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DODO_WEAR_MEASUREMENTS, MEASUREMENT_GROUPS, type DodoMeasurementField } from "@/lib/dodo-wear-measurements";
import { parseFractionInput, formatMeasurementValue } from "@/lib/fraction-parser";
import { CustomMeasurementsSection, CustomMeasurement } from "./CustomMeasurementsSection";

type MeasurementUnit = 'cm' | 'in';

interface Measurements {
  // Dodo Wear Standard Measurements
  shoulder?: number;
  bust?: number;
  chest?: number;
  under_bust?: number;
  waist?: number;
  hip?: number;
  sleeve_length?: number;
  cuff?: number;
  join?: number;
  arm_height?: number;
  collar?: number;
  neck?: number;
  full_length?: number;
  knee_down?: number;
  knee?: number;
  wideness?: number;
  crotch?: number;
  in_leg?: number;
  thigh?: number;
  bottom?: number;
  slit?: number;
  narrow_width?: number;
  
  // Legacy garment-specific fields (for backward compatibility)
  dress_fl?: number;
  dress_sh?: number;
  dress_hip?: number;
  dress_ub?: number;
  dress_waist?: number;
  dress_sl?: number;
  dress_cuff?: number;
  dress_join?: number;
  trousers_waist?: number;
  trousers_wideness?: number;
  trousers_ub?: number;
  trousers_crotch?: number;
  trousers_bottom?: number;
  trousers_nd?: number;
  trousers_fl?: number;
  trousers_nw?: number;
  trousers_join?: number;
  top_fl?: number;
  top_in_leg?: number;
  top_bust?: number;
  top_waist?: number;
  top_hip?: number;
  top_ch?: number;
  shirt_fl?: number;
  shirt_sh?: number;
  shirt_hip?: number;
  shirt_chest?: number;
  shirt_sl?: number;
  shirt_nw?: number;
  shirt_join?: number;
  shirt_collar?: number;
  skirt_fl?: number;
  skirt_sh?: number;
  skirt_knee?: number;
  skirt_hip?: number;
  skirt_waist?: number;
  jacket_sh?: number;
  jacket_bust?: number;
  jacket_hip?: number;
  jacket_sl?: number;
  jacket_join?: number;
  jacket_fl?: number;
  jacket_ub?: number;
  jacket_waist?: number;
  jacket_slit?: number;
  
  // Store the unit used for input
  _unit?: MeasurementUnit;
  
  // Custom measurements array
  custom_measurements?: CustomMeasurement[];
  
  [key: string]: number | string | MeasurementUnit | CustomMeasurement[] | undefined;
}

// Helper to serialize measurements for database storage
export function serializeMeasurementsForStorage(measurements: Measurements): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(measurements)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  
  return result;
}

interface GarmentMeasurementsFormProps {
  measurements: Measurements;
  onChange: (measurements: Measurements) => void;
  designType?: string;
  showValidation?: boolean;
}

// Conversion functions
const cmToInches = (cm: number): number => Math.round((cm / 2.54) * 100) / 100;
const inchesToCm = (inches: number): number => Math.round((inches * 2.54) * 100) / 100;

// Count filled Dodo Wear measurements
function countFilledDodoMeasurements(measurements: Measurements): number {
  return DODO_WEAR_MEASUREMENTS.filter(m => {
    const val = measurements[m.key];
    return val !== undefined && val !== null && Number(val) > 0;
  }).length;
}

// Check if all mandatory Dodo measurements are complete
export function isDodoMeasurementsComplete(measurements: Measurements): boolean {
  return countFilledDodoMeasurements(measurements) === DODO_WEAR_MEASUREMENTS.length;
}

// Get missing Dodo measurements
export function getMissingDodoMeasurements(measurements: Measurements): string[] {
  return DODO_WEAR_MEASUREMENTS
    .filter(m => !measurements[m.key] || Number(measurements[m.key]) <= 0)
    .map(m => m.label);
}

// Legacy exports for backward compatibility
export function isGarmentCategoryComplete(measurements: Measurements, _categoryId: string): boolean {
  return isDodoMeasurementsComplete(measurements);
}

export function getMissingMeasurements(measurements: Measurements, _categoryId: string): string[] {
  return getMissingDodoMeasurements(measurements);
}

export function getDefaultTab(_designType?: string): string {
  return 'upper_body';
}

export function GarmentMeasurementsForm({ measurements, onChange, showValidation = false }: GarmentMeasurementsFormProps) {
  const [unit, setUnit] = useState<MeasurementUnit>((measurements._unit as MeasurementUnit) || 'cm');
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  
  // Track raw input values for fraction support
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const handleUnitToggle = (newUnit: MeasurementUnit) => {
    setUnit(newUnit);
    onChange({ ...measurements, _unit: newUnit });
  };

  // Handle input change (store raw value for fraction support)
  const handleInputChange = (key: string, inputValue: string) => {
    setRawInputs(prev => ({ ...prev, [key]: inputValue }));
  };

  // Handle blur - parse and store value
  const handleInputBlur = (key: string) => {
    const rawValue = rawInputs[key];
    if (rawValue !== undefined) {
      const parsedValue = parseFractionInput(rawValue);
      const storedValue = parsedValue !== undefined && unit === 'in' ? inchesToCm(parsedValue) : parsedValue;
      onChange({ ...measurements, [key]: storedValue, _unit: unit });
      
      // Update raw input to show parsed value
      if (parsedValue !== undefined) {
        setRawInputs(prev => ({ ...prev, [key]: formatMeasurementValue(parsedValue) }));
      }
    }
    setHighlightedKey(null);
  };

  // Get display value
  const getDisplayValue = (key: string): string => {
    // If we have a raw input, show that (allows typing fractions)
    if (rawInputs[key] !== undefined) {
      return rawInputs[key];
    }
    const value = measurements[key] as number | undefined;
    if (value === undefined) return '';
    const displayVal = unit === 'in' ? cmToInches(value) : value;
    return formatMeasurementValue(displayVal);
  };

  // Handle custom measurements change
  const handleCustomMeasurementsChange = (customMeasurements: CustomMeasurement[]) => {
    onChange({ ...measurements, custom_measurements: customMeasurements });
  };

  const filledCount = useMemo(() => countFilledDodoMeasurements(measurements), [measurements]);
  const totalCount = DODO_WEAR_MEASUREMENTS.length;
  const isComplete = filledCount === totalCount;

  // Get tooltip info for highlighted field
  const highlightedField = useMemo(() => {
    if (!highlightedKey) return null;
    return DODO_WEAR_MEASUREMENTS.find(m => m.key === highlightedKey);
  }, [highlightedKey]);

  const renderMeasurementField = (field: DodoMeasurementField) => {
    const hasValue = measurements[field.key] && Number(measurements[field.key]) > 0;
    const isActive = highlightedKey === field.key;
    const showError = showValidation && !hasValue;
    
    return (
      <div
        key={field.key}
        className={cn(
          "flex items-center gap-2 sm:gap-3 p-3 sm:p-2.5 rounded-lg border transition-all duration-200",
          isActive 
            ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
            : "bg-card border-border hover:border-primary/20",
          showError && "border-destructive/50"
        )}
      >
        {/* Check/abbreviation badge */}
        <div 
          className={cn(
            "w-11 h-9 sm:w-12 sm:h-8 rounded flex items-center justify-center text-xs font-bold transition-colors shrink-0",
            hasValue 
              ? "bg-emerald-600 text-white" 
              : isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          )}
        >
          {hasValue ? <Check className="h-4 w-4" /> : field.abbrev}
        </div>
        
        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-sm truncate",
              isActive ? "font-medium text-foreground" : "text-foreground",
              showError && "text-destructive"
            )}>
              {field.label}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/50 cursor-help shrink-0 hidden sm:block" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs">{field.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Input with fraction support */}
        <div className="relative w-20 sm:w-24 shrink-0">
          <Input
            id={`dodo-${field.key}`}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 45/2"
            value={getDisplayValue(field.key)}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            onFocus={() => setHighlightedKey(field.key)}
            onBlur={() => handleInputBlur(field.key)}
            className={cn(
              "h-10 sm:h-8 text-sm text-right pr-7 sm:pr-8",
              isActive && "ring-2 ring-primary border-primary",
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
        {/* Unit Toggle & Progress - Sticky on mobile */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-1 px-1 sm:static sm:bg-transparent sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden sm:inline">Unit:</span>
              <div className="flex rounded-md border">
                <Button
                  type="button"
                  variant={unit === 'cm' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-9 sm:h-8 px-4 sm:px-3"
                  onClick={() => handleUnitToggle('cm')}
                >
                  cm
                </Button>
                <Button
                  type="button"
                  variant={unit === 'in' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none h-9 sm:h-8 px-4 sm:px-3"
                  onClick={() => handleUnitToggle('in')}
                >
                  in
                </Button>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              {isComplete ? (
                <Badge variant="default" className="bg-emerald-600 h-7">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : (
                <Badge variant="secondary" className="h-7">
                  {filledCount}/{totalCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Measurement Groups */}
        <div className="space-y-5">
          {MEASUREMENT_GROUPS.map((group) => {
            const groupFilledCount = group.fields.filter(f => 
              measurements[f.key] && Number(measurements[f.key]) > 0
            ).length;
            
            return (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {groupFilledCount}/{group.fields.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.fields.map(renderMeasurementField)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlighted instruction card */}
        {highlightedField && (
          <Card className="p-3 bg-primary/5 border-primary/20 animate-in fade-in-50 duration-200">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {highlightedField.abbrev}
              </Badge>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {highlightedField.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {highlightedField.tooltip}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Custom measurements section */}
        <div className="pt-4 border-t">
          <CustomMeasurementsSection
            customMeasurements={measurements.custom_measurements || []}
            onChange={handleCustomMeasurementsChange}
            unit={unit}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export type { Measurements as GarmentMeasurements };
export { MEASUREMENT_GROUPS };
