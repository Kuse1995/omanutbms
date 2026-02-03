import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// CustomOrderModal is no longer used - all edit/create flows use CustomDesignWizard for consistency
import { CustomDesignWizard } from "./CustomDesignWizard";
import { OrderToInvoiceModal } from "./OrderToInvoiceModal";
import { ReceiptModal } from "./ReceiptModal";
import { InvoiceViewModal } from "./InvoiceViewModal";
import { AssignedOrdersSection } from "./AssignedOrdersSection";
import { Scissors, Plus, Search, Edit, Trash2, Loader2, Calendar, User, FileText, CreditCard, Eye, Sparkles, CheckCircle, ArrowRightLeft, PlayCircle } from "lucide-react";
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
  quoted_price: number | null;
  deposit_paid: number | null;
  order_date: string;
  due_date: string | null;
  collection_date: string | null;
  status: string;
  assigned_to: string | null;
  invoice_id: string | null;
  created_at: string;
  // Handoff fields
  handoff_step: number | null;
  handoff_status: string | null;
  assigned_operations_user_id: string | null;
  handoff_notes: string | null;
  customers?: { name: string; email: string | null; phone: string | null } | null;
  employees?: { full_name: string } | null;
  invoices?: { 
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    status: string;
  } | null;
}

const HANDOFF_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_handoff: { label: "Pending Handoff", color: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "With Ops", color: "bg-blue-100 text-blue-700 border-blue-200" },
  handed_back: { label: "Handed Back", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
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
  const { tenant, tenantUser, loading: tenantLoading } = useTenant();
  const { isAdmin, canEdit: canEditRole, user, role } = useAuth();
  const { currencySymbol } = useBusinessConfig();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // modalOpen and selectedOrder removed - all flows now use wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContinueOrderId, setWizardContinueOrderId] = useState<string | null>(null);
  const [isOpsContinuation, setIsOpsContinuation] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<CustomOrder | null>(null);

  const canEdit = isAdmin || canEditRole;
  // Check operations role from both tenantUser and useAuth role for reliability
  const isOperationsRole = tenantUser?.role === 'operations_manager' || role === 'operations_manager';

  // Handle continuing an order (for ops handoff)
  const handleContinueOrder = (orderId: string) => {
    setWizardContinueOrderId(orderId);
    setIsOpsContinuation(true);
    setWizardOpen(true);
  };

  const fetchOrders = async () => {
    if (!tenant?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("custom_orders")
        .select(`
          *,
          customers(name, email, phone),
          employees!custom_orders_assigned_to_fkey(full_name),
          invoices(id, invoice_number, total_amount, paid_amount, status)
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

  // Handle orderId from URL (deep-linking from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl && !wizardOpen) {
      // Open the wizard for the specific order
      setWizardContinueOrderId(orderIdFromUrl);
      setIsOpsContinuation(false);
      setWizardOpen(true);
      // Clear the orderId from URL to prevent re-opening on navigation
      searchParams.delete('orderId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, wizardOpen, setSearchParams]);

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
    // Use the wizard for editing to maintain consistency with new order flow
    setWizardContinueOrderId(order.id);
    setIsOpsContinuation(false); // Not ops continuation, just regular edit
    setWizardOpen(true);
  };

  const handleGenerateInvoice = (order: CustomOrder) => {
    setSelectedOrder(order);
    setInvoiceModalOpen(true);
  };

  const handleRecordPayment = (order: CustomOrder) => {
    if (order.invoices) {
      setSelectedInvoice({
        id: order.invoices.id,
        invoice_number: order.invoices.invoice_number,
        client_name: order.customers?.name || "Walk-in",
        client_email: order.customers?.email || null,
        total_amount: order.invoices.total_amount,
        paid_amount: order.invoices.paid_amount,
      });
      setReceiptModalOpen(true);
    }
  };

  const handleViewInvoice = (order: CustomOrder) => {
    if (order.invoices) {
      setSelectedInvoice({
        id: order.invoices.id,
        invoice_number: order.invoices.invoice_number,
        client_name: order.customers?.name || "Walk-in",
        total_amount: order.invoices.total_amount,
        paid_amount: order.invoices.paid_amount,
        status: order.invoices.status,
      });
      setViewInvoiceModalOpen(true);
    }
  };

  const getPaymentStatus = (order: CustomOrder) => {
    const quoted = order.quoted_price || order.estimated_cost || 0;
    if (!quoted) return null;
    
    if (order.invoices) {
      const paid = order.invoices.paid_amount || 0;
      const total = order.invoices.total_amount;
      const balance = total - paid;
      
      if (balance <= 0) return { status: "paid", label: "Paid", variant: "default" as const };
      if (paid > 0) return { status: "partial", label: `Bal: ${currencySymbol}${balance.toLocaleString()}`, variant: "secondary" as const };
      return { status: "unpaid", label: "Unpaid", variant: "outline" as const };
    }
    
    // No invoice yet - show deposit status
    const deposit = order.deposit_paid || 0;
    if (deposit > 0) {
      return { status: "deposit", label: `Deposit: ${currencySymbol}${deposit.toLocaleString()}`, variant: "secondary" as const };
    }
    return { status: "none", label: "No Payment", variant: "outline" as const };
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
          <Button 
            onClick={() => {
              setWizardContinueOrderId(null);
              setIsOpsContinuation(false);
              setWizardOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            New Custom Order
          </Button>
        )}
      </div>

      {/* My Assigned Orders - For Operations Officers */}
      {isOperationsRole && (
        <AssignedOrdersSection onContinueOrder={handleContinueOrder} />
      )}

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
                  onClick={() => { 
                    setWizardContinueOrderId(null);
                    setIsOpsContinuation(false);
                    setWizardOpen(true);
                  }}
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
                    <TableHead className="text-right">Quoted</TableHead>
                    <TableHead className="text-center">Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const paymentStatus = getPaymentStatus(order);
                    const quoted = order.quoted_price || order.estimated_cost || 0;
                    const canGenerateInvoice = order.status !== "pending" && order.status !== "cancelled" && !order.invoice_id && quoted > 0;
                    const hasInvoice = !!order.invoice_id;
                    const invoiceBalance = hasInvoice && order.invoices 
                      ? order.invoices.total_amount - (order.invoices.paid_amount || 0)
                      : 0;

                    return (
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
                          {(order.collection_date || order.due_date) ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(order.collection_date || order.due_date!), "MMM d, yyyy")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={STATUS_CONFIG[order.status]?.variant || "outline"}>
                              {STATUS_CONFIG[order.status]?.label || order.status}
                            </Badge>
                            {order.handoff_status && HANDOFF_STATUS_CONFIG[order.handoff_status] && (
                              <Badge variant="outline" className={`text-xs ${HANDOFF_STATUS_CONFIG[order.handoff_status].color}`}>
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                {HANDOFF_STATUS_CONFIG[order.handoff_status].label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {quoted > 0 ? (
                            <p className="font-medium">{currencySymbol}{quoted.toLocaleString()}</p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {paymentStatus ? (
                            <Badge 
                              variant={paymentStatus.variant}
                              className={paymentStatus.status === "paid" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                            >
                              {paymentStatus.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {paymentStatus.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex justify-end gap-1">
                              {/* Invoice/Payment Actions */}
                              {canGenerateInvoice && canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-primary hover:text-primary"
                                      onClick={() => handleGenerateInvoice(order)}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Generate Invoice</TooltipContent>
                                </Tooltip>
                              )}
                              
                              {hasInvoice && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleViewInvoice(order)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Invoice</TooltipContent>
                                  </Tooltip>
                                  
                                  {invoiceBalance > 0 && canEdit && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-green-600 hover:text-green-700"
                                          onClick={() => handleRecordPayment(order)}
                                        >
                                          <CreditCard className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Record Payment</TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              )}

                              {/* Edit/Delete Actions */}
                              {canEdit && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(order)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Order</TooltipContent>
                                  </Tooltip>
                                  
                                  {isAdmin && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
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
                                      </TooltipTrigger>
                                      <TooltipContent>Delete Order</TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Order Wizard - used for both new orders and editing */}

      {/* New order wizard with sketch upload & QC */}
      <CustomDesignWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setWizardContinueOrderId(null);
          setIsOpsContinuation(false);
        }}
        onSuccess={fetchOrders}
        editOrderId={wizardContinueOrderId}
        isOperationsContinuation={isOpsContinuation}
      />

      {/* Generate Invoice Modal */}
      <OrderToInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        order={selectedOrder}
        onSuccess={fetchOrders}
      />

      {/* Record Payment Modal */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        onSuccess={fetchOrders}
        invoice={selectedInvoice}
      />

      {/* View Invoice Modal */}
      <InvoiceViewModal
        isOpen={viewInvoiceModalOpen}
        onClose={() => setViewInvoiceModalOpen(false)}
        invoice={selectedInvoice}
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
