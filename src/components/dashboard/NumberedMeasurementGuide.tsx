import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { NumberedBodySVG } from "./mannequin/NumberedBodySVG";
import { NUMBERED_MEASUREMENTS, getMeasurementByNumber } from "@/lib/numbered-measurements";
import { Check, AlertCircle } from "lucide-react";

interface NumberedMeasurementGuideProps {
  measurements: Record<string, number | undefined>;
  onChange: (key: string, value: number | undefined) => void;
  unit?: 'cm' | 'in';
  className?: string;
  highlightedNumber?: number | null;
  onHighlightChange?: (number: number | null) => void;
}

export function NumberedMeasurementGuide({
  measurements,
  onChange,
  unit = 'cm',
  className,
  highlightedNumber,
  onHighlightChange,
}: NumberedMeasurementGuideProps) {
  const [localHighlight, setLocalHighlight] = useState<number | null>(null);
  const activeHighlight = highlightedNumber ?? localHighlight;

  const handleNumberClick = (num: number) => {
    const measurement = getMeasurementByNumber(num);
    if (measurement) {
      // Focus the input for this measurement
      const input = document.getElementById(`measurement-${measurement.key}`);
      input?.focus();
    }
  };

  const handleInputFocus = (num: number) => {
    setLocalHighlight(num);
    onHighlightChange?.(num);
  };

  const handleInputBlur = () => {
    setLocalHighlight(null);
    onHighlightChange?.(null);
  };

  const handleValueChange = (key: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange(key, numValue);
  };

  // Calculate completion
  const filledCount = useMemo(() => {
    return NUMBERED_MEASUREMENTS.filter(m => 
      measurements[m.key] !== undefined && measurements[m.key]! > 0
    ).length;
  }, [measurements]);

  const totalCount = NUMBERED_MEASUREMENTS.length;
  const isComplete = filledCount === totalCount;

  // Get instruction for highlighted measurement
  const instruction = useMemo(() => {
    if (!activeHighlight) return null;
    return getMeasurementByNumber(activeHighlight);
  }, [activeHighlight]);

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Left side: Numbered list with inputs */}
      <div className="flex-1 lg:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Measurements</h3>
          {isComplete ? (
            <Badge className="bg-emerald-600">
              <Check className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="secondary">
              {filledCount}/{totalCount} filled
            </Badge>
          )}
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {NUMBERED_MEASUREMENTS.map((m) => {
              const value = measurements[m.key];
              const hasValue = value !== undefined && value > 0;
              const isActive = activeHighlight === m.number;
              
              return (
                <div
                  key={m.key}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                    isActive && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  {/* Number badge */}
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      hasValue 
                        ? "bg-emerald-600 text-white" 
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {hasValue ? <Check className="h-3.5 w-3.5" /> : m.number}
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {m.label}
                  </span>
                  
                  {/* Input */}
                  <div className="relative w-20">
                    <Input
                      id={`measurement-${m.key}`}
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="—"
                      value={value ?? ''}
                      onChange={(e) => handleValueChange(m.key, e.target.value)}
                      onFocus={() => handleInputFocus(m.number)}
                      onBlur={handleInputBlur}
                      className={cn(
                        "h-8 text-sm text-right pr-8",
                        isActive && "ring-2 ring-primary"
                      )}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right side: Mannequin diagrams */}
      <div className="flex-1">
        <div className="sticky top-4">
          <h3 className="text-sm font-semibold text-foreground text-center mb-4">
            Measurement Guide
          </h3>
          
          {/* Dual view: Front and Back */}
          <div className="flex gap-2 justify-center">
            <div className="w-[140px]">
              <NumberedBodySVG 
                view="front"
                highlightedNumber={activeHighlight}
                onNumberClick={handleNumberClick}
              />
            </div>
            <div className="w-[140px]">
              <NumberedBodySVG 
                view="back"
                highlightedNumber={activeHighlight}
                onNumberClick={handleNumberClick}
              />
            </div>
          </div>

          {/* Instruction card */}
          {instruction ? (
            <Card className="mt-4 p-3 bg-primary/5 border-primary/20 animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  #{instruction.number}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {instruction.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {instruction.instruction}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="mt-4 p-3 bg-muted/30 border-muted">
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Click a number or focus an input to see instructions
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export { NUMBERED_MEASUREMENTS };
