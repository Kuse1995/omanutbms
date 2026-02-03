import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package, Gift, Zap, Tag } from "lucide-react";

export interface AdditionalCostItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: "packaging" | "fee" | "accessory" | "other";
}

interface AdditionalCostsSectionProps {
  items: AdditionalCostItem[];
  onChange: (items: AdditionalCostItem[]) => void;
}

const PRESET_ITEMS = [
  { description: "Premium Garment Bag", unitPrice: 50, itemType: "packaging" as const },
  { description: "Gift Box", unitPrice: 75, itemType: "packaging" as const },
  { description: "Dust Cover", unitPrice: 25, itemType: "packaging" as const },
  { description: "Express Production Fee", unitPrice: 200, itemType: "fee" as const },
  { description: "Rush Delivery Fee", unitPrice: 100, itemType: "fee" as const },
  { description: "Alterations Buffer", unitPrice: 150, itemType: "fee" as const },
  { description: "Extra Buttons Set", unitPrice: 35, itemType: "accessory" as const },
  { description: "Care Labels (10 pcs)", unitPrice: 15, itemType: "accessory" as const },
  { description: "Branded Tag", unitPrice: 20, itemType: "accessory" as const },
];

const ITEM_TYPE_ICONS = {
  packaging: Gift,
  fee: Zap,
  accessory: Tag,
  other: Package,
};

const ITEM_TYPE_LABELS = {
  packaging: "Packaging",
  fee: "Fee",
  accessory: "Accessory",
  other: "Other",
};

export function AdditionalCostsSection({
  items,
  onChange,
}: AdditionalCostsSectionProps) {
  const [showPresets, setShowPresets] = useState(false);

  const handleAddItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        itemType: "other",
      },
    ]);
  };

  const handleAddPreset = (preset: (typeof PRESET_ITEMS)[0]) => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: preset.description,
        quantity: 1,
        unitPrice: preset.unitPrice,
        itemType: preset.itemType,
      },
    ]);
    setShowPresets(false);
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof AdditionalCostItem,
    value: string | number
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const totalCost = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Label className="text-sm font-medium">
          Additional Costs
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
            className="flex-1 sm:flex-none"
          >
            <Gift className="h-4 w-4 mr-1" />
            Quick Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-1" />
            Custom
          </Button>
        </div>
      </div>

      {/* Preset Quick Add Panel */}
      {showPresets && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg border">
          {PRESET_ITEMS.map((preset, idx) => {
            const Icon = ITEM_TYPE_ICONS[preset.itemType];
            return (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start h-auto py-2 px-3 text-left"
                onClick={() => handleAddPreset(preset)}
              >
                <Icon className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">
                    {preset.description}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    K{preset.unitPrice}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-sm text-muted-foreground">
            No additional costs added.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = ITEM_TYPE_ICONS[item.itemType];
            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg sm:flex-row sm:items-center"
              >
                {/* Mobile: stacked layout, Desktop: row layout */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="w-24 shrink-0">
                    <Select
                      value={item.itemType}
                      onValueChange={(v) =>
                        handleUpdateItem(
                          item.id,
                          "itemType",
                          v as AdditionalCostItem["itemType"]
                        )
                      }
                    >
                      <SelectTrigger className="h-10 sm:h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => {
                          const TypeIcon =
                            ITEM_TYPE_ICONS[key as keyof typeof ITEM_TYPE_ICONS];
                          return (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <TypeIcon className="h-3 w-3" />
                                {label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateItem(item.id, "description", e.target.value)
                      }
                      className="h-10 sm:h-9"
                      placeholder="Description..."
                    />
                  </div>

                  {/* Delete button - visible on mobile in this row */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:hidden text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Qty, Price, Total row */}
                <div className="flex items-center gap-2 sm:gap-2">
                  <div className="w-16 sm:w-20 shrink-0">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="h-10 sm:h-9 text-center"
                      placeholder="Qty"
                    />
                  </div>

                  <div className="w-20 sm:w-24 shrink-0">
                    <Input
                      type="number"
                      step="5"
                      min="0"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateItem(
                          item.id,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-10 sm:h-9 text-center"
                      placeholder="K0"
                    />
                  </div>

                  <div className="flex-1 text-right font-medium text-sm min-w-[70px]">
                    K {(item.quantity * item.unitPrice).toFixed(2)}
                  </div>

                  {/* Delete button - desktop only */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hidden sm:flex text-destructive hover:text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-2 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Additional Total: </span>
              <span className="font-semibold">K {totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
