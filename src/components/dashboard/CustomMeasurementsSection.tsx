import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseFractionInput, formatMeasurementValue } from "@/lib/fraction-parser";

export interface CustomMeasurement {
  id: string;
  label: string;
  value: number | undefined;
}

interface CustomMeasurementsSectionProps {
  customMeasurements: CustomMeasurement[];
  onChange: (measurements: CustomMeasurement[]) => void;
  unit: 'cm' | 'in';
  className?: string;
}

export function CustomMeasurementsSection({
  customMeasurements,
  onChange,
  unit,
  className,
}: CustomMeasurementsSectionProps) {
  // Track raw input values for fraction support
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const handleAddMeasurement = () => {
    const newMeasurement: CustomMeasurement = {
      id: `custom-${Date.now()}`,
      label: '',
      value: undefined,
    };
    onChange([...customMeasurements, newMeasurement]);
  };

  const handleRemoveMeasurement = (id: string) => {
    onChange(customMeasurements.filter(m => m.id !== id));
    // Clean up raw input tracking
    const newRawInputs = { ...rawInputs };
    delete newRawInputs[id];
    setRawInputs(newRawInputs);
  };

  const handleLabelChange = (id: string, label: string) => {
    onChange(
      customMeasurements.map(m =>
        m.id === id ? { ...m, label } : m
      )
    );
  };

  const handleValueChange = (id: string, inputValue: string) => {
    // Store the raw input for display
    setRawInputs(prev => ({ ...prev, [id]: inputValue }));
  };

  const handleValueBlur = (id: string) => {
    const rawValue = rawInputs[id];
    if (rawValue !== undefined) {
      const parsedValue = parseFractionInput(rawValue);
      onChange(
        customMeasurements.map(m =>
          m.id === id ? { ...m, value: parsedValue } : m
        )
      );
      // Update raw input to show the parsed value
      if (parsedValue !== undefined) {
        setRawInputs(prev => ({ ...prev, [id]: formatMeasurementValue(parsedValue) }));
      }
    }
  };

  const getDisplayValue = (measurement: CustomMeasurement): string => {
    // If we have a raw input, show that (allows user to type fractions)
    if (rawInputs[measurement.id] !== undefined) {
      return rawInputs[measurement.id];
    }
    // Otherwise show the stored value
    return formatMeasurementValue(measurement.value);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          Custom Measurements
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddMeasurement}
          className="h-7 px-2 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {customMeasurements.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Add custom measurement fields for any additional measurements needed
        </p>
      ) : (
        <div className="space-y-2">
          {customMeasurements.map((measurement) => (
            <div
              key={measurement.id}
              className="flex items-center gap-2 p-2 bg-muted/30 rounded-md"
            >
              <Input
                type="text"
                placeholder="Label (e.g., Back Hip)"
                value={measurement.label}
                onChange={(e) => handleLabelChange(measurement.id, e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <div className="relative w-24">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 45 or 22/2"
                  value={getDisplayValue(measurement)}
                  onChange={(e) => handleValueChange(measurement.id, e.target.value)}
                  onBlur={() => handleValueBlur(measurement.id)}
                  className="h-8 text-sm pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {unit}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMeasurement(measurement.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
