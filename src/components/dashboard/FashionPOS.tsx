import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Package, ImageOff, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariantSelectorModal } from "./VariantSelectorModal";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
  image_url?: string | null;
  collection_id?: string | null;
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

interface CartItem {
  id: string;
  type: "product" | "service";
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedColor?: string;
  selectedSize?: string;
  litersImpact: number;
  maxStock?: number;
}

interface Collection {
  id: string;
  name: string;
}

interface FashionPOSProps {
  inventory: InventoryItem[];
  variants: ProductVariant[];
  collections: Collection[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
}

export function FashionPOS({ inventory, variants, collections, cart, onAddToCart }: FashionPOSProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const { currencySymbol } = useBusinessConfig();

  // Filter products by search and collection
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCollection = selectedCollection === "all" || 
        item.collection_id === selectedCollection;
      
      return matchesSearch && matchesCollection;
    });
  }, [inventory, searchQuery, selectedCollection]);

  // Get variants for a product with stock info
  const getProductVariants = (productId: string) => {
    return variants.filter(v => v.product_id === productId);
  };

  // Get stock availability per color/size combination
  const getVariantStockInfo = (productId: string) => {
    const productVariants = getProductVariants(productId);
    const colors = productVariants.filter(v => v.variant_type === "color");
    const sizes = productVariants.filter(v => v.variant_type === "size");
    
    return { colors, sizes };
  };

  // Calculate total variant stock for display
  const getTotalVariantStock = (productId: string) => {
    const productVariants = getProductVariants(productId);
    if (productVariants.length === 0) return null;
    return productVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const handleProductClick = (product: InventoryItem) => {
    const productVariants = getProductVariants(product.id);
    
    if (productVariants.length > 0) {
      // Has variants - open selector modal
      setSelectedProduct(product);
      setIsVariantModalOpen(true);
    } else {
      // No variants - add directly to cart
      const existingItem = cart.find(item => item.productId === product.id && !item.selectedColor && !item.selectedSize);
      
      if (existingItem) {
        // Already in cart, don't add again (user should use cart to modify qty)
        return;
      }

      const newItem: CartItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: "product",
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.unit_price,
        totalPrice: product.unit_price,
        litersImpact: 0,
        maxStock: product.current_stock,
      };
      onAddToCart(newItem);
    }
  };

  const handleVariantSelect = (product: InventoryItem, color: string | null, size: string | null, quantity: number, unitPrice: number) => {
    const existingItem = cart.find(item => 
      item.productId === product.id && 
      item.selectedColor === (color || undefined) && 
      item.selectedSize === (size || undefined)
    );

    if (existingItem) {
      // Update existing item
      const updatedItem: CartItem = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
        totalPrice: (existingItem.quantity + quantity) * existingItem.unitPrice,
      };
      onAddToCart(updatedItem);
    } else {
      const newItem: CartItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: "product",
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        selectedColor: color || undefined,
        selectedSize: size || undefined,
        litersImpact: 0,
        maxStock: product.current_stock,
      };
      onAddToCart(newItem);
    }

    setIsVariantModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {collections.length > 0 && (
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {collections.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredProducts.map((product, idx) => {
          const { colors, sizes } = getVariantStockInfo(product.id);
          const hasVariants = colors.length > 0 || sizes.length > 0;
          const totalVariantStock = getTotalVariantStock(product.id);
          const displayStock = totalVariantStock !== null ? totalVariantStock : product.current_stock;
          const isOutOfStock = displayStock <= 0;
          const isInCart = cart.some(item => item.productId === product.id);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
                  isOutOfStock ? "opacity-60" : ""
                } ${isInCart ? "ring-2 ring-primary" : ""}`}
                onClick={() => !isOutOfStock && handleProductClick(product)}
              >
                {/* Product Image */}
                <div className="aspect-square relative bg-muted">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* In Cart Badge */}
                  {isInCart && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        In Cart
                      </Badge>
                    </div>
                  )}

                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="destructive">Out of Stock</Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Product Name */}
                  <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {currencySymbol}{product.unit_price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {displayStock} in stock
                    </span>
                  </div>

                  {/* Color Swatches */}
                  {colors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {colors.slice(0, 6).map(color => (
                        <div
                          key={color.id}
                          className={`w-4 h-4 rounded-full border border-border ${
                            (color.stock || 0) <= 0 ? "opacity-30" : ""
                          }`}
                          style={{ backgroundColor: color.hex_code || "#ccc" }}
                          title={`${color.variant_value}: ${color.stock || 0} in stock`}
                        />
                      ))}
                      {colors.length > 6 && (
                        <span className="text-xs text-muted-foreground">+{colors.length - 6}</span>
                      )}
                    </div>
                  )}

                  {/* Size Chips */}
                  {sizes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sizes.slice(0, 5).map(size => (
                        <Badge 
                          key={size.id}
                          variant={(size.stock || 0) > 0 ? "secondary" : "outline"}
                          className={`text-[10px] px-1.5 py-0 ${
                            (size.stock || 0) <= 0 ? "opacity-50 line-through" : ""
                          }`}
                        >
                          {size.variant_value}
                        </Badge>
                      ))}
                      {sizes.length > 5 && (
                        <span className="text-xs text-muted-foreground">+{sizes.length - 5}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mb-2 opacity-50" />
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Variant Selector Modal */}
      <VariantSelectorModal
        open={isVariantModalOpen}
        onOpenChange={setIsVariantModalOpen}
        product={selectedProduct}
        variants={selectedProduct ? getProductVariants(selectedProduct.id) : []}
        onAddToCart={handleVariantSelect}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
