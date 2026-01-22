import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Factory, 
  Clock, 
  Scissors, 
  CheckCircle2, 
  Truck, 
  User,
  Calendar,
  Phone,
  MoreVertical,
  Search,
  RefreshCw,
  TrendingUp,
  Package,
  AlertCircle,
  Sparkles,
  GripVertical,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format, differenceInDays, isPast } from "date-fns";
import { ProductionQCModal } from "./ProductionQCModal";
import type { QCCheckItem } from "./QualityControlChecklist";

interface CustomOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  design_type: string | null;
  fabric: string | null;
  color: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  estimated_cost: number | null;
  customer?: {
    name: string | null;
    phone: string | null;
  } | null;
}

type KanbanStatus = 'pending' | 'confirmed' | 'cutting' | 'sewing' | 'fitting' | 'ready' | 'delivered';

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string; bgColor: string }[] = [
  { id: 'pending', label: 'Pending', icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'cutting', label: 'Cutting', icon: Scissors, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'sewing', label: 'Sewing', icon: Factory, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { id: 'fitting', label: 'Fitting', icon: User, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { id: 'ready', label: 'Ready', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { id: 'delivered', label: 'Delivered', icon: Truck, color: 'text-green-700', bgColor: 'bg-green-100' },
];

export function ProductionFloor() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanStatus | null>(null);
  
  // QC Gate Modal state
  const [showQCModal, setShowQCModal] = useState(false);
  const [pendingQCOrder, setPendingQCOrder] = useState<CustomOrder | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchOrders();
    }
  }, [tenantId]);

  const fetchOrders = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_orders')
        .select(`
          id, order_number, customer_id, design_type, fabric, color, 
          status, due_date, assigned_to, created_at, estimated_cost,
          customers:customer_id (name, phone)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedOrders: CustomOrder[] = (data || []).map((order: any) => ({
        ...order,
        customer: order.customers,
      }));
      
      setOrders(mappedOrders);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load production orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const inProgress = orders.filter(o => ['cutting', 'sewing', 'fitting'].includes(o.status)).length;
    const overdue = orders.filter(o => o.due_date && isPast(new Date(o.due_date)) && o.status !== 'delivered').length;
    const totalValue = orders.filter(o => o.status !== 'delivered').reduce((sum, o) => sum + (o.estimated_cost || 0), 0);
    const completedThisWeek = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      const created = new Date(o.created_at);
      return differenceInDays(new Date(), created) <= 7;
    }).length;
    
    return { inProgress, overdue, totalValue, completedThisWeek };
  }, [orders]);

  const handleDragStart = (orderId: string) => {
    setDraggedOrder(orderId);
  };

  const handleDragOver = (e: React.DragEvent, status: KanbanStatus) => {
    e.preventDefault();
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (newStatus: KanbanStatus) => {
    if (!draggedOrder) return;
    setDropTarget(null);

    const order = orders.find(o => o.id === draggedOrder);
    if (!order || order.status === newStatus) {
      setDraggedOrder(null);
      return;
    }

    // Intercept sewing → fitting transition for QC gate
    if (order.status === 'sewing' && newStatus === 'fitting') {
      setPendingQCOrder(order);
      setShowQCModal(true);
      setDraggedOrder(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_orders')
        .update({ status: newStatus })
        .eq('id', draggedOrder);

      if (error) throw error;

      setOrders(prev => 
        prev.map(o => 
          o.id === draggedOrder ? { ...o, status: newStatus } : o
        )
      );

      toast({
        title: "Status Updated",
        description: `Order moved to ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setDraggedOrder(null);
    }
  };

  // Handle QC approval - order already updated by modal
  const handleQCApproved = (orderId: string, qcData: { qcChecks: QCCheckItem[]; qcNotes: string }) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId ? { ...o, status: 'fitting' } : o
      )
    );
    setShowQCModal(false);
    setPendingQCOrder(null);
  };

  const handleQCModalClose = () => {
    setShowQCModal(false);
    setPendingQCOrder(null);
  };

  const getOrdersByStatus = (status: KanbanStatus) => {
    return orders.filter(order => 
      order.status === status &&
      (searchQuery === '' || 
        order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.design_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  const getOrderUrgency = (order: CustomOrder) => {
    if (!order.due_date) return 'normal';
    const daysUntilDue = differenceInDays(new Date(order.due_date), new Date());
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 2) return 'urgent';
    if (daysUntilDue <= 5) return 'soon';
    return 'normal';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Factory className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Factory className="h-5 w-5 text-white" />
            </div>
            Production Floor
          </h1>
          <p className="text-muted-foreground mt-1">
            Track custom orders through your production pipeline
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600/80">In Progress</p>
                <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Factory className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${stats.overdue > 0 ? 'from-red-50 to-red-100/50 border-red-200/50' : 'from-emerald-50 to-emerald-100/50 border-emerald-200/50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${stats.overdue > 0 ? 'text-red-600/80' : 'text-emerald-600/80'}`}>
                  {stats.overdue > 0 ? 'Overdue' : 'On Track'}
                </p>
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {stats.overdue > 0 ? stats.overdue : '✓'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stats.overdue > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'} flex items-center justify-center`}>
                {stats.overdue > 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600/80">Pipeline Value</p>
                <p className="text-2xl font-bold text-amber-700">K{stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600/80">Completed (7d)</p>
                <p className="text-2xl font-bold text-purple-700">{stats.completedThisWeek}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="grid grid-cols-7 gap-3 min-w-[1400px]">
          {KANBAN_COLUMNS.map((column, colIndex) => {
            const ColumnIcon = column.icon;
            const columnOrders = getOrdersByStatus(column.id);
            const isDropping = dropTarget === column.id;
            
            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIndex * 0.05 }}
                className="min-w-[200px]"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.id)}
              >
                <Card className={`transition-all duration-200 ${
                  isDropping 
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}>
                  <CardHeader className="py-3 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${column.bgColor} flex items-center justify-center`}>
                          <ColumnIcon className={`h-4 w-4 ${column.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xs font-semibold">{column.label}</CardTitle>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs font-bold h-5 min-w-5 flex items-center justify-center">
                        {columnOrders.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 space-y-2 min-h-[300px] max-h-[60vh] overflow-y-auto">
                    <AnimatePresence>
                      {columnOrders.map((order, orderIndex) => {
                        const urgency = getOrderUrgency(order);
                        const isDragging = draggedOrder === order.id;
                        
                        return (
                          <motion.div
                            key={order.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: orderIndex * 0.02 }}
                            draggable
                            onDragStart={() => handleDragStart(order.id)}
                            className={`group bg-background border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${
                              urgency === 'overdue' ? 'border-red-200 bg-red-50/50' :
                              urgency === 'urgent' ? 'border-amber-200 bg-amber-50/50' :
                              'border-border'
                            }`}
                          >
                            {/* Drag Handle */}
                            <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {order.customer?.name || 'Walk-in'}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {order.order_number}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  <DropdownMenuItem>Edit Order</DropdownMenuItem>
                                  <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-1 mb-2">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {order.design_type || 'Custom'}
                              </Badge>
                              {/* QC Status Badge */}
                              {order.status === 'sewing' && (
                                <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                  QC Pending
                                </Badge>
                              )}
                              {['fitting', 'ready', 'delivered'].includes(order.status) && (
                                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                  QC ✓
                                </Badge>
                              )}
                            </div>

                            {order.fabric && (
                              <p className="text-[10px] text-muted-foreground mb-2 truncate">
                                {order.fabric} • {order.color || 'TBD'}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                              {order.due_date ? (
                                <div className={`flex items-center gap-1 ${
                                  urgency === 'overdue' ? 'text-red-600 font-medium' :
                                  urgency === 'urgent' ? 'text-amber-600 font-medium' :
                                  ''
                                }`}>
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(order.due_date), 'MMM d')}
                                  {urgency === 'overdue' && <AlertCircle className="h-3 w-3" />}
                                </div>
                              ) : (
                                <span className="opacity-50">No due date</span>
                              )}
                              {order.estimated_cost && (
                                <span className="font-semibold text-emerald-600">
                                  K{order.estimated_cost.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {columnOrders.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 text-center">
                        <div className={`w-10 h-10 rounded-full ${column.bgColor} flex items-center justify-center mb-2 opacity-50`}>
                          <ColumnIcon className={`h-5 w-5 ${column.color}`} />
                        </div>
                        <p className="text-xs text-muted-foreground">No orders</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* QC Gate Modal */}
      <ProductionQCModal
        open={showQCModal}
        order={pendingQCOrder}
        onClose={handleQCModalClose}
        onApproved={handleQCApproved}
      />
    </motion.div>
  );
}
