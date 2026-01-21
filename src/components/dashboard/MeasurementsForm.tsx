import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Measurements {
  chest?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  arm_length?: number;
  inseam?: number;
  outseam?: number;
  neck?: number;
  back_length?: number;
  thigh?: number;
  calf?: number;
  wrist?: number;
  [key: string]: number | undefined;
}

interface MeasurementsFormProps {
  measurements: Measurements;
  onChange: (measurements: Measurements) => void;
  compact?: boolean;
}

const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest', placeholder: 'cm' },
  { key: 'bust', label: 'Bust', placeholder: 'cm' },
  { key: 'waist', label: 'Waist', placeholder: 'cm' },
  { key: 'hips', label: 'Hips', placeholder: 'cm' },
  { key: 'shoulder', label: 'Shoulder Width', placeholder: 'cm' },
  { key: 'arm_length', label: 'Arm Length', placeholder: 'cm' },
  { key: 'inseam', label: 'Inseam', placeholder: 'cm' },
  { key: 'outseam', label: 'Outseam', placeholder: 'cm' },
  { key: 'neck', label: 'Neck', placeholder: 'cm' },
  { key: 'back_length', label: 'Back Length', placeholder: 'cm' },
  { key: 'thigh', label: 'Thigh', placeholder: 'cm' },
  { key: 'calf', label: 'Calf', placeholder: 'cm' },
  { key: 'wrist', label: 'Wrist', placeholder: 'cm' },
];

export function MeasurementsForm({ measurements, onChange, compact = false }: MeasurementsFormProps) {
  const handleChange = (key: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({ ...measurements, [key]: numValue });
  };

  const gridClass = compact 
    ? "grid grid-cols-3 md:grid-cols-4 gap-3" 
    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      {MEASUREMENT_FIELDS.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label htmlFor={field.key} className="text-xs text-muted-foreground">
            {field.label}
          </Label>
          <Input
            id={field.key}
            type="number"
            step="0.1"
            placeholder={field.placeholder}
            value={measurements[field.key] ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      ))}
    </div>
  );
}

export type { Measurements };
