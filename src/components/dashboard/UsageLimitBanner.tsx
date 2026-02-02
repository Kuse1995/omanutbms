import { useState } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddonPurchaseModal } from "./AddonPurchaseModal";

interface AddonDefinition {
  id: string;
  addon_key: string;
  display_name: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  unit_price: number | null;
  unit_label: string | null;
  pricing_type: string;
  icon: string | null;
}

interface UsageLimitBannerProps {
  resourceName: string;
  currentUsage: number;
  limit: number;
  addon?: AddonDefinition;
  onDismiss?: () => void;
}

export function UsageLimitBanner({ 
  resourceName, 
  currentUsage, 
  limit, 
  addon,
  onDismiss 
}: UsageLimitBannerProps) {
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const percentUsed = Math.round((currentUsage / limit) * 100);
  const isNearLimit = percentUsed >= 80;
  const isAtLimit = currentUsage >= limit;

  if (dismissed || !isNearLimit) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <>
      <div className={`flex items-center justify-between p-3 rounded-lg mb-4 ${
        isAtLimit 
          ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" 
          : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
      }`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
            isAtLimit ? "text-red-500" : "text-amber-500"
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              isAtLimit ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
            }`}>
              {isAtLimit 
                ? `${resourceName} limit reached` 
                : `Approaching ${resourceName.toLowerCase()} limit`
              }
            </p>
            <p className="text-xs text-muted-foreground">
              You've used {currentUsage.toLocaleString()} of {limit.toLocaleString()} {resourceName.toLowerCase()}
              {!isAtLimit && ` (${percentUsed}%)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {addon && (
            <Button 
              size="sm" 
              variant={isAtLimit ? "default" : "outline"}
              className="gap-1"
              onClick={() => setAddonModalOpen(true)}
            >
              Add more
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {addon && (
        <AddonPurchaseModal
          open={addonModalOpen}
          onOpenChange={setAddonModalOpen}
          addon={addon}
        />
      )}
    </>
  );
}
