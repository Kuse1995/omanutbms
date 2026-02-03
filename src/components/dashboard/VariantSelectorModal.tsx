import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, AlertCircle, ImageOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
  image_url?: string | null;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  additional_price: number;
  stock: number;
}

interface VariantSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: InventoryItem | null;
  variants: ProductVariant[];
  onAddToCart: (product: InventoryItem, color: string | null, size: string | null, quantity: number, unitPrice: number) => void;
  currencySymbol: string;
}

export function VariantSelectorModal({ 
  open, 
  onOpenChange, 
  product, 
  variants, 
  onAddToCart,
  currencySymbol 
}: VariantSelectorModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reset selections when modal opens/product changes
  useEffect(() => {
    if (open && product) {
      setSelectedColor(null);
      setSelectedSize(null);
      setQuantity(1);
    }
  }, [open, product]);

  const colors = useMemo(() => variants.filter(v => v.variant_type === "color"), [variants]);
  const sizes = useMemo(() => variants.filter(v => v.variant_type === "size"), [variants]);

  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  // Calculate selected variant info
  const selectedColorVariant = colors.find(c => c.variant_value === selectedColor);
  const selectedSizeVariant = sizes.find(s => s.variant_value === selectedSize);

  // Calculate price with variant additions
  const basePrice = product?.unit_price || 0;
  const colorAddition = selectedColorVariant?.additional_price || 0;
  const sizeAddition = selectedSizeVariant?.additional_price || 0;
  const unitPrice = basePrice + colorAddition + sizeAddition;
  const totalPrice = unitPrice * quantity;

  // Calculate available stock for selected combination
  const getAvailableStock = () => {
    // If we have variants with stock, use the minimum stock of selected variants
    // Otherwise fall back to base product stock
    const stocks: number[] = [];
    
    if (selectedColorVariant && typeof selectedColorVariant.stock === 'number') {
      stocks.push(selectedColorVariant.stock);
    }
    if (selectedSizeVariant && typeof selectedSizeVariant.stock === 'number') {
      stocks.push(selectedSizeVariant.stock);
    }
    
    if (stocks.length > 0) {
      return Math.min(...stocks);
    }
    
    return product?.current_stock || 0;
  };

  const availableStock = getAvailableStock();
  const isOutOfStock = availableStock <= 0;

  // Check if selection is complete
  const isSelectionComplete = (!hasColors || selectedColor) && (!hasSizes || selectedSize);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= availableStock) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = () => {
    if (!product || !isSelectionComplete || isOutOfStock) return;
    onAddToCart(product, selectedColor, selectedSize, quantity, unitPrice);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-lg">Select Options</DialogTitle>
          <DialogDescription>Choose size and color for {product.name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Product Info & Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <p className="text-2xl font-bold text-primary">
                {currencySymbol}{unitPrice.toLocaleString()}
              </p>
              {(colorAddition > 0 || sizeAddition > 0) && (
                <p className="text-xs text-muted-foreground">
                  Base: {currencySymbol}{basePrice.toLocaleString()}
                  {colorAddition > 0 && ` + ${currencySymbol}${colorAddition} (color)`}
                  {sizeAddition > 0 && ` + ${currencySymbol}${sizeAddition} (size)`}
                </p>
              )}
            </div>

            {/* Color Selection */}
            {hasColors && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Color {selectedColor && <span className="font-normal text-muted-foreground">- {selectedColor}</span>}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => {
                    const isSelected = selectedColor === color.variant_value;
                    const colorStock = color.stock || 0;
                    const isColorOutOfStock = colorStock <= 0;
                    
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => !isColorOutOfStock && setSelectedColor(color.variant_value)}
                        disabled={isColorOutOfStock}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                          isSelected 
                            ? "border-primary ring-2 ring-primary ring-offset-2" 
                            : "border-border hover:border-primary/50"
                        } ${isColorOutOfStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        style={{ backgroundColor: color.hex_code || "#ccc" }}
                        title={`${color.variant_display || color.variant_value}: ${colorStock} in stock`}
                      >
                        {isColorOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-destructive rotate-45 absolute" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedColorVariant && (
                  <p className="text-xs text-muted-foreground">
                    {selectedColorVariant.stock || 0} available
                  </p>
                )}
              </div>
            )}

            {/* Size Selection */}
            {hasSizes && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Size</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => {
                    const isSelected = selectedSize === size.variant_value;
                    const sizeStock = size.stock || 0;
                    const isSizeOutOfStock = sizeStock <= 0;
                    
                    return (
                      <Button
                        key={size.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => !isSizeOutOfStock && setSelectedSize(size.variant_value)}
                        disabled={isSizeOutOfStock}
                        className={`min-w-[48px] ${isSizeOutOfStock ? "opacity-40 line-through" : ""}`}
                      >
                        {size.variant_display || size.variant_value}
                        <span className="ml-1 text-[10px] opacity-70">({sizeStock})</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Warning */}
        {isSelectionComplete && isOutOfStock && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This combination is out of stock.
            </AlertDescription>
          </Alert>
        )}

        {/* Quantity & Add to Cart */}
        {isSelectionComplete && !isOutOfStock && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  step="any"
                  min={0.01}
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    setQuantity(Math.min(Math.max(0.01, val), availableStock));
                  }}
                  className="w-16 text-center h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= availableStock}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">{availableStock} available</span>
            </div>

            <Button 
              onClick={handleAddToCart}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart - {currencySymbol}{totalPrice.toLocaleString()}
            </Button>
          </div>
        )}

        {/* Prompt to complete selection */}
        {!isSelectionComplete && (
          <div className="text-center py-4 text-muted-foreground">
            {!selectedColor && hasColors && <p>Please select a color</p>}
            {!selectedSize && hasSizes && selectedColor && <p>Please select a size</p>}
            {!selectedColor && !hasColors && !selectedSize && hasSizes && <p>Please select a size</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
