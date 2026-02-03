import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, Percent, Lock, Package, Wrench, Gift } from "lucide-react";

interface PricingBreakdownProps {
  materialCost: number;
  laborCost: number;
  additionalCost?: number;
  marginPercentage: number;
  onMarginChange: (margin: number) => void;
  isLocked?: boolean;
  showItemized?: boolean;
  materialItems?: { name: string; quantity: number; unitCost: number; unitOfMeasure: string }[];
  laborHours?: number;
  hourlyRate?: number;
  skillLevel?: string;
  additionalItems?: { description: string; quantity: number; unitPrice: number; itemType: string }[];
}

export function PricingBreakdown({
  materialCost,
  laborCost,
  additionalCost = 0,
  marginPercentage,
  onMarginChange,
  isLocked = false,
  showItemized = false,
  materialItems = [],
  laborHours = 0,
  hourlyRate = 0,
  skillLevel = "Senior",
  additionalItems = [],
}: PricingBreakdownProps) {
  const baseCost = materialCost + laborCost + additionalCost;
  const marginAmount = baseCost * (marginPercentage / 100);
  const quotedPrice = baseCost + marginAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        Price Breakdown
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {/* Materials Section */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Package className="h-3 w-3" />
              Material Cost
            </span>
            <span>K {materialCost.toFixed(2)}</span>
          </div>
          {showItemized && materialItems.length > 0 && (
            <div className="ml-5 space-y-0.5">
              {materialItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.name} ({item.quantity} {item.unitOfMeasure})</span>
                  <span>K {(item.quantity * item.unitCost).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labor Section */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Wrench className="h-3 w-3" />
              Labor Cost
            </span>
            <span>K {laborCost.toFixed(2)}</span>
          </div>
          {showItemized && laborHours > 0 && (
            <div className="ml-5 text-xs text-muted-foreground">
              {skillLevel} Tailor × {laborHours} hrs @ K{hourlyRate}/hr
            </div>
          )}
        </div>

        {/* Additional Costs Section */}
        {additionalCost > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Gift className="h-3 w-3" />
                Additional Costs
              </span>
              <span>K {additionalCost.toFixed(2)}</span>
            </div>
            {showItemized && additionalItems.length > 0 && (
              <div className="ml-5 space-y-0.5">
                {additionalItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.description} (×{item.quantity})</span>
                    <span>K {(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
  marginPercentage: number,
  additionalCost: number = 0
) {
  const baseCost = materialCost + laborCost + additionalCost;
  const marginAmount = baseCost * (marginPercentage / 100);
  const quotedPrice = baseCost + marginAmount;
  return { baseCost, marginAmount, quotedPrice };
}
