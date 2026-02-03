import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DODO_WEAR_MEASUREMENTS, MEASUREMENT_GROUPS, type DodoMeasurementField } from "@/lib/dodo-wear-measurements";
import { parseFractionInput, formatMeasurementValue } from "@/lib/fraction-parser";

type MeasurementUnit = 'cm' | 'in';

interface Measurements {
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
  _unit?: MeasurementUnit;
  [key: string]: number | string | undefined;
}

interface MeasurementsFormProps {
  measurements: Measurements;
  onChange: (measurements: Measurements) => void;
  compact?: boolean;
}

// Conversion functions
const cmToInches = (cm: number): number => Math.round((cm / 2.54) * 100) / 100;
const inchesToCm = (inches: number): number => Math.round((inches * 2.54) * 100) / 100;

export function MeasurementsForm({ measurements, onChange, compact = false }: MeasurementsFormProps) {
  const [unit, setUnit] = useState<MeasurementUnit>((measurements._unit as MeasurementUnit) || 'cm');
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const handleUnitToggle = (newUnit: MeasurementUnit) => {
    setUnit(newUnit);
    onChange({ ...measurements, _unit: newUnit });
  };

  const handleInputChange = (key: string, inputValue: string) => {
    setRawInputs(prev => ({ ...prev, [key]: inputValue }));
  };

  const handleInputBlur = (key: string) => {
    const rawValue = rawInputs[key];
    if (rawValue !== undefined) {
      const parsedValue = parseFractionInput(rawValue);
      const storedValue = parsedValue !== undefined && unit === 'in' ? inchesToCm(parsedValue) : parsedValue;
      onChange({ ...measurements, [key]: storedValue, _unit: unit });
      
      if (parsedValue !== undefined) {
        setRawInputs(prev => ({ ...prev, [key]: formatMeasurementValue(parsedValue) }));
      }
    }
  };

  const getDisplayValue = (key: string): string => {
    if (rawInputs[key] !== undefined) {
      return rawInputs[key];
    }
    const value = measurements[key] as number | undefined;
    if (value === undefined) return '';
    const displayVal = unit === 'in' ? cmToInches(value) : value;
    return formatMeasurementValue(displayVal);
  };

  const filledCount = DODO_WEAR_MEASUREMENTS.filter(m => {
    const val = measurements[m.key];
    return val !== undefined && val !== null && Number(val) > 0;
  }).length;

  const totalCount = DODO_WEAR_MEASUREMENTS.length;
  const isComplete = filledCount === totalCount;

  const renderMeasurementField = (field: DodoMeasurementField) => {
    const hasValue = measurements[field.key] && Number(measurements[field.key]) > 0;
    
    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center gap-1">
          <Label htmlFor={field.key} className="text-xs text-muted-foreground flex items-center gap-1">
            <span className={cn("font-semibold", hasValue ? "text-emerald-600" : "text-foreground")}>
              {field.abbrev}
            </span>
            {!compact && <span className="hidden sm:inline">- {field.label}</span>}
            {hasValue && <Check className="h-3 w-3 text-emerald-600" />}
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
            type="text"
            inputMode="decimal"
            placeholder="e.g. 45/2"
            value={getDisplayValue(field.key)}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            onBlur={() => handleInputBlur(field.key)}
            className="h-8 text-sm pr-10"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
    );
  };

  const gridClass = compact 
    ? "grid grid-cols-3 md:grid-cols-4 gap-3" 
    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className="space-y-4">
      {/* Unit Toggle & Progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Unit:</span>
          <div className="flex rounded-md border">
            <Button
              type="button"
              variant={unit === 'cm' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none h-7 px-2 text-xs"
              onClick={() => handleUnitToggle('cm')}
            >
              cm
            </Button>
            <Button
              type="button"
              variant={unit === 'in' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none h-7 px-2 text-xs"
              onClick={() => handleUnitToggle('in')}
            >
              in
            </Button>
          </div>
        </div>
        
        {isComplete ? (
          <Badge variant="default" className="bg-emerald-600 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {filledCount}/{totalCount}
          </Badge>
        )}
      </div>

      {/* Measurement Groups */}
      {MEASUREMENT_GROUPS.map((group) => (
        <div key={group.id}>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            {group.label}
          </h4>
          <div className={gridClass}>
            {group.fields.map(renderMeasurementField)}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { Measurements };
