import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface LowStockVariant {
  id: string;
  productName: string;
  variantType: string;
  variantValue: string;
  hexCode?: string;
  stock: number;
}

export function VariantLowStockAlerts() {
  const [lowStockVariants, setLowStockVariants] = useState<LowStockVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenantId } = useTenant();
  const { businessType } = useBusinessConfig();

  // Only show for fashion business type
  const isFashion = businessType === "fashion";

  useEffect(() => {
    if (!tenantId || !isFashion) {
      setIsLoading(false);
      return;
    }

    const fetchLowStockVariants = async () => {
      try {
        const { data, error } = await supabase
          .from("product_variants")
          .select(`
            id,
            variant_type,
            variant_value,
            hex_code,
            stock,
            inventory:product_id (name)
          `)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .lt("stock", 5) // Low stock threshold
          .order("stock", { ascending: true })
          .limit(10);

        if (error) throw error;

        const variants: LowStockVariant[] = (data || []).map((v: any) => ({
          id: v.id,
          productName: v.inventory?.name || "Unknown",
          variantType: v.variant_type,
          variantValue: v.variant_value,
          hexCode: v.hex_code,
          stock: v.stock ?? 0,
        }));

        setLowStockVariants(variants);
      } catch (error) {
        console.error("Error fetching low stock variants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowStockVariants();

    // Set up real-time subscription
    const channel = supabase
      .channel("variant-stock-alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_variants",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => fetchLowStockVariants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, isFashion]);

  if (!isFashion) return null;
  if (isLoading) return null;

  const criticalVariants = lowStockVariants.filter((v) => v.stock === 0);
  const warningVariants = lowStockVariants.filter((v) => v.stock > 0 && v.stock < 5);

  if (lowStockVariants.length === 0) {
    return (
      <Card className="bg-emerald-50 border-emerald-200 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-emerald-700 flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5" />
            Variant Stock Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-600">
            All size and color variants are adequately stocked.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-amber-50 border-amber-200 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-700 flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Variants
          <Badge variant="destructive" className="ml-2">
            {lowStockVariants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Critical (Out of Stock) */}
        {criticalVariants.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-red-600 uppercase">Out of Stock</span>
            <div className="flex flex-wrap gap-2">
              {criticalVariants.map((v) => (
                <Badge
                  key={v.id}
                  variant="destructive"
                  className="flex items-center gap-1.5"
                >
                  {v.variantType === "color" && v.hexCode && (
                    <span
                      className="w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: v.hexCode }}
                    />
                  )}
                  {v.productName} - {v.variantValue}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning (Low Stock) */}
        {warningVariants.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-600 uppercase">Low Stock</span>
            <div className="flex flex-wrap gap-2">
              {warningVariants.map((v) => (
                <Badge
                  key={v.id}
                  variant="outline"
                  className="flex items-center gap-1.5 bg-amber-100 border-amber-300 text-amber-800"
                >
                  {v.variantType === "color" && v.hexCode && (
                    <span
                      className="w-3 h-3 rounded-full border border-amber-400"
                      style={{ backgroundColor: v.hexCode }}
                    />
                  )}
                  {v.productName} - {v.variantValue}
                  <span className="text-xs opacity-70">({v.stock} left)</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-amber-600 pt-1">
          Consider restocking these variants to avoid lost sales.
        </p>
      </CardContent>
    </Card>
  );
}
