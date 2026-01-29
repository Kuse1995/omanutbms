import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface LiveEvent {
  id: string;
  type: "sale" | "payment" | "low_stock" | "invoice" | "order_update";
  title: string;
  description: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  read?: boolean;
}

interface UseAdvisorLiveContextOptions {
  enabled?: boolean;
  maxEvents?: number;
}

export function useAdvisorLiveContext(options: UseAdvisorLiveContextOptions = {}) {
  const { enabled = true, maxEvents = 20 } = options;
  const { tenantId, businessProfile } = useTenant();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Only enable real-time for Pro and Enterprise
  const isProOrHigher = businessProfile?.billing_plan !== "starter";
  const shouldSubscribe = enabled && isProOrHigher && !!tenantId;

  const addEvent = useCallback((event: Omit<LiveEvent, "id" | "timestamp" | "read">) => {
    const newEvent: LiveEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setEvents((prev) => {
      const updated = [newEvent, ...prev].slice(0, maxEvents);
      return updated;
    });

    setUnreadCount((prev) => prev + 1);
  }, [maxEvents]);

  const markAllRead = useCallback(() => {
    setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
    setUnreadCount(0);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setUnreadCount(0);
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!shouldSubscribe) return;

    const channel = supabase
      .channel(`advisor-live-${tenantId}`)
      // Listen for new sales
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_transactions",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const sale = payload.new as { total_amount_zmw?: number; customer_name?: string };
          addEvent({
            type: "sale",
            title: "New Sale",
            description: `K${sale.total_amount_zmw?.toLocaleString() || 0} sale${sale.customer_name ? ` to ${sale.customer_name}` : ""}`,
            data: payload.new as Record<string, unknown>,
          });
        }
      )
      // Listen for payments received
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payment_receipts",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const payment = payload.new as { amount_zmw?: number; payer_name?: string };
          addEvent({
            type: "payment",
            title: "Payment Received",
            description: `K${payment.amount_zmw?.toLocaleString() || 0} from ${payment.payer_name || "customer"}`,
            data: payload.new as Record<string, unknown>,
          });
        }
      )
      // Listen for inventory low stock updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inventory",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const item = payload.new as { name?: string; current_stock?: number; reorder_level?: number };
          const oldItem = payload.old as { current_stock?: number };
          
          // Only trigger if stock just went below reorder level
          if (
            item.current_stock !== undefined &&
            item.reorder_level !== undefined &&
            oldItem.current_stock !== undefined &&
            item.current_stock < item.reorder_level &&
            oldItem.current_stock >= item.reorder_level
          ) {
            addEvent({
              type: "low_stock",
              title: "Low Stock Alert",
              description: `${item.name} is down to ${item.current_stock} units`,
              data: payload.new as Record<string, unknown>,
            });
          }
        }
      )
      // Listen for new invoices
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invoices",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const invoice = payload.new as { 
            invoice_number?: string; 
            total_amount?: number; 
            customer_name?: string 
          };
          addEvent({
            type: "invoice",
            title: "Invoice Created",
            description: `${invoice.invoice_number}: K${invoice.total_amount?.toLocaleString() || 0} to ${invoice.customer_name || "customer"}`,
            data: payload.new as Record<string, unknown>,
          });
        }
      )
      // Listen for custom order status changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "custom_orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const order = payload.new as { order_number?: string; status?: string };
          const oldOrder = payload.old as { status?: string };
          
          // Only trigger if status changed
          if (order.status !== oldOrder.status) {
            addEvent({
              type: "order_update",
              title: "Order Update",
              description: `${order.order_number} moved to ${order.status?.replace(/_/g, " ")}`,
              data: payload.new as Record<string, unknown>,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [shouldSubscribe, tenantId, addEvent]);

  // Get summary of recent events for AI context
  const getEventsSummary = useCallback((): string => {
    if (events.length === 0) return "";

    const recentEvents = events.slice(0, 5);
    const summaryLines = recentEvents.map((e) => {
      const timeAgo = getTimeAgo(e.timestamp);
      return `- ${e.title}: ${e.description} (${timeAgo})`;
    });

    return `Recent activity:\n${summaryLines.join("\n")}`;
  }, [events]);

  return {
    events,
    unreadCount,
    markAllRead,
    clearEvents,
    getEventsSummary,
    isSubscribed: shouldSubscribe,
  };
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
