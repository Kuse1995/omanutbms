import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Landmark, Plus, Search, Download, Calculator, Eye, Pencil, Trash2, 
  AlertTriangle, TrendingDown, Package, Building2, Car, Monitor, Cog, Armchair
} from "lucide-react";
import { format } from "date-fns";
import { 
  calculateDepreciation, 
  formatCurrency, 
  ASSET_CATEGORIES, 
  ASSET_STATUSES,
  type Asset 
} from "@/lib/asset-depreciation";
import { AssetModal } from "./AssetModal";
import { AssetDepreciationModal } from "./AssetDepreciationModal";

interface DbAsset {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value: number;
  status: string;
  disposal_date: string | null;
  disposal_value: number | null;
  serial_number: string | null;
  location: string | null;
  assigned_to: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, typeof Monitor> = {
    IT: Monitor,
    Vehicles: Car,
    Machinery: Cog,
    Furniture: Armchair,
    Buildings: Building2,
    Other: Package,
  };
  const Icon = icons[category] || Package;
  return <Icon className="h-4 w-4" />;
};

export function AssetsManager() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DbAsset | null>(null);
  const [depreciationAsset, setDepreciationAsset] = useState<DbAsset | null>(null);

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DbAsset[];
    },
    enabled: !!tenantId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", tenantId] });
      toast({ title: "Asset deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting asset", description: error.message, variant: "destructive" });
    },
  });

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.location?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const activeAssets = assets.filter(a => a.status === 'active');
    let totalNBV = 0;
    let upcomingDepreciation = 0;

    activeAssets.forEach(asset => {
      const result = calculateDepreciation(asset as unknown as Asset);
      totalNBV += result.netBookValue;
      upcomingDepreciation += result.monthlyDepreciation;
    });

    return {
      totalAssets: activeAssets.length,
      totalNBV,
      upcomingDepreciation,
      disposedCount: assets.filter(a => a.status === 'disposed').length,
    };
  }, [assets]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Name", "Category", "Serial Number", "Purchase Date", "Purchase Cost", "Depreciation Method", "Useful Life (Years)", "Salvage Value", "Current NBV", "Status"];
    const rows = filteredAssets.map(asset => {
      const result = calculateDepreciation(asset as unknown as Asset);
      return [
        asset.name,
        asset.category,
        asset.serial_number || "",
        asset.purchase_date,
        asset.purchase_cost.toFixed(2),
        asset.depreciation_method === 'straight_line' ? 'Straight-Line' : 'Reducing Balance',
        asset.useful_life_years,
        asset.salvage_value.toFixed(2),
        result.netBookValue.toFixed(2),
        asset.status,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset-register-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (asset: DbAsset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleDelete = (asset: DbAsset) => {
    if (confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      deleteMutation.mutate(asset.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = ASSET_STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Asset Management</h1>
            <p className="text-sm text-muted-foreground">Track and depreciate fixed assets</p>
          </div>
        </div>
        <Button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Assets</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalAssets}</div>
            <p className="text-xs text-muted-foreground">{summaryStats.disposedCount} disposed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Book Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalNBV)}</div>
            <p className="text-xs text-muted-foreground">Current value of all assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Depreciation</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.upcomingDepreciation)}</div>
            <p className="text-xs text-muted-foreground">Expense this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="registry" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registry">Asset Registry</TabsTrigger>
          <TabsTrigger value="disposed">Disposed Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, serial number, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {ASSET_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ASSET_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assets Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead className="text-right">Purchase Cost</TableHead>
                    <TableHead className="text-right">Current NBV</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading assets...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssets.filter(a => a.status !== 'disposed').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No assets found. Click "Add Asset" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.filter(a => a.status !== 'disposed').map((asset) => {
                      const depResult = calculateDepreciation(asset as unknown as Asset);
                      return (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-muted rounded">
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <div className="font-medium">{asset.name}</div>
                                {asset.serial_number && (
                                  <div className="text-xs text-muted-foreground">SN: {asset.serial_number}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{asset.category}</TableCell>
                          <TableCell>{format(new Date(asset.purchase_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(asset.purchase_cost)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(depResult.netBookValue)}</TableCell>
                          <TableCell>{getStatusBadge(asset.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setDepreciationAsset(asset)} title="View Depreciation">
                                <Calculator className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(asset)} title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposed" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Disposal Date</TableHead>
                    <TableHead className="text-right">Original Cost</TableHead>
                    <TableHead className="text-right">Disposal Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.filter(a => a.status === 'disposed').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No disposed assets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.filter(a => a.status === 'disposed').map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded">
                              {getCategoryIcon(asset.category)}
                            </div>
                            <div className="font-medium">{asset.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{asset.disposal_date ? format(new Date(asset.disposal_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.purchase_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.disposal_value || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AssetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        asset={editingAsset}
        tenantId={tenantId}
      />

      {depreciationAsset && (
        <AssetDepreciationModal
          open={!!depreciationAsset}
          onOpenChange={(open) => !open && setDepreciationAsset(null)}
          asset={depreciationAsset}
        />
      )}
    </div>
  );
}
