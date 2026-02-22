import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RotateCcw, PackageX, Loader2, RefreshCw, Check, X, AlertTriangle, CalendarIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useFeatures } from "@/hooks/useFeatures";
import { useAuth } from "@/hooks/useAuth";
import { ReturnModal } from "./ReturnModal";
import { DamageModal } from "./DamageModal";
import { ExpiryAlertsCard } from "./ExpiryAlertsCard";
import { format, formatDistanceToNow, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

interface InventoryAdjustment {
  id: string;
  inventory_id: string;
  adjustment_type: string;
  quantity: number;
  reason: string;
  customer_name: string | null;
  cost_impact: number;
  notes: string | null;
  status: string;
  return_to_stock: boolean;
  created_at: string;
  processed_by: string | null;
  approved_by: string | null;
  inventory?: {
    name: string;
    sku: string;
  };
}

export function ReturnsAndDamagesManager() {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currencySymbol } = useFeatures();
  const { isAdmin, user } = useAuth();
  const canApprove = isAdmin;

  const fetchAdjustments = async () => {
    if (!tenantId) return;

    try {
      let query = supabase
        .from("inventory_adjustments")
        .select(`
          *,
          inventory:inventory_id (name, sku)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("adjustment_type", typeFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd") + "T00:00:00");
      }

      if (dateTo) {
        query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data, error } = await query;

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory adjustments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchAdjustments();
    }
  }, [tenantId, typeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("inventory-adjustments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_adjustments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => fetchAdjustments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdjustments();
  };

  const handleApprove = async (adjustment: InventoryAdjustment) => {
    try {
      const { error: updateError } = await supabase
        .from("inventory_adjustments")
        .update({
          status: "approved",
          approved_by: user?.id || null,
        })
        .eq("id", adjustment.id);

      if (updateError) throw updateError;

      if (adjustment.return_to_stock && adjustment.adjustment_type === "return") {
        const { data: currentItem } = await supabase
          .from("inventory")
          .select("current_stock")
          .eq("id", adjustment.inventory_id)
          .single();

        if (currentItem) {
          await supabase
            .from("inventory")
            .update({ current_stock: currentItem.current_stock + adjustment.quantity })
            .eq("id", adjustment.inventory_id);
        }
      }

      if (["damage", "loss", "expired"].includes(adjustment.adjustment_type)) {
        const { data: currentItem } = await supabase
          .from("inventory")
          .select("current_stock")
          .eq("id", adjustment.inventory_id)
          .single();

        if (currentItem) {
          const newStock = Math.max(0, currentItem.current_stock - adjustment.quantity);
          await supabase
            .from("inventory")
            .update({ current_stock: newStock })
            .eq("id", adjustment.inventory_id);
        }
      }

      toast({
        title: "Adjustment Approved",
        description: "The inventory adjustment has been processed",
      });

      fetchAdjustments();
    } catch (error) {
      console.error("Error approving adjustment:", error);
      toast({
        title: "Error",
        description: "Failed to approve adjustment",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (adjustmentId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_adjustments")
        .update({
          status: "rejected",
          approved_by: user?.id || null,
        })
        .eq("id", adjustmentId);

      if (error) throw error;

      toast({
        title: "Adjustment Rejected",
        description: "The inventory adjustment has been rejected",
      });

      fetchAdjustments();
    } catch (error) {
      console.error("Error rejecting adjustment:", error);
      toast({
        title: "Error",
        description: "Failed to reject adjustment",
        variant: "destructive",
      });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "return":
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Return</Badge>;
      case "damage":
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Damage</Badge>;
      case "loss":
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Loss</Badge>;
      case "expired":
        return <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">Expired</Badge>;
      case "correction":
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Correction</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Pending</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = adjustments.filter((a) => a.status === "pending").length;
  const returnsCount = adjustments.filter((a) => a.adjustment_type === "return").length;
  const damagesCount = adjustments.filter((a) => ["damage", "loss", "expired"].includes(a.adjustment_type)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-[#0077B6]" />
            Returns & Damages
          </h2>
          <p className="text-[#004B8D]/60 mt-1">
            Track product returns, damages, and stock adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsDamageModalOpen(true)}
            variant="outline"
            className="border-red-500/30 text-red-600 hover:bg-red-50"
          >
            <PackageX className="w-4 h-4 mr-2" />
            Record Damage
          </Button>
          <Button
            onClick={() => setIsReturnModalOpen(true)}
            className="bg-[#004B8D] hover:bg-[#003366]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Record Return
          </Button>
        </div>
      </div>

      <ExpiryAlertsCard />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Total Adjustments</p>
                <p className="text-2xl font-bold text-[#003366]">{adjustments.length}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-[#0077B6]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Returns</p>
                <p className="text-2xl font-bold text-blue-600">{returnsCount}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Damages/Losses</p>
                <p className="text-2xl font-bold text-red-600">{damagesCount}</p>
              </div>
              <PackageX className="w-8 h-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="return">Returns</SelectItem>
            <SelectItem value="damage">Damages</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="correction">Corrections</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PP") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "PP") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSearchQuery(""); }}>
            Clear
          </Button>
        )}
      </div>

      <Card className="bg-white border-[#004B8D]/10">
        <CardHeader>
          <CardTitle className="text-[#003366]">Adjustment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
            </div>
          ) : (() => {
            const query = searchQuery.toLowerCase().trim();
            const filtered = query ? adjustments.filter(a =>
              (a.inventory?.name || '').toLowerCase().includes(query) ||
              (a.inventory?.sku || '').toLowerCase().includes(query) ||
              (a.customer_name || '').toLowerCase().includes(query) ||
              (a.reason || '').toLowerCase().includes(query)
            ) : adjustments;
            return filtered.length === 0 ? (
            <div className="text-center py-8 text-[#004B8D]/60">
              <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No adjustments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                  <TableHead>Status</TableHead>
                  {canApprove && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(adjustment.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(adjustment.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{adjustment.inventory?.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {adjustment.inventory?.sku}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(adjustment.adjustment_type)}</TableCell>
                    <TableCell className="text-right font-medium">{adjustment.quantity}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{adjustment.reason}</TableCell>
                    <TableCell>{adjustment.customer_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      {adjustment.cost_impact > 0 ? (
                        <span className="text-red-600">
                          -{currencySymbol} {adjustment.cost_impact.toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                    {canApprove && (
                      <TableCell className="text-right">
                        {adjustment.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(adjustment)}
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(adjustment.id)}
                              className="text-red-500 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReturnModal
        open={isReturnModalOpen}
        onOpenChange={setIsReturnModalOpen}
        onSuccess={fetchAdjustments}
      />
      <DamageModal
        open={isDamageModalOpen}
        onOpenChange={setIsDamageModalOpen}
        onSuccess={fetchAdjustments}
      />
    </motion.div>
  );
}
