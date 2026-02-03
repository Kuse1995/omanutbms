import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, User, Calendar, ArrowRight, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingOrder {
  id: string;
  order_number: string;
  design_type: string | null;
  collection_date: string | null;
  customers?: { name: string } | null;
  profiles?: { full_name: string } | null;
  handoff_notes: string | null;
}

interface HandoffWelcomeDialogProps {
  orders: PendingOrder[];
  tenantId: string;
  onPickUpAll: () => void;
  onDismiss: () => void;
  onContinueOrder: (orderId: string) => void;
}

export function HandoffWelcomeDialog({
  orders,
  tenantId,
  onPickUpAll,
  onDismiss,
  onContinueOrder,
}: HandoffWelcomeDialogProps) {
  const { toast } = useToast();
  const [isPickingUp, setIsPickingUp] = useState(false);

  const handlePickUpAll = async () => {
    setIsPickingUp(true);
    try {
      const orderIds = orders.map((o) => o.id);
      
      const { error } = await supabase
        .from("custom_orders")
        .update({ handoff_status: "in_progress" })
        .in("id", orderIds);

      if (error) throw error;

      toast({
        title: "Orders picked up",
        description: `${orders.length} order(s) are now in your queue`,
      });
      
      onPickUpAll();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPickingUp(false);
    }
  };

  if (orders.length === 0) return null;

  return (
    <Dialog open={orders.length > 0} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Orders Assigned to You</DialogTitle>
              <DialogDescription>
                You have {orders.length} order{orders.length > 1 ? "s" : ""} waiting
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-4">
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onContinueOrder(order.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{order.order_number}</span>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Awaiting Pickup
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{order.customers?.name || "Walk-in"}</span>
                  <span>•</span>
                  <span>{order.design_type || "Custom"}</span>
                </div>
                {order.collection_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    Due: {format(new Date(order.collection_date), "MMM d")}
                  </div>
                )}
                {order.handoff_notes && (
                  <p className="text-xs text-blue-600 mt-2 line-clamp-2 italic">
                    "{order.handoff_notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
            View Details First
          </Button>
          <Button
            onClick={handlePickUpAll}
            disabled={isPickingUp}
            className="w-full sm:w-auto gap-2"
          >
            {isPickingUp ? (
              "Picking up..."
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Pick Up All ({orders.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
