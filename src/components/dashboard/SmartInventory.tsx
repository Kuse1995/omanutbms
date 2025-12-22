import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  reserved: number;
  ai_prediction: string | null;
  status: string;
}

export function SmartInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      setInventory(data || []);
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
    fetchInventory();

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
          if (payload.eventType === 'INSERT') {
            setInventory((prev) => [...prev, payload.new as InventoryItem].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setInventory((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as InventoryItem) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setInventory((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
            <h2 className="text-xl font-bold text-white">Smart Inventory</h2>
            <p className="text-sm text-slate-400">
              Warehouse View • {inventory.length} products
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Sync Inventory
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400 font-medium">SKU</TableHead>
              <TableHead className="text-slate-400 font-medium">Product</TableHead>
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
                  No inventory items found
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
                    {item.current_stock.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {item.reserved}
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
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
