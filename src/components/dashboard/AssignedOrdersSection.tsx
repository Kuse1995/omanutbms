import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowRight, User, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { HandoffWelcomeDialog } from "./HandoffWelcomeDialog";

interface AssignedOrder {
  id: string;
  order_number: string;
  handoff_step: number;
  handoff_status: string;
  handoff_notes: string | null;
  handed_off_at: string | null;
  design_type: string | null;
  collection_date: string | null;
  customers?: { name: string } | null;
  profiles?: { full_name: string } | null; // Admin who assigned
}

const STEP_LABELS = [
  "Client Info",
  "Work Details", 
  "Design Details",
  "Measurements",
  "Sketches & Refs",
  "Smart Pricing",
  "Review & Sign",
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_handoff: { label: "Awaiting You", color: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  handed_back: { label: "Handed Back", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

interface AssignedOrdersSectionProps {
  onContinueOrder: (orderId: string) => void;
}

export function AssignedOrdersSection({ onContinueOrder }: AssignedOrdersSectionProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { currencySymbol } = useBusinessConfig();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<AssignedOrder[]>([]);

  useEffect(() => {
    if (tenantId && user?.id) {
      fetchAssignedOrders();
    }
  }, [tenantId, user?.id]);

  const fetchAssignedOrders = async () => {
    if (!tenantId || !user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("custom_orders")
        .select(`
          id,
          order_number,
          handoff_step,
          handoff_status,
          handoff_notes,
          handed_off_at,
          design_type,
          collection_date,
          customers(name),
          created_by
        `)
        .eq("tenant_id", tenantId)
        .eq("assigned_operations_user_id", user.id)
        .in("handoff_status", ["pending_handoff", "in_progress"])
        .order("handed_off_at", { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map((o: any) => o.created_by).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);
        
        profilesMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {});
      }

      const enriched = (data || []).map((o: any) => ({
        ...o,
        profiles: o.created_by ? { full_name: profilesMap[o.created_by] || "Admin" } : null,
      }));

      setOrders(enriched);

      // Check for pending orders to show welcome dialog (first time only per session)
      const pending = enriched.filter((o: AssignedOrder) => o.handoff_status === 'pending_handoff');
      const sessionKey = `handoff_welcome_shown_${user?.id}`;
      
      if (pending.length > 0 && !sessionStorage.getItem(sessionKey)) {
        setPendingOrders(pending);
        setShowWelcomeDialog(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    } catch (error: any) {
      console.error("Error fetching assigned orders:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePickUp = async (order: AssignedOrder) => {
    try {
      const { error } = await supabase
        .from("custom_orders")
        .update({ handoff_status: "in_progress" })
        .eq("id", order.id);

      if (error) throw error;

      toast({ title: "Order picked up", description: `Now working on ${order.order_number}` });
      fetchAssignedOrders();
      onContinueOrder(order.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleWelcomePickUpAll = () => {
    setShowWelcomeDialog(false);
    setPendingOrders([]);
    fetchAssignedOrders();
  };

  const handleWelcomeDismiss = () => {
    setShowWelcomeDialog(false);
  };

  const handleWelcomeContinue = (orderId: string) => {
    setShowWelcomeDialog(false);
    handlePickUp(orders.find(o => o.id === orderId) as AssignedOrder);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return null; // Don't show section if no assignments
  }

  return (
    <>
      {/* Welcome Dialog for pending assignments */}
      {showWelcomeDialog && tenantId && (
        <HandoffWelcomeDialog
          orders={pendingOrders}
          tenantId={tenantId}
          onPickUpAll={handleWelcomePickUpAll}
          onDismiss={handleWelcomeDismiss}
          onContinueOrder={handleWelcomeContinue}
        />
      )}

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            My Assigned Orders
            <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
        {orders.map((order) => {
          const startStep = (order.handoff_step || 0) + 1;
          const statusConfig = STATUS_CONFIG[order.handoff_status] || STATUS_CONFIG.pending_handoff;

          return (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-background hover:shadow-sm transition-shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.order_number}</span>
                  <Badge variant="outline" className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {order.customers?.name || "Walk-in"}
                  </span>
                  <span>•</span>
                  <span>{order.design_type || "Custom"}</span>
                  {order.collection_date && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(order.collection_date), "MMM d")}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600 font-medium">
                    Start from: Step {startStep} ({STEP_LABELS[startStep] || "Unknown"})
                  </span>
                  {order.profiles?.full_name && (
                    <span className="text-muted-foreground">
                      • Assigned by {order.profiles.full_name}
                    </span>
                  )}
                </div>
                {order.handoff_notes && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs bg-amber-50 text-amber-700 p-2 rounded">
                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{order.handoff_notes}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => order.handoff_status === "pending_handoff" 
                  ? handlePickUp(order) 
                  : onContinueOrder(order.id)
                }
                className="gap-2"
                size="sm"
              >
                {order.handoff_status === "pending_handoff" ? "Pick Up" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        </CardContent>
      </Card>
    </>
  );
}
