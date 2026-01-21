import { useState } from "react";
import { Check, AlertTriangle, Scissors, Ruler, Eye, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface QCCheckItem {
  id: string;
  label: string;
  description: string;
  category: "fabric" | "measurements" | "construction" | "finishing";
  required: boolean;
  checked: boolean;
}

const DEFAULT_QC_CHECKS: Omit<QCCheckItem, "checked">[] = [
  // Fabric checks
  {
    id: "fabric_quality",
    label: "Fabric quality verified",
    description: "No defects, tears, or discoloration in the fabric",
    category: "fabric",
    required: true,
  },
  {
    id: "fabric_pattern",
    label: "Pattern alignment checked",
    description: "Patterns/prints properly aligned at seams",
    category: "fabric",
    required: false,
  },
  {
    id: "fabric_grain",
    label: "Grain line correct",
    description: "Fabric grain runs in proper direction",
    category: "fabric",
    required: true,
  },
  // Measurements checks
  {
    id: "measurements_verified",
    label: "Measurements double-checked",
    description: "All body measurements verified against order specs",
    category: "measurements",
    required: true,
  },
  {
    id: "ease_allowance",
    label: "Ease allowance included",
    description: "Proper ease added for comfort and movement",
    category: "measurements",
    required: true,
  },
  {
    id: "seam_allowance",
    label: "Seam allowances marked",
    description: "Consistent seam allowances throughout",
    category: "measurements",
    required: true,
  },
  // Construction checks
  {
    id: "cutting_complete",
    label: "All pieces cut",
    description: "All pattern pieces cut and labeled",
    category: "construction",
    required: true,
  },
  {
    id: "interfacing_applied",
    label: "Interfacing prepared",
    description: "Fusible interfacing cut and ready",
    category: "construction",
    required: false,
  },
  {
    id: "notches_marked",
    label: "Notches and marks visible",
    description: "All construction marks transferred to fabric",
    category: "construction",
    required: true,
  },
  // Pre-fitting checks
  {
    id: "basting_done",
    label: "Basting completed",
    description: "Initial basting/pinning done for fitting",
    category: "finishing",
    required: true,
  },
  {
    id: "fitting_scheduled",
    label: "Fitting appointment set",
    description: "Customer notified of fitting date/time",
    category: "finishing",
    required: false,
  },
];

interface QualityControlChecklistProps {
  checks: QCCheckItem[];
  onChecksChange: (checks: QCCheckItem[]) => void;
  qcNotes: string;
  onNotesChange: (notes: string) => void;
}

const CATEGORY_ICONS = {
  fabric: Scissors,
  measurements: Ruler,
  construction: Eye,
  finishing: ShieldCheck,
};

const CATEGORY_LABELS = {
  fabric: "Fabric Inspection",
  measurements: "Measurements",
  construction: "Construction Prep",
  finishing: "Pre-Fitting",
};

export function QualityControlChecklist({
  checks,
  onChecksChange,
  qcNotes,
  onNotesChange,
}: QualityControlChecklistProps) {
  const toggleCheck = (id: string) => {
    onChecksChange(
      checks.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const groupedChecks = checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, QCCheckItem[]>);

  const requiredCount = checks.filter((c) => c.required).length;
  const requiredCompleted = checks.filter((c) => c.required && c.checked).length;
  const allRequiredComplete = requiredCount === requiredCompleted;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn(
            "h-5 w-5",
            allRequiredComplete ? "text-emerald-600" : "text-amber-500"
          )} />
          <span className="font-medium">Quality Control</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={allRequiredComplete ? "default" : "secondary"} className={cn(
            allRequiredComplete && "bg-emerald-600"
          )}>
            {requiredCompleted}/{requiredCount} Required
          </Badge>
          {!allRequiredComplete && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </div>

      {/* Grouped checklists */}
      {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((category) => {
        const CategoryIcon = CATEGORY_ICONS[category];
        const categoryChecks = groupedChecks[category] || [];
        
        if (categoryChecks.length === 0) return null;

        const categoryComplete = categoryChecks.filter((c) => c.required).every((c) => c.checked);

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CategoryIcon className="h-4 w-4" />
              <span>{CATEGORY_LABELS[category]}</span>
              {categoryComplete && (
                <Check className="h-4 w-4 text-emerald-600 ml-auto" />
              )}
            </div>
            
            <div className="space-y-2 pl-6">
              {categoryChecks.map((check) => (
                <div
                  key={check.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-md transition-colors",
                    check.checked ? "bg-emerald-50" : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    id={check.id}
                    checked={check.checked}
                    onCheckedChange={() => toggleCheck(check.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <Label
                      htmlFor={check.id}
                      className={cn(
                        "text-sm font-medium cursor-pointer",
                        check.checked && "line-through text-muted-foreground"
                      )}
                    >
                      {check.label}
                      {check.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {check.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* QC Notes */}
      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="qcNotes" className="text-sm font-medium">
          QC Inspector Notes
        </Label>
        <Textarea
          id="qcNotes"
          value={qcNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Note any issues, adjustments needed, or special instructions for the tailor..."
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}

// Export default checks initializer
export function initializeQCChecks(): QCCheckItem[] {
  return DEFAULT_QC_CHECKS.map((c) => ({ ...c, checked: false }));
}
