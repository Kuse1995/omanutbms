import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, TrendingUp, RefreshCw, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useBranch } from "@/hooks/useBranch";

const ITEMS_PER_PAGE = 100;

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  reserved: number;
  ai_prediction: string | null;
  status: string;
  item_type?: string | null;
  category?: string | null;
}

// Categories that are considered services (no stock tracking)
const SERVICE_CATEGORIES = [
  'consultation', 'project', 'retainer', 'training', 'support', 'package',
  'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering',
  'consultation_fee', 'lab_test', 'procedure', 'vaccination',
  'repair', 'maintenance', 'diagnostics', 'service', 'services',
  'maintenance_service'
];

function isServiceItem(item: InventoryItem): boolean {
  return item.item_type === 'service' || SERVICE_CATEGORIES.includes(item.category || '');
}

export function SmartInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { terminology } = useBusinessConfig();
  const { currentBranch, isMultiBranchEnabled } = useBranch();
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchInventory = async () => {
    if (!tenantId) return;
    
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const useBranchInventory = currentBranch && isMultiBranchEnabled;

      if (useBranchInventory) {
        // Branch-specific: run count and data queries in parallel
        let countQuery = supabase
          .from("branch_inventory")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("branch_id", currentBranch.id)
          .gt("current_stock", 0);

        const [countResult, dataResult] = await Promise.all([
          countQuery,
          supabase
            .from("branch_inventory")
            .select(`
              id,
              current_stock,
              reserved,
              inventory:inventory_id(id, sku, name, ai_prediction, status, item_type, category, is_archived)
            `)
            .eq("tenant_id", tenantId)
            .eq("branch_id", currentBranch.id)
            .gt("current_stock", 0)
            .range(from, to),
        ]);

        if (dataResult.error) throw dataResult.error;

        let mappedItems: InventoryItem[] = (dataResult.data || [])
          .filter((item: any) => item.inventory && !item.inventory.is_archived)
          .map((item: any) => ({
            id: item.inventory.id,
            sku: item.inventory.sku,
            name: item.inventory.name,
            current_stock: item.current_stock,
            reserved: item.reserved || 0,
            ai_prediction: item.inventory.ai_prediction,
            status: item.inventory.status,
            item_type: item.inventory.item_type,
            category: item.inventory.category,
          }));

        if (debouncedSearch.trim()) {
          const search = debouncedSearch.trim().toLowerCase();
          mappedItems = mappedItems.filter(item =>
            item.name.toLowerCase().includes(search) ||
            (item.sku && item.sku.toLowerCase().includes(search))
          );
        }
        mappedItems.sort((a, b) => a.name.localeCompare(b.name));

        setTotalCount(debouncedSearch.trim() ? mappedItems.length : (countResult.count || 0));
        setInventory(mappedItems);
      } else {
        // Global view: query inventory table directly
        let countQuery = supabase
          .from("inventory")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_archived", false);

        if (debouncedSearch.trim()) {
          const searchPattern = `%${debouncedSearch.trim()}%`;
          countQuery = countQuery.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`);
        }
        
        const { count } = await countQuery;
        setTotalCount(count || 0);

        let query = supabase
          .from("inventory")
          .select("id, sku, name, current_stock, reserved, ai_prediction, status, item_type, category, default_location_id")
          .eq("tenant_id", tenantId)
          .eq("is_archived", false);

        if (debouncedSearch.trim()) {
          const searchPattern = `%${debouncedSearch.trim()}%`;
          query = query.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`);
        }
        
        const { data, error } = await query
          .order("name")
          .range(from, to);

        if (error) throw error;
        setInventory(data || []);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      setIsLoading(true);
      fetchInventory();
    }
  }, [tenantId, currentBranch?.id, currentPage, debouncedSearch]);

  // Reset page when branch changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentBranch?.id]);

  useEffect(() => {
    // Subscribe to real-time changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        (payload) => {
          console.log('Inventory change:', payload);
          // Refetch on changes to ensure branch filtering is applied
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, currentBranch?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInventory();
    setIsRefreshing(false);
    toast({
      title: "Synced",
      description: "Inventory data updated",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Monitor
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
            Healthy
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#004B8D] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004B8D] flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Smart {terminology.inventory}</h2>
          <p className="text-sm text-slate-400">
            Warehouse View • {totalCount.toLocaleString()} items{debouncedSearch ? ` matching "${debouncedSearch}"` : " total"}
          </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Sync {terminology.inventory}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400 font-medium">SKU</TableHead>
              <TableHead className="text-slate-400 font-medium">{terminology.product}</TableHead>
              <TableHead className="text-slate-400 font-medium text-right">Current Stock</TableHead>
              <TableHead className="text-slate-400 font-medium text-right">Reserved</TableHead>
              <TableHead className="text-slate-400 font-medium">AI Prediction</TableHead>
              <TableHead className="text-slate-400 font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  No {terminology.products.toLowerCase()} found
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-slate-700 hover:bg-slate-700/30"
                >
                  <TableCell className="font-mono text-sm text-slate-300">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="font-medium text-white">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    {isServiceItem(item) ? (
                      <span className="text-slate-400 italic">N/A</span>
                    ) : (
                      item.current_stock.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {isServiceItem(item) ? (
                      <span className="text-slate-500">-</span>
                    ) : (
                      item.reserved
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px]">
                      {item.status === "critical" ? (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-red-300">{item.ai_prediction}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">{item.ai_prediction}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isServiceItem(item) ? (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
                        Service
                      </Badge>
                    ) : (
                      getStatusBadge(item.status)
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} items
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`text-slate-300 hover:text-white hover:bg-slate-700 ${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                />
              </PaginationItem>
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className={`cursor-pointer ${currentPage === pageNum ? 'bg-[#004B8D] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`text-slate-300 hover:text-white hover:bg-slate-700 ${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </motion.div>
  );
}
