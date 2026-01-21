import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format } from "date-fns";

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
  // Joined fields
  customer?: {
    name: string | null;
    phone: string | null;
  } | null;
}

type KanbanStatus = 'pending' | 'confirmed' | 'cutting' | 'sewing' | 'fitting' | 'ready' | 'delivered';

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string }[] = [
  { id: 'pending', label: 'Pending', icon: Clock, color: 'bg-slate-500' },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500' },
  { id: 'cutting', label: 'Cutting', icon: Scissors, color: 'bg-amber-500' },
  { id: 'sewing', label: 'Sewing', icon: Factory, color: 'bg-purple-500' },
  { id: 'fitting', label: 'Fitting', icon: User, color: 'bg-pink-500' },
  { id: 'ready', label: 'Ready', icon: CheckCircle2, color: 'bg-emerald-500' },
  { id: 'delivered', label: 'Delivered', icon: Truck, color: 'bg-green-600' },
];

export function ProductionFloor() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);

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
      
      // Map the joined data to our interface
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

  const handleDragStart = (orderId: string) => {
    setDraggedOrder(orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: KanbanStatus) => {
    if (!draggedOrder) return;

    try {
      const { error } = await supabase
        .from('custom_orders')
        .update({ status: newStatus })
        .eq('id', draggedOrder);

      if (error) throw error;

      setOrders(prev => 
        prev.map(order => 
          order.id === draggedOrder ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: "Status Updated",
        description: `Order moved to ${newStatus}`,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <Factory className="h-6 w-6 text-amber-600" />
            Production Floor
          </h1>
          <p className="text-[#004B8D]/60">
            Track and manage custom orders through the production pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const ColumnIcon = column.icon;
          const columnOrders = getOrdersByStatus(column.id);
          
          return (
            <div
              key={column.id}
              className="min-w-[250px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <Card className="bg-muted/30 border-muted">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${column.color}`} />
                      <CardTitle className="text-sm font-medium">{column.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnOrders.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-2 space-y-2 min-h-[200px]">
                  {columnOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      draggable
                      onDragStart={() => handleDragStart(order.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`bg-background border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${
                        draggedOrder === order.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {order.customer?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.order_number}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Order</DropdownMenuItem>
                            <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <Badge variant="outline" className="text-xs mb-2">
                        {order.design_type || 'Custom'}
                      </Badge>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        {order.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.due_date), 'MMM d')}
                          </div>
                        )}
                        {order.customer?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer.phone.slice(-4)}
                          </div>
                        )}
                      </div>

                      {order.estimated_cost && (
                        <p className="text-xs font-medium text-emerald-600 mt-2">
                          K{order.estimated_cost.toLocaleString()}
                        </p>
                      )}
                    </motion.div>
                  ))}

                  {columnOrders.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                      No orders
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
