import { useState } from "react";
import { Check, ChevronsUpDown, Package, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
}

interface ProductComboboxProps {
  products: ProductOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showStock?: boolean;
  showPrice?: boolean;
}

export function ProductCombobox({
  products,
  value,
  onValueChange,
  placeholder = "Select product...",
  disabled = false,
  showStock = true,
  showPrice = true,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  
  const selectedProduct = products.find((product) => product.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] hover:bg-[#e8f4f8]",
            !value && "text-[#004B8D]/50"
          )}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <Package className="h-4 w-4 text-[#0077B6] shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
              {showPrice && (
                <Badge variant="secondary" className="bg-[#004B8D]/10 text-[#004B8D] text-xs ml-auto shrink-0">
                  K{selectedProduct.unit_price.toLocaleString()}
                </Badge>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-white border-[#004B8D]/20 z-50" align="start">
        <Command className="bg-white">
          <CommandInput 
            placeholder="Search products by name or SKU..." 
            className="text-[#003366]"
          />
          <CommandList>
            <CommandEmpty className="text-[#004B8D]/50 text-center py-6">
              No products found.
            </CommandEmpty>
            <CommandGroup>
            {products.map((product) => {
                const isLowStock = product.current_stock < 10;
                const isOutOfStock = product.current_stock === 0;
                
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.sku}`}
                    onSelect={() => {
                      onValueChange(product.id === value ? "" : product.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 py-3 cursor-pointer",
                      "text-[#003366] hover:bg-[#004B8D]/5"
                    )}
                  >
                    <div className="flex items-center w-full gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === product.id ? "opacity-100 text-[#0077B6]" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{product.name}</span>
                            {isOutOfStock && (
                              <span className="text-[10px] text-amber-600 whitespace-nowrap">
                                (Will be Sourced)
                              </span>
                            )}
                          </div>
                          {showPrice && (
                            <span className="text-[#0077B6] font-semibold shrink-0">
                              K{product.unit_price.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-[#004B8D]/50 font-mono">{product.sku}</span>
                          {showStock && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                isOutOfStock 
                                  ? "bg-amber-50 text-amber-600 border-amber-200" 
                                  : isLowStock 
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-green-50 text-green-600 border-green-200"
                              )}
                            >
                              {isOutOfStock ? "Sourcing Required" : `${product.current_stock} in stock`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
