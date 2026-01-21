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
import { Plus, Trash2, Package } from "lucide-react";

export interface MaterialItem {
  inventoryId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure: string;
}

interface MaterialSelectorProps {
  materials: MaterialItem[];
  onChange: (materials: MaterialItem[]) => void;
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

export function MaterialSelector({ materials, onChange }: MaterialSelectorProps) {
  const { tenantId } = useTenant();
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!tenantId) return;
      
      // Fetch raw materials with location info
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          id, name, sku, cost_price, current_stock, category,
          inventory_class, unit_of_measure,
          branches!default_location_id(name)
        `)
        .eq("tenant_id", tenantId)
        .eq("inventory_class", "raw_material")
        .gt("current_stock", 0)
        .order("name");

      if (!error && data) {
        const enriched = data.map((item: any) => ({
          ...item,
          location_name: item.branches?.name || null,
        }));
        setInventoryOptions(enriched as unknown as InventoryOption[]);
      }
      setLoading(false);
    };

    fetchInventory();
  }, [tenantId]);

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
    updated[index] = {
      inventoryId: item.id,
      name: item.name,
      sku: item.sku,
      quantity: updated[index].quantity || 1,
      unitCost: item.cost_price ?? 0,
      unitOfMeasure: item.unit_of_measure || "pcs",
    };
    onChange(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...materials];
    updated[index].quantity = quantity;
    onChange(updated);
  };

  const totalCost = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Materials from Warehouse</Label>
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

      {materials.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No materials added yet. Click "Add Material" to select from inventory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <Select
                  value={material.inventoryId}
                  onValueChange={(v) => handleSelectMaterial(index, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{opt.name}</span>
                          <span className="text-muted-foreground text-xs flex items-center gap-2">
                            {opt.location_name && (
                              <span className="text-purple-600">📍 {opt.location_name}</span>
                            )}
                            <span>
                              {opt.current_stock ?? 0} {opt.unit_of_measure || 'pcs'} available
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
                  className="h-9 text-center"
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
          ))}

          <div className="flex justify-end pt-2 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Material Total: </span>
              <span className="font-semibold">K {totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
