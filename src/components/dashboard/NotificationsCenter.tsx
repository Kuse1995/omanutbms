import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Mail, Heart, AlertTriangle, ArrowRightLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { throttle } from "@/lib/performance-utils";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: "contact" | "community" | "donation" | "alert" | "handoff" | "handback";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  source_table: string;
  navigate_to: string;
}

export function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  // Stable fetch function that doesn't change between renders
  const fetchNotifications = async () => {
    // Prevent concurrent fetches
    if (!isMountedRef.current) return;
    const allNotifications: Notification[] = [];

    try {
      // Fetch website contacts (pending)
      const { data: contacts } = await supabase
        .from("website_contacts")
        .select("id, sender_name, message, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (contacts) {
        contacts.forEach((c) => {
          allNotifications.push({
            id: c.id,
            type: "contact",
            title: `New message from ${c.sender_name}`,
            message: c.message.substring(0, 50) + (c.message.length > 50 ? "..." : ""),
            created_at: c.created_at,
            is_read: false,
            source_table: "website_contacts",
            navigate_to: "/bms?tab=website&subtab=contacts",
          });
        });
      }

      // Fetch community messages (pending)
      const { data: communityMsgs } = await supabase
        .from("community_messages")
        .select("id, donor_name, message, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (communityMsgs) {
        communityMsgs.forEach((c) => {
          allNotifications.push({
            id: c.id,
            type: "community",
            title: `Community message from ${c.donor_name}`,
            message: c.message.substring(0, 50) + (c.message.length > 50 ? "..." : ""),
            created_at: c.created_at,
            is_read: false,
            source_table: "community_messages",
            navigate_to: "/bms?tab=website&subtab=community",
          });
        });
      }

      // Fetch donation requests (pending)
      const { data: donations } = await supabase
        .from("donation_requests")
        .select("id, donor_name, message, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (donations) {
        donations.forEach((d) => {
          allNotifications.push({
            id: d.id,
            type: "donation",
            title: `Donation request from ${d.donor_name}`,
            message: d.message?.substring(0, 50) + (d.message && d.message.length > 50 ? "..." : "") || "No message",
            created_at: d.created_at,
            is_read: false,
            source_table: "donation_requests",
            navigate_to: "/bms?tab=website&subtab=donations",
          });
        });
      }

      // Fetch admin alerts (unread) - now filtered by target_user_id
      const { data: alerts } = await supabase
        .from("admin_alerts")
        .select("id, message, created_at, is_read, alert_type, target_user_id")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(15);

      if (alerts) {
        alerts.forEach((a: any) => {
          // Determine notification type based on alert_type
          let notifType: Notification["type"] = "alert";
          let title = "System Alert";
          let navigateTo = "/bms?tab=dashboard";

          if (a.alert_type === "low_stock") {
            title = "Low Stock Alert";
            navigateTo = "/bms?tab=inventory";
          } else if (a.alert_type === "order_handoff") {
            notifType = "handoff";
            title = "New Order Assigned";
            navigateTo = "/bms?tab=fashion&subtab=orders";
          } else if (a.alert_type === "order_handed_back") {
            notifType = "handback";
            title = "Order Returned";
            navigateTo = "/bms?tab=fashion&subtab=orders";
          }

          allNotifications.push({
            id: a.id,
            type: notifType,
            title,
            message: a.message.substring(0, 60) + (a.message.length > 60 ? "..." : ""),
            created_at: a.created_at,
            is_read: a.is_read,
            source_table: "admin_alerts",
            navigate_to: navigateTo,
          });
        });
      }

      // Sort by date
      allNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setNotifications(allNotifications.slice(0, 15));
      }
    } catch (error) {
      console.error('[NotificationsCenter] Error fetching notifications:', error);
    }
  };

  // Throttled version for realtime updates (max once per 5 seconds)
  const throttledFetch = useMemo(
    () => throttle(() => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    }, 5000),
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    
    // Only fetch once on mount
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications();
    }

    // Real-time subscriptions with throttled callback
    const contactsChannel = supabase
      .channel("website-contacts-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "website_contacts" },
        throttledFetch
      )
      .subscribe();

    const communityChannel = supabase
      .channel("community-messages-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        throttledFetch
      )
      .subscribe();

    const donationsChannel = supabase
      .channel("donations-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donation_requests" },
        throttledFetch
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("alerts-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_alerts" },
        throttledFetch
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(communityChannel);
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [throttledFetch]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark alert as read if it's an admin alert
    if (notification.source_table === "admin_alerts") {
      await supabase
        .from("admin_alerts")
        .update({ is_read: true })
        .eq("id", notification.id);
      fetchNotifications();
    }
    
    // Close the dropdown and navigate to the relevant page
    setIsOpen(false);
    navigate(notification.navigate_to);
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "contact":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "community":
        return <Mail className="w-4 h-4 text-green-500" />;
      case "donation":
        return <Heart className="w-4 h-4 text-pink-500" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "handoff":
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case "handback":
        return <RotateCcw className="w-4 h-4 text-green-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#004B8D] hover:text-[#003366] hover:bg-[#004B8D]/10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-white border-[#004B8D]/20 z-50"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-[#004B8D]">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#004B8D]/10" />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={`${notification.source_table}-${notification.id}`}
                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 focus:bg-primary/10 transition-colors group"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    View →
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
