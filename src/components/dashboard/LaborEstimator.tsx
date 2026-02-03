import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Sparkles, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SkillLevel = "Junior" | "Senior" | "Master";

const DEFAULT_RATES: Record<SkillLevel, number> = {
  Junior: 45,
  Senior: 75,
  Master: 100,
};

interface LaborEstimatorProps {
  hours: number;
  skillLevel: SkillLevel;
  hourlyRate: number;
  tailorId: string | null;
  onHoursChange: (hours: number) => void;
  onSkillLevelChange: (level: SkillLevel) => void;
  onHourlyRateChange: (rate: number) => void;
  onTailorChange: (tailorId: string | null) => void;
  designType: string;
  styleNotes: string;
  fabric: string;
}

interface TailorOption {
  id: string;
  full_name: string;
  skill_level: SkillLevel | null;
  hourly_rate: number | null;
}

export function LaborEstimator({
  hours,
  skillLevel,
  hourlyRate,
  tailorId,
  onHoursChange,
  onSkillLevelChange,
  onHourlyRateChange,
  onTailorChange,
  designType,
  styleNotes,
  fabric,
}: LaborEstimatorProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [tailors, setTailors] = useState<TailorOption[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  useEffect(() => {
    const fetchTailors = async () => {
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, hourly_rate")
        .eq("tenant_id", tenantId)
        .eq("employment_status", "active")
        .order("full_name");

      if (!error && data) {
        // Map data to TailorOption, skill_level will be fetched separately or default
        setTailors(data.map(e => ({
          ...e,
          skill_level: null, // Will use default rates
        })) as TailorOption[]);
      }
    };

    fetchTailors();
  }, [tenantId]);

  const handleTailorSelect = (id: string) => {
    if (id === "none") {
      onTailorChange(null);
      return;
    }
    
    const tailor = tailors.find((t) => t.id === id);
    if (tailor) {
      onTailorChange(tailor.id);
      if (tailor.skill_level) {
        onSkillLevelChange(tailor.skill_level);
      }
      if (tailor.hourly_rate) {
        onHourlyRateChange(tailor.hourly_rate);
      } else {
        onHourlyRateChange(DEFAULT_RATES[tailor.skill_level || "Senior"]);
      }
    }
  };

  const handleSkillLevelChange = (level: SkillLevel) => {
    onSkillLevelChange(level);
    // Update rate if no specific tailor is selected
    if (!tailorId) {
      onHourlyRateChange(DEFAULT_RATES[level]);
    }
  };

  const handleAutoEstimate = async () => {
    if (!designType && !styleNotes) {
      toast({
        title: "Missing Information",
        description: "Please add design details first to get AI estimates.",
        variant: "destructive",
      });
      return;
    }

    setIsEstimating(true);
    setAiReasoning(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estimate-design-labor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ designType, styleNotes, fabric }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get estimate");
      }

      const estimate = await response.json();

      onHoursChange(estimate.suggestedHours);
      onSkillLevelChange(estimate.suggestedSkillLevel);
      onHourlyRateChange(DEFAULT_RATES[estimate.suggestedSkillLevel as SkillLevel]);
      setAiReasoning(estimate.reasoning);

      toast({
        title: "AI Estimate Applied",
        description: `${estimate.suggestedHours} hours with ${estimate.suggestedSkillLevel} tailor recommended.`,
      });
    } catch (error: any) {
      console.error("Estimation error:", error);
      toast({
        title: "Estimation Failed",
        description: error.message || "Could not generate AI estimate.",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const laborTotal = hours * hourlyRate;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Label className="text-sm font-medium">Labor Estimation</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoEstimate}
          disabled={isEstimating}
          className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 hover:from-amber-100 hover:to-amber-200 w-full sm:w-auto"
        >
          {isEstimating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1 text-amber-600" />
          )}
          Auto-Estimate from Design
        </Button>
      </div>

      {aiReasoning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Sparkles className="h-4 w-4 inline mr-1" />
          {aiReasoning}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tailor" className="text-xs text-muted-foreground">
            Assign Tailor (Optional)
          </Label>
          <Select
            value={tailorId || "none"}
            onValueChange={handleTailorSelect}
          >
            <SelectTrigger className="h-10 sm:h-9 mt-1">
              <SelectValue placeholder="Select tailor..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  No specific tailor
                </span>
              </SelectItem>
              {tailors.map((tailor) => (
                <SelectItem key={tailor.id} value={tailor.id}>
                  <span className="flex items-center gap-2">
                    <span>{tailor.full_name}</span>
                    {tailor.skill_level && (
                      <span className="text-xs text-muted-foreground">
                        ({tailor.skill_level})
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="skillLevel" className="text-xs text-muted-foreground">
            Tailor Grade
          </Label>
          <Select
            value={skillLevel}
            onValueChange={(v) => handleSkillLevelChange(v as SkillLevel)}
          >
            <SelectTrigger className="h-10 sm:h-9 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Junior">Junior (K45/hr)</SelectItem>
              <SelectItem value="Senior">Senior (K75/hr)</SelectItem>
              <SelectItem value="Master">Master (K100/hr)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="hours" className="text-xs text-muted-foreground">
            Estimated Hours
          </Label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            min="0"
            inputMode="decimal"
            value={hours || ""}
            onChange={(e) => onHoursChange(parseFloat(e.target.value) || 0)}
            className="h-10 sm:h-9 mt-1"
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="rate" className="text-xs text-muted-foreground">
            Hourly Rate (K)
          </Label>
          <Input
            id="rate"
            type="number"
            step="5"
            min="0"
            inputMode="decimal"
            value={hourlyRate || ""}
            onChange={(e) => onHourlyRateChange(parseFloat(e.target.value) || 0)}
            className="h-10 sm:h-9 mt-1"
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <div className="text-sm">
          <span className="text-muted-foreground">Labor Total: </span>
          <span className="font-semibold">K {laborTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export type { SkillLevel };
