import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomOrderModal } from "./CustomOrderModal";
import { Scissors, Plus, Search, Edit, Trash2, Loader2, Calendar, User, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import type { Measurements } from "./MeasurementsForm";

interface CustomOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  design_type: string | null;
  fabric: string | null;
  color: string | null;
  style_notes: string | null;
  measurements: Measurements;
  estimated_cost: number | null;
  deposit_paid: number | null;
  order_date: string;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  customers?: { name: string } | null;
  employees?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "secondary" },
  cutting: { label: "Cutting", variant: "default" },
  sewing: { label: "Sewing", variant: "default" },
  fitting: { label: "Fitting", variant: "default" },
  finishing: { label: "Finishing", variant: "default" },
  ready: { label: "Ready", variant: "secondary" },
  delivered: { label: "Delivered", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function CustomOrdersManager() {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { isAdmin, canEdit: canEditRole } = useAuth();
  const { currencySymbol } = useBusinessConfig();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<CustomOrder | null>(null);

  const canEdit = isAdmin || canEditRole;

  const fetchOrders = async () => {
    if (!tenant?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("custom_orders")
        .select(`
          *,
          customers(name),
          employees(full_name)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const parsed = (data || []).map(o => ({
        ...o,
        measurements: (o.measurements as Measurements) || {},
      }));
      
      setOrders(parsed);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription
    if (tenant?.id) {
      const channel = supabase
        .channel("custom_orders_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "custom_orders", filter: `tenant_id=eq.${tenant.id}` },
          () => fetchOrders()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [tenant?.id]);

  const handleEdit = (order: CustomOrder) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
      const { error } = await supabase
        .from("custom_orders")
        .delete()
        .eq("id", orderToDelete.id);

      if (error) throw error;
      toast({ title: "Success", description: "Order deleted successfully" });
      fetchOrders();
    } catch (error: any) {
      console.error("Error deleting order:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.design_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const orderCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            Custom Orders
          </h1>
          <p className="text-muted-foreground">
            Manage bespoke design requests and track production
          </p>
        </div>

        {canEdit && (
          <Button onClick={() => { setSelectedOrder(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Custom Order
          </Button>
        )}
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {["pending", "confirmed", "cutting", "sewing", "fitting", "ready"].map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-colors ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{orderCounts[status] || 0}</p>
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? "No orders match your filters" : "No custom orders yet"}
              </p>
              {canEdit && !searchQuery && statusFilter === "all" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setSelectedOrder(null); setModalOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Order
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Design</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {order.customers?.name || "Walk-in"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="capitalize">{order.design_type || "Custom"}</p>
                          {order.fabric && (
                            <p className="text-xs text-muted-foreground">{order.fabric}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.due_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(order.due_date), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[order.status]?.variant || "outline"}>
                          {STATUS_CONFIG[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.estimated_cost ? (
                          <div>
                            <p className="font-medium">{currencySymbol}{order.estimated_cost.toLocaleString()}</p>
                            {order.deposit_paid && order.deposit_paid > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Deposit: {currencySymbol}{order.deposit_paid.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(order)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setOrderToDelete(order);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomOrderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
        onSuccess={fetchOrders}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order "{orderToDelete?.order_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
