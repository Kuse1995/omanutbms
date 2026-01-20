import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertTriangle, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format, differenceInDays, addDays } from "date-fns";

interface ExpiringProduct {
  id: string;
  name: string;
  sku: string;
  expiry_date: string;
  current_stock: number;
  daysUntilExpiry: number;
}

export function ExpiryAlertsCard() {
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([]);
  const [expiredProducts, setExpiredProducts] = useState<ExpiringProduct[]>([]);
  const { tenantId } = useTenant();

  useEffect(() => {
    const fetchExpiringProducts = async () => {
      if (!tenantId) return;

      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);

      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, sku, expiry_date, current_stock")
        .eq("tenant_id", tenantId)
        .eq("has_expiry", true)
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .gt("current_stock", 0)
        .order("expiry_date", { ascending: true });

      if (error) {
        console.error("Error fetching expiring products:", error);
        return;
      }

      const productsWithDays = (data || []).map((product) => ({
        ...product,
        daysUntilExpiry: differenceInDays(new Date(product.expiry_date), today),
      }));

      setExpiredProducts(productsWithDays.filter((p) => p.daysUntilExpiry <= 0));
      setExpiringProducts(productsWithDays.filter((p) => p.daysUntilExpiry > 0));
    };

    fetchExpiringProducts();
  }, [tenantId]);

  if (expiredProducts.length === 0 && expiringProducts.length === 0) {
    return null;
  }

  const getUrgencyBadge = (days: number) => {
    if (days <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (days <= 7) {
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Critical - {days} days</Badge>;
    }
    if (days <= 14) {
      return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Warning - {days} days</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{days} days</Badge>;
  };

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-red-50 border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-800 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Product Expiry Alerts
          <Badge className="ml-2 bg-amber-500 text-white">
            {expiredProducts.length + expiringProducts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Expired Products */}
          {expiredProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Expired Products ({expiredProducts.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white/80 rounded-lg p-3 border border-red-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.current_stock} units • Expired {format(new Date(product.expiry_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {getUrgencyBadge(product.daysUntilExpiry)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Soon */}
          {expiringProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Expiring Soon ({expiringProducts.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiringProducts.slice(0, 6).map((product) => (
                  <div
                    key={product.id}
                    className="bg-white/80 rounded-lg p-3 border border-amber-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.current_stock} units • Expires {format(new Date(product.expiry_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {getUrgencyBadge(product.daysUntilExpiry)}
                  </div>
                ))}
              </div>
              {expiringProducts.length > 6 && (
                <p className="text-sm text-amber-600 mt-2">
                  +{expiringProducts.length - 6} more products expiring within 30 days
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
