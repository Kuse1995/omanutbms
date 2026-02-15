import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, FileText, Package, Users, Receipt, MessageSquare,
  Trash2, PenLine, Plus, Radio
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  table_name: string;
  action: string;
  changed_at: string;
  tenant_id: string | null;
}

const tableIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  sales_transactions: ShoppingCart,
  sales: ShoppingCart,
  invoices: FileText,
  inventory: Package,
  employees: Users,
  payment_receipts: Receipt,
  payroll_records: Users,
  whatsapp_audit_logs: MessageSquare,
  expenses: FileText,
  custom_orders: Package,
};

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INSERT: Plus,
  UPDATE: PenLine,
  DELETE: Trash2,
};

const actionColors: Record<string, string> = {
  INSERT: "text-green-500",
  UPDATE: "text-blue-500",
  DELETE: "text-destructive",
};

const friendlyTableNames: Record<string, string> = {
  sales_transactions: "Sale",
  sales: "Sale",
  invoices: "Invoice",
  inventory: "Inventory Item",
  employees: "Employee",
  payment_receipts: "Receipt",
  payroll_records: "Payroll Record",
  whatsapp_audit_logs: "WhatsApp Message",
  expenses: "Expense",
  custom_orders: "Custom Order",
  job_cards: "Job Card",
  stock_transfers: "Stock Transfer",
};

const friendlyActions: Record<string, string> = {
  INSERT: "created",
  UPDATE: "updated",
  DELETE: "deleted",
};

export function LiveActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["live-activity-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, table_name, action, changed_at, tenant_id")
        .not("changed_by", "is", null)
        .order("changed_at", { ascending: false })
        .limit(25);

      if (error) return [];

      // Fetch tenant names for display
      const tenantIds = [...new Set(data.filter(d => d.tenant_id).map(d => d.tenant_id!))];
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);

      const tenantMap = new Map(tenants?.map(t => [t.id, t.name]) || []);

      return data.map(entry => ({
        ...entry,
        tenant_name: entry.tenant_id ? tenantMap.get(entry.tenant_id) || "Unknown" : null,
      }));
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-4 w-4 text-green-500 animate-pulse" />
          Live Activity
        </CardTitle>
        <CardDescription>Real-time platform activity · refreshes every 15s</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : !activities?.length ? (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {activities.map((entry) => {
                const TableIcon = tableIcons[entry.table_name] || Package;
                const ActionIcon = actionIcons[entry.action] || Plus;
                const actionColor = actionColors[entry.action] || "text-muted-foreground";

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 relative">
                      <div className="p-1.5 bg-muted rounded-md">
                        <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <ActionIcon className={`h-3 w-3 absolute -bottom-0.5 -right-0.5 ${actionColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={`font-medium ${actionColor}`}>
                          {friendlyActions[entry.action] || entry.action}
                        </span>
                        {" "}
                        <span>{friendlyTableNames[entry.table_name] || entry.table_name}</span>
                      </p>
                      {entry.tenant_name && (
                        <p className="text-xs text-muted-foreground truncate">{entry.tenant_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
