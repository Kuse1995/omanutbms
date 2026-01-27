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
import { Plus, Trash2, Package, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export interface MaterialItem {
  inventoryId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure: string;
  availableStock?: number;
  stockWarning?: string;
}

interface MaterialSelectorProps {
  materials: MaterialItem[];
  onChange: (materials: MaterialItem[]) => void;
  designType?: string;
  fabric?: string;
  color?: string;
  styleNotes?: string;
}

interface InventoryOption {
  id: string;
  name: string;
  sku: string;
  cost_price: number | null;
  current_stock: number | null;
  category: string | null;
  inventory_class: string | null;
  unit_of_measure: string | null;
  location_name?: string | null;
}

export function MaterialSelector({ 
  materials, 
  onChange,
  designType,
  fabric,
  color,
  styleNotes
}: MaterialSelectorProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!tenantId) return;
      
      // Fetch materials inventory.
      // NOTE: Some tenants may have fabrics/etc. classified as `finished_good`.
      // To keep Smart Pricing usable, we include both `raw_material` and `finished_good`.
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select(`
          id, name, sku, cost_price, current_stock, category,
          inventory_class, unit_of_measure, default_location_id,
          branches!default_location_id(name)
        `)
        .eq("tenant_id", tenantId)
        .in("inventory_class", ["raw_material", "finished_good"])
        .order("name");

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError);
        setLoading(false);
        return;
      }

      // Fetch branch-specific stock levels
      const { data: branchStockData } = await supabase
        .from("branch_inventory")
        .select("inventory_id, branch_id, current_stock, branches:branch_id(name)")
        .eq("tenant_id", tenantId)
        .gt("current_stock", 0);

      // Create a map of inventory_id -> total branch stock
      const branchStockMap = new Map<string, { total: number; locations: string[] }>();
      if (branchStockData) {
        branchStockData.forEach((item: any) => {
          const existing = branchStockMap.get(item.inventory_id) || { total: 0, locations: [] };
          existing.total += item.current_stock;
          if (item.branches?.name) {
            existing.locations.push(`${item.branches.name}: ${item.current_stock}`);
          }
          branchStockMap.set(item.inventory_id, existing);
        });
      }

      // Enrich inventory with accurate stock info
      const enriched = (inventoryData || [])
        .map((item: any) => {
          const branchInfo = branchStockMap.get(item.id);
          // Prefer per-location totals, but don't undercount if branch_inventory is incomplete.
          // (We take the max of branch total and the main inventory stock.)
          const effectiveStock = branchInfo
            ? Math.max(branchInfo.total, item.current_stock || 0)
            : (item.current_stock || 0);
          const locationDisplay = branchInfo?.locations.join(', ') || item.branches?.name || 'Main Inventory';
          
          return {
            ...item,
            current_stock: effectiveStock,
            location_name: locationDisplay,
          };
        })
        .filter((item: any) => item.current_stock > 0);

      setInventoryOptions(enriched as unknown as InventoryOption[]);
      setLoading(false);
    };

    fetchInventory();
  }, [tenantId]);

  // Validate stock when materials change
  const validateMaterialStock = (material: MaterialItem): MaterialItem => {
    const inventoryItem = inventoryOptions.find(o => o.id === material.inventoryId);
    if (!inventoryItem) return material;

    const availableStock = inventoryItem.current_stock ?? 0;
    let stockWarning: string | undefined;

    if (material.quantity > availableStock) {
      stockWarning = `Insufficient stock! Only ${availableStock} ${material.unitOfMeasure} available`;
    } else if (material.quantity > availableStock * 0.8) {
      stockWarning = `Low stock warning: Using ${Math.round((material.quantity / availableStock) * 100)}% of available inventory`;
    }

    return { 
      ...material, 
      availableStock,
      stockWarning 
    };
  };

  const handleAddMaterial = () => {
    onChange([
      ...materials,
      {
        inventoryId: "",
        name: "",
        sku: "",
        quantity: 1,
        unitCost: 0,
        unitOfMeasure: "meters",
      },
    ]);
  };

  const handleRemoveMaterial = (index: number) => {
    onChange(materials.filter((_, i) => i !== index));
  };

  const handleSelectMaterial = (index: number, inventoryId: string) => {
    const item = inventoryOptions.find((o) => o.id === inventoryId);
    if (!item) return;

    const updated = [...materials];
    const newMaterial: MaterialItem = {
      inventoryId: item.id,
      name: item.name,
      sku: item.sku,
      quantity: updated[index].quantity || 1,
      unitCost: item.cost_price ?? 0,
      unitOfMeasure: item.unit_of_measure || "pcs",
      availableStock: item.current_stock ?? 0,
    };
    updated[index] = validateMaterialStock(newMaterial);
    onChange(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...materials];
    updated[index] = validateMaterialStock({
      ...updated[index],
      quantity,
    });
    onChange(updated);
  };

  // AI-powered material estimation
  const handleAIEstimate = async () => {
    if (!designType) {
      toast({
        title: "Design required",
        description: "Please specify a design type first",
        variant: "destructive",
      });
      return;
    }

    setEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-material-cost', {
        body: {
          designType,
          fabric,
          color,
          styleNotes,
          availableMaterials: inventoryOptions.map(o => ({
            name: o.name,
            sku: o.sku,
            current_stock: o.current_stock,
            unit_of_measure: o.unit_of_measure,
            cost_price: o.cost_price,
            category: o.category,
          })),
        },
      });

      if (error) throw error;

      if (data.recommendations && data.recommendations.length > 0) {
        // Match AI recommendations to actual inventory items
        const newMaterials: MaterialItem[] = [];
        
        for (const rec of data.recommendations) {
          // Try to find matching inventory item
          const match = inventoryOptions.find(o => 
            o.name.toLowerCase().includes(rec.materialType.toLowerCase()) ||
            rec.materialType.toLowerCase().includes(o.name.toLowerCase()) ||
            o.category?.toLowerCase().includes(rec.materialType.toLowerCase())
          );

          if (match) {
            const material: MaterialItem = {
              inventoryId: match.id,
              name: match.name,
              sku: match.sku,
              quantity: rec.estimatedQuantity,
              unitCost: match.cost_price ?? 0,
              unitOfMeasure: match.unit_of_measure || rec.unitOfMeasure,
              availableStock: match.current_stock ?? 0,
            };
            newMaterials.push(validateMaterialStock(material));
          }
        }

        if (newMaterials.length > 0) {
          onChange(newMaterials);
          toast({
            title: "AI Estimate Complete",
            description: `Suggested ${newMaterials.length} materials. ${data.notes || ''}`,
          });
        } else {
          toast({
            title: "No matching materials",
            description: data.notes || "Could not match AI suggestions to inventory. Add materials manually.",
          });
        }
      }
    } catch (error: any) {
      console.error('AI estimate error:', error);
      toast({
        title: "Estimation failed",
        description: "Could not generate estimate. Please add materials manually.",
        variant: "destructive",
      });
    } finally {
      setEstimating(false);
    }
  };

  const totalCost = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );

  const hasStockIssues = materials.some(m => m.stockWarning?.includes('Insufficient'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Materials from Warehouse</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAIEstimate}
            disabled={loading || estimating || !designType}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            {estimating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            AI Estimate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMaterial}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Material
          </Button>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No materials added yet. Use "AI Estimate" to suggest materials or add manually.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <Select
                    // Radix Select treats empty string as an invalid value; use undefined for "no selection".
                    value={material.inventoryId || undefined}
                    onValueChange={(v) => handleSelectMaterial(index, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} textValue={opt.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-muted-foreground text-xs flex items-center gap-2">
                              {opt.location_name && (
                                <span className="text-purple-600">📍 {opt.location_name}</span>
                              )}
                              <span>
                                {opt.current_stock ?? 0} {opt.unit_of_measure || 'pcs'} @ K{opt.cost_price ?? 0}
                              </span>
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={material.quantity}
                    onChange={(e) =>
                      handleQuantityChange(index, parseFloat(e.target.value) || 0)
                    }
                    className={`h-9 text-center ${material.stockWarning?.includes('Insufficient') ? 'border-destructive' : ''}`}
                    placeholder="Qty"
                  />
                </div>

                <div className="w-20 text-right text-sm text-muted-foreground">
                  {material.unitOfMeasure}
                </div>

                <div className="w-24 text-right font-medium">
                  K {(material.quantity * material.unitCost).toFixed(2)}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMaterial(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Stock warning */}
              {material.stockWarning && (
                <div className={`flex items-center gap-2 px-3 py-1 text-xs rounded ${
                  material.stockWarning.includes('Insufficient') 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  {material.stockWarning}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t">
            {hasStockIssues && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Stock issues detected
              </Badge>
            )}
            <div className="text-sm ml-auto">
              <span className="text-muted-foreground">Material Total: </span>
              <span className="font-semibold">K {totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
