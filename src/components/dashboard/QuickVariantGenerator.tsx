import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Wand2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ColorEntry {
  name: string;
  hex: string;
}

interface GeneratedVariant {
  type: "size" | "color";
  value: string;
  displayName: string;
  hexCode?: string;
  stock: number;
}

interface QuickVariantGeneratorProps {
  onGenerate: (variants: GeneratedVariant[]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];

const COMMON_COLORS: ColorEntry[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy", hex: "#001F3F" },
  { name: "Red", hex: "#E53935" },
  { name: "Blue", hex: "#1E88E5" },
  { name: "Green", hex: "#43A047" },
  { name: "Gray", hex: "#757575" },
  { name: "Pink", hex: "#EC407A" },
  { name: "Beige", hex: "#D7CCC8" },
  { name: "Brown", hex: "#795548" },
];

export function QuickVariantGenerator({ onGenerate, isOpen, onOpenChange }: QuickVariantGeneratorProps) {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<ColorEntry[]>([]);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#000000");
  const [stockPerVariant, setStockPerVariant] = useState(5);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: ColorEntry) => {
    setSelectedColors(prev => 
      prev.find(c => c.name === color.name) 
        ? prev.filter(c => c.name !== color.name) 
        : [...prev, color]
    );
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    const newColor = { name: customColorName.trim(), hex: customColorHex };
    if (!selectedColors.find(c => c.name === newColor.name)) {
      setSelectedColors([...selectedColors, newColor]);
    }
    setCustomColorName("");
    setCustomColorHex("#000000");
  };

  const removeColor = (colorName: string) => {
    setSelectedColors(prev => prev.filter(c => c.name !== colorName));
  };

  const totalVariants = selectedSizes.length + selectedColors.length;

  const handleGenerate = () => {
    const variants: GeneratedVariant[] = [];

    // Generate size variants
    for (const size of selectedSizes) {
      variants.push({
        type: "size",
        value: size,
        displayName: size,
        stock: stockPerVariant,
      });
    }

    // Generate color variants
    for (const color of selectedColors) {
      variants.push({
        type: "color",
        value: color.name,
        displayName: color.name,
        hexCode: color.hex,
        stock: stockPerVariant,
      });
    }

    onGenerate(variants);
    
    // Reset
    setSelectedSizes([]);
    setSelectedColors([]);
    setStockPerVariant(5);
    onOpenChange(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full border-dashed border-[#0077B6] text-[#0077B6] hover:bg-[#0077B6]/5"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Quick Variant Generator
          {totalVariants > 0 && (
            <Badge className="ml-2 bg-[#0077B6] text-white">{totalVariants} selected</Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 p-4 border border-[#004B8D]/20 rounded-lg bg-[#f0f7fa]">
        {/* Sizes Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#003366]">Select Sizes</Label>
          <div className="flex flex-wrap gap-2">
            {STANDARD_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedSizes.includes(size)
                    ? "bg-[#0077B6] text-white border-[#0077B6]"
                    : "bg-white text-[#003366] border-[#004B8D]/30 hover:border-[#0077B6]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Colors Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#003366]">Select Colors</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_COLORS.map(color => (
              <button
                key={color.name}
                type="button"
                onClick={() => toggleColor(color)}
                className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md border transition-colors ${
                  selectedColors.find(c => c.name === color.name)
                    ? "bg-[#0077B6]/10 border-[#0077B6] ring-1 ring-[#0077B6]"
                    : "bg-white border-[#004B8D]/30 hover:border-[#0077B6]"
                }`}
              >
                <span 
                  className="w-4 h-4 rounded-full border border-gray-300" 
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-[#003366]">{color.name}</span>
              </button>
            ))}
          </div>

          {/* Selected Colors Display */}
          {selectedColors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedColors.map(color => (
                <Badge 
                  key={color.name} 
                  variant="secondary"
                  className="bg-white border border-[#004B8D]/20 text-[#003366] flex items-center gap-1"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-gray-300" 
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                  <button type="button" onClick={() => removeColor(color.name)}>
                    <X className="w-3 h-3 text-[#004B8D]/60 hover:text-red-500" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Custom Color Input */}
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="color"
              value={customColorHex}
              onChange={(e) => setCustomColorHex(e.target.value)}
              className="w-12 h-8 p-0 border-[#004B8D]/30"
            />
            <Input
              placeholder="Custom color name"
              value={customColorName}
              onChange={(e) => setCustomColorName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomColor())}
            />
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              onClick={addCustomColor}
              disabled={!customColorName.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stock Per Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#003366]">Initial Stock Per Variant</Label>
          <Input
            type="number"
            min={0}
            value={stockPerVariant}
            onChange={(e) => setStockPerVariant(Number(e.target.value) || 0)}
            className="w-32"
          />
        </div>

        {/* Summary & Generate Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[#004B8D]/10">
          <div className="text-sm text-[#004B8D]">
            {totalVariants === 0 ? (
              "Select sizes and colors above"
            ) : (
              <span>
                <strong>{totalVariants}</strong> variants will be created 
                ({selectedSizes.length} sizes + {selectedColors.length} colors)
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={totalVariants === 0}
            className="bg-[#0077B6] hover:bg-[#005f8a]"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Variants
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
