import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, Percent, Lock } from "lucide-react";

interface PricingBreakdownProps {
  materialCost: number;
  laborCost: number;
  marginPercentage: number;
  onMarginChange: (margin: number) => void;
  isLocked?: boolean;
}

export function PricingBreakdown({
  materialCost,
  laborCost,
  marginPercentage,
  onMarginChange,
  isLocked = false,
}: PricingBreakdownProps) {
  const baseCost = materialCost + laborCost;
  const marginAmount = baseCost * (marginPercentage / 100);
  const quotedPrice = baseCost + marginAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        Price Breakdown
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Material Cost</span>
          <span>K {materialCost.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Labor Cost</span>
          <span>K {laborCost.toFixed(2)}</span>
        </div>

        <Separator />

        <div className="flex justify-between text-sm font-medium">
          <span>Base Cost</span>
          <span>K {baseCost.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Company Margin</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="5"
              min="0"
              max="100"
              value={marginPercentage}
              onChange={(e) => onMarginChange(parseFloat(e.target.value) || 0)}
              className="h-8 w-20 text-center text-sm"
              disabled={isLocked}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex justify-between text-sm text-emerald-600">
          <span>Margin Amount</span>
          <span>+ K {marginAmount.toFixed(2)}</span>
        </div>

        <Separator className="my-2" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">Quoted Price</span>
            {isLocked && (
              <Lock className="h-4 w-4 text-amber-600" />
            )}
          </div>
          <span className="text-2xl font-bold text-primary">
            K {quotedPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {isLocked && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Price is locked and cannot be modified.
        </p>
      )}
    </div>
  );
}

export function calculateQuote(
  materialCost: number,
  laborCost: number,
  marginPercentage: number
) {
  const baseCost = materialCost + laborCost;
  const marginAmount = baseCost * (marginPercentage / 100);
  const quotedPrice = baseCost + marginAmount;
  return { baseCost, marginAmount, quotedPrice };
}
