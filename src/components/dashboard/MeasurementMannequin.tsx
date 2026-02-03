import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { UpperBodySVG } from "./mannequin/UpperBodySVG";
import { LowerBodySVG } from "./mannequin/LowerBodySVG";
import { FullBodySVG } from "./mannequin/FullBodySVG";
import { MEASUREMENT_AREA_MAP, getRegionForMeasurement } from "@/lib/measurement-areas";
import { cn } from "@/lib/utils";
import { Ruler } from "lucide-react";

export type MannequinType = 'upper' | 'lower' | 'full';

interface MeasurementMannequinProps {
  type: MannequinType;
  highlightedMeasurement?: string | null;
  onAreaClick?: (area: string) => void;
  className?: string;
  showInstructions?: boolean;
}

export function MeasurementMannequin({ 
  type, 
  highlightedMeasurement, 
  onAreaClick,
  className,
  showInstructions = true
}: MeasurementMannequinProps) {
  // Convert measurement key to region for highlighting
  const highlightedArea = useMemo(() => {
    if (!highlightedMeasurement) return null;
    return getRegionForMeasurement(highlightedMeasurement);
  }, [highlightedMeasurement]);

  // Get instruction for highlighted measurement
  const instruction = useMemo(() => {
    if (!highlightedMeasurement) return null;
    return MEASUREMENT_AREA_MAP[highlightedMeasurement] || null;
  }, [highlightedMeasurement]);

  const renderSVG = () => {
    const props = {
      highlightedArea,
      onAreaClick,
    };

    switch (type) {
      case 'lower':
        return <LowerBodySVG {...props} />;
      case 'full':
        return <FullBodySVG {...props} />;
      case 'upper':
      default:
        return <UpperBodySVG {...props} />;
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Ruler className="h-4 w-4" />
        <span className="font-medium">Measurement Guide</span>
      </div>
      
      {/* SVG Container */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        {renderSVG()}
      </div>
      
      {/* Instruction Card */}
      {showInstructions && instruction && (
        <Card className="w-full p-3 bg-primary/5 border-primary/20 animate-in fade-in-50 duration-200">
          <p className="text-sm font-medium text-foreground">
            {instruction.description}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {instruction.instruction}
          </p>
        </Card>
      )}
      
      {/* Default state when nothing is highlighted */}
      {showInstructions && !instruction && (
        <Card className="w-full p-3 bg-muted/30 border-muted">
          <p className="text-xs text-muted-foreground text-center">
            Hover over a measurement field to see where to measure
          </p>
        </Card>
      )}
    </div>
  );
}

// Export helper to determine mannequin type from garment category
export function getMannequinTypeForCategory(category: string): MannequinType {
  switch (category) {
    case 'trousers':
      return 'lower';
    case 'skirt':
      return 'lower';
    case 'dress':
      return 'full';
    case 'jacket':
      return 'full';
    case 'top':
    case 'shirt':
    default:
      return 'upper';
  }
}
