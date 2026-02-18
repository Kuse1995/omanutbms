import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { 
  Warehouse, 
  Search, 
  RefreshCw, 
  Package, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Loader2
} from "lucide-react";
import { StockTransferModal } from "./StockTransferModal";

interface WarehouseLocation {
  id: string;
  name: string;
  code: string | null;
}

interface WarehouseInventory {
  id: string;
  product_name: string;
  sku: string;
  category: string | null;
  current_stock: number;
  reorder_level: number;
  unit_cost: number;
  selling_price: number;
}

interface TransferSuggestion {
  warehouseId: string;
  warehouseName: string;
  storeId: string;
  storeName: string;
  productName: string;
  sku: string;
  warehouseStock: number;
  storeStock: number;
  reorderLevel: number;
  inventoryId: string;
  suggestedQuantity: number;
}

export function WarehouseView() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [suggestions, setSuggestions] = useState<TransferSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [prefilledTransfer, setPrefilledTransfer] = useState<any>(null);

  useEffect(() => {
    fetchWarehouses();
  }, [tenant?.id]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseInventory();
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (warehouses.length > 0) {
      fetchTransferSuggestions();
    }
  }, [warehouses, tenant?.id]);

  const fetchWarehouses = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, code")
        .eq("tenant_id", tenant.id)
        .eq("type", "Warehouse")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setWarehouses(data || []);
      if (data && data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseInventory = async () => {
    if (!tenant?.id || !selectedWarehouse) return;
    setLoading(true);
    try {
      // First, fetch branch_inventory for this warehouse
      const { data: branchInventoryData, error: branchError } = await supabase
        .from("branch_inventory")
        .select(`
          id,
          current_stock,
          reorder_level,
          inventory:inventory_id(
            id,
            name,
            sku,
            category,
            unit_cost,
            selling_price
          )
        `)
        .eq("tenant_id", tenant.id)
        .eq("branch_id", selectedWarehouse);

      if (branchError) throw branchError;

      // Map branch_inventory data to our WarehouseInventory format
      const mappedInventory: WarehouseInventory[] = (branchInventoryData || [])
        .filter((item: any) => item.inventory) // Filter out items where inventory was deleted
        .map((item: any) => ({
          id: item.inventory.id,
          product_name: item.inventory.name,
          sku: item.inventory.sku || '',
          category: item.inventory.category || null,
          current_stock: item.current_stock || 0,
          reorder_level: item.reorder_level || 10,
          unit_cost: item.inventory.unit_cost || 0,
          selling_price: item.inventory.selling_price || 0,
        }));

      setInventory(mappedInventory);
    } catch (error: any) {
      console.error("Error fetching warehouse inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load warehouse inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferSuggestions = async () => {
    if (!tenant?.id || warehouses.length === 0) return;

    try {
      // Get all active store branches
      const { data: stores } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .eq('type', 'Store')
        .eq('is_active', true);

      if (!stores?.length) return;

      // Get all branch_inventory rows for stores
      const { data: storeInventory } = await supabase
        .from('branch_inventory')
        .select('branch_id, inventory_id, current_stock, reorder_level, inventory:inventory_id(name, sku)')
        .eq('tenant_id', tenant.id)
        .in('branch_id', stores.map(s => s.id));

      if (!storeInventory?.length) return;

      // Filter client-side for items below reorder level
      const lowStockItems = storeInventory.filter(
        (item: any) => item.current_stock <= item.reorder_level
      );

      if (!lowStockItems.length) {
        setSuggestions([]);
        return;
      }

      // Get warehouse inventory for all low-stock inventory_ids
      const lowInventoryIds = [...new Set(lowStockItems.map((i: any) => i.inventory_id))];
      const { data: warehouseInventory } = await supabase
        .from('branch_inventory')
        .select('branch_id, inventory_id, current_stock')
        .eq('tenant_id', tenant.id)
        .in('branch_id', warehouses.map(w => w.id))
        .in('inventory_id', lowInventoryIds)
        .gt('current_stock', 0);

      if (!warehouseInventory?.length) {
        setSuggestions([]);
        return;
      }

      // Build a warehouse stock lookup: inventoryId → { branch_id, stock }
      const warehouseStockMap: Record<string, { branch_id: string; current_stock: number }[]> = {};
      warehouseInventory.forEach((row: any) => {
        if (!warehouseStockMap[row.inventory_id]) warehouseStockMap[row.inventory_id] = [];
        warehouseStockMap[row.inventory_id].push({ branch_id: row.branch_id, current_stock: row.current_stock });
      });

      const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));
      const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w.name]));

      const newSuggestions: TransferSuggestion[] = [];
      lowStockItems.forEach((item: any) => {
        const warehouseSources = warehouseStockMap[item.inventory_id];
        if (!warehouseSources?.length) return;

        // Use the warehouse with most surplus
        const best = warehouseSources.reduce((a, b) => (a.current_stock > b.current_stock ? a : b));
        const deficit = item.reorder_level - item.current_stock;
        const suggestedQty = Math.min(deficit * 2, best.current_stock); // transfer up to 2× deficit

        newSuggestions.push({
          warehouseId: best.branch_id,
          warehouseName: warehouseMap[best.branch_id] || 'Warehouse',
          storeId: item.branch_id,
          storeName: storeMap[item.branch_id] || 'Store',
          productName: (item.inventory as any)?.name || 'Unknown',
          sku: (item.inventory as any)?.sku || '',
          warehouseStock: best.current_stock,
          storeStock: item.current_stock,
          reorderLevel: item.reorder_level,
          inventoryId: item.inventory_id,
          suggestedQuantity: Math.max(1, Math.floor(suggestedQty)),
        });
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error fetching transfer suggestions:', error);
    }
  };

  const handleSuggestTransfer = (suggestion: TransferSuggestion) => {
    setPrefilledTransfer({
      sourceId: suggestion.warehouseId,
      targetId: suggestion.storeId,
      productId: suggestion.inventoryId,
      productName: suggestion.productName,
      suggestedQuantity: suggestion.suggestedQuantity,
    });
    setTransferModalOpen(true);
  };

  const filteredInventory = inventory.filter((item) =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0);
  const totalItems = inventory.reduce((sum, item) => sum + item.current_stock, 0);
  const lowStockCount = inventory.filter(i => i.current_stock <= i.reorder_level).length;

  if (loading && warehouses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <Warehouse className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Warehouses Found</h3>
          <p className="text-muted-foreground mb-4">
            Create a warehouse location first to view warehouse inventory.
          </p>
          <Button variant="outline">Go to Locations</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Warehouse Inventory</h2>
          <p className="text-muted-foreground">View and manage warehouse stock levels</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    {wh.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchWarehouseInventory}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transfer Suggestions */}
      {suggestions.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Transfer Suggestions</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="mt-2 space-y-2">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-amber-200">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{suggestion.productName}</span>
                    <span className="text-sm text-muted-foreground">
                      is low in {suggestion.storeName} ({suggestion.storeStock} left)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{suggestion.warehouseStock} in {suggestion.warehouseName}</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSuggestTransfer(suggestion)}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Transfer {suggestion.suggestedQuantity}
                    </Button>
                  </div>
                </div>
              ))}
              {suggestions.length > 3 && (
                <p className="text-sm text-amber-600">
                  + {suggestions.length - 3} more suggestions
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Warehouse className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">K{totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No inventory found in this warehouse
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.current_stock <= item.reorder_level;
                  return (
                    <TableRow key={item.id} className={isLowStock ? "bg-amber-50" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">{item.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.current_stock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.reorder_level}
                      </TableCell>
                      <TableCell className="text-right">
                        K{item.unit_cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        K{(item.current_stock * item.unit_cost).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <StockTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        onSuccess={() => {
          fetchWarehouseInventory();
          fetchTransferSuggestions();
        }}
        prefilledData={prefilledTransfer}
      />
    </div>
  );
}
