import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  Search,
  Download,
  Loader2,
  History,
  Package,
  ArrowRightLeft,
  Undo2,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Wrench
} from "lucide-react";
import { format } from "date-fns";

interface StockMovement {
  id: string;
  tenant_id: string;
  inventory_id: string;
  branch_id: string | null;
  movement_type: string;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  from_branch_id: string | null;
  to_branch_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  product_name?: string;
  product_sku?: string;
  branch_name?: string;
  from_branch_name?: string;
  to_branch_name?: string;
}

interface Branch {
  id: string;
  name: string;
}

const movementTypeConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  transfer_out: { 
    label: 'Transfer Out', 
    icon: ArrowUpRight, 
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  transfer_in: { 
    label: 'Transfer In', 
    icon: ArrowDownRight, 
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  sale: { 
    label: 'Sale', 
    icon: ShoppingCart, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  return: { 
    label: 'Return', 
    icon: Undo2, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  adjustment: { 
    label: 'Adjustment', 
    icon: Wrench, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  restock: { 
    label: 'Restock', 
    icon: Plus, 
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  damage: { 
    label: 'Damage', 
    icon: AlertTriangle, 
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  correction: { 
    label: 'Correction', 
    icon: ArrowRightLeft, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
};

interface StockMovementsViewerProps {
  productId?: string;
  branchId?: string;
}

export function StockMovementsViewer({ productId, branchId }: StockMovementsViewerProps) {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>(branchId || "all");

  useEffect(() => {
    if (tenant?.id) {
      fetchBranches();
      fetchMovements();
    }
  }, [tenant?.id, productId, branchId]);

  const fetchBranches = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchMovements = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("stock_movements")
        .select(`
          *,
          inventory:inventory_id(name, sku),
          branch:branch_id(name),
          from_branch:from_branch_id(name),
          to_branch:to_branch_id(name)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (productId) {
        query = query.eq("inventory_id", productId);
      }

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedMovements: StockMovement[] = (data || []).map((m: any) => ({
        ...m,
        product_name: m.inventory?.name || 'Unknown',
        product_sku: m.inventory?.sku || '',
        branch_name: m.branch?.name || null,
        from_branch_name: m.from_branch?.name || null,
        to_branch_name: m.to_branch?.name || null,
      }));

      setMovements(formattedMovements);
    } catch (error: any) {
      console.error("Error fetching movements:", error);
      toast({
        title: "Error",
        description: "Failed to load stock movements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ["Date", "Product", "SKU", "Type", "Qty", "Before", "After", "Location", "Notes"];
    const rows = filteredMovements.map((m) => [
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
      m.product_name,
      m.product_sku,
      movementTypeConfig[m.movement_type]?.label || m.movement_type,
      m.quantity,
      m.quantity_before ?? '',
      m.quantity_after ?? '',
      m.branch_name || '',
      m.notes || '',
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Stock movements exported to CSV",
    });
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch = 
      m.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || m.movement_type === filterType;
    const matchesBranch = filterBranch === "all" || m.branch_id === filterBranch;
    
    return matchesSearch && matchesType && matchesBranch;
  });

  // Calculate stats
  const stats = {
    totalIn: movements
      .filter(m => ['transfer_in', 'restock', 'return'].includes(m.movement_type))
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    totalOut: movements
      .filter(m => ['transfer_out', 'sale', 'damage'].includes(m.movement_type))
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    transfers: movements.filter(m => m.movement_type.startsWith('transfer')).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Stock Movement History
          </h2>
          <p className="text-muted-foreground">Track all inventory movements and transfers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMovements}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <ArrowDownRight className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalIn.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Items In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOut.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Items Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.transfers}</p>
                <p className="text-sm text-muted-foreground">Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="transfer_in">Transfer In</SelectItem>
            <SelectItem value="transfer_out">Transfer Out</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="restock">Restock</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="damage">Damage</SelectItem>
          </SelectContent>
        </Select>
        {!branchId && (
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Before → After</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No stock movements found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => {
                  const config = movementTypeConfig[movement.movement_type] || {
                    label: movement.movement_type,
                    icon: ArrowRightLeft,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                  };
                  const TypeIcon = config.icon;
                  const isPositive = ['transfer_in', 'restock', 'return'].includes(movement.movement_type);
                  
                  return (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(movement.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(movement.created_at), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.product_name}</div>
                          <div className="text-sm text-muted-foreground">{movement.product_sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${config.bgColor} ${config.color} border-none gap-1`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{Math.abs(movement.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {movement.quantity_before !== null && movement.quantity_after !== null ? (
                          <span className="text-sm text-muted-foreground">
                            {movement.quantity_before} → {movement.quantity_after}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {movement.movement_type.startsWith('transfer') ? (
                          <div className="text-sm">
                            {movement.from_branch_name && (
                              <span className="text-muted-foreground">{movement.from_branch_name}</span>
                            )}
                            {movement.from_branch_name && movement.to_branch_name && (
                              <span className="mx-1">→</span>
                            )}
                            {movement.to_branch_name && (
                              <span className="font-medium">{movement.to_branch_name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm">{movement.branch_name || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {movement.notes || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
