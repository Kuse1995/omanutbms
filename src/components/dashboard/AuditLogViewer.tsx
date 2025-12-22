import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw, Loader2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Json | null;
  new_data: Json | null;
  changed_at: string;
  changed_by: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const ITEMS_PER_PAGE = 20;

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", uniqueIds);
    
    if (data) {
      const profileMap = new Map<string, string>();
      data.forEach((p: Profile) => {
        profileMap.set(p.user_id, p.full_name || "Unknown");
      });
      setProfiles(profileMap);
    }
  };

  const fetchLogs = async () => {
    try {
      // Get total count
      let countQuery = supabase
        .from("audit_log")
        .select("*", { count: "exact", head: true });
      
      if (filterTable !== "all") {
        countQuery = countQuery.eq("table_name", filterTable);
      }
      if (filterAction !== "all") {
        countQuery = countQuery.eq("action", filterAction);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (filterTable !== "all") {
        query = query.eq("table_name", filterTable);
      }
      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data || []);
      
      // Fetch profile names for changed_by users
      const userIds = (data || []).map(log => log.changed_by).filter(Boolean) as string[];
      await fetchProfiles(userIds);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterTable, filterAction]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
    toast({ title: "Refreshed", description: "Audit logs updated" });
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      INSERT: "bg-green-100 text-green-700 border-green-200",
      UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
      DELETE: "bg-red-100 text-red-700 border-red-200",
    };
    return styles[action] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getTableBadge = (tableName: string) => {
    const styles: Record<string, string> = {
      invoices: "bg-purple-100 text-purple-700",
      sales_transactions: "bg-emerald-100 text-emerald-700",
      expenses: "bg-amber-100 text-amber-700",
      payment_receipts: "bg-cyan-100 text-cyan-700",
    };
    return styles[tableName] || "bg-gray-100 text-gray-700";
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.record_id.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <Card className="bg-white border-[#004B8D]/10 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#003366] flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Log History
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#004B8D]/50" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#f0f7fa] border-[#004B8D]/20"
            />
          </div>
          <Select value={filterTable} onValueChange={(v) => { setFilterTable(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] bg-[#f0f7fa] border-[#004B8D]/20">
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="invoices">Invoices</SelectItem>
              <SelectItem value="sales_transactions">Sales</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
              <SelectItem value="payment_receipts">Receipts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] bg-[#f0f7fa] border-[#004B8D]/20">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#004B8D]/5">
                <TableHead className="text-[#004B8D]/70">Timestamp</TableHead>
                <TableHead className="text-[#004B8D]/70">Table</TableHead>
                <TableHead className="text-[#004B8D]/70">Action</TableHead>
                <TableHead className="text-[#004B8D]/70">Changed By</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[#004B8D]/50 py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-[#004B8D]/5">
                    <TableCell className="text-[#003366]/70 text-sm">
                      {format(new Date(log.changed_at), "dd MMM yyyy, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTableBadge(log.table_name)}>
                        {log.table_name.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadge(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#003366]">
                      {log.changed_by ? profiles.get(log.changed_by) || "Loading..." : "System"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-[#004B8D] hover:bg-[#004B8D]/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-[#004B8D]/60">
              Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-[#004B8D]/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="border-[#004B8D]/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#003366] flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#004B8D]/60">Table</p>
                    <Badge className={getTableBadge(selectedLog.table_name)}>
                      {selectedLog.table_name}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-[#004B8D]/60">Action</p>
                    <Badge className={getActionBadge(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-[#004B8D]/60">Timestamp</p>
                    <p className="text-[#003366]">
                      {format(new Date(selectedLog.changed_at), "dd MMM yyyy, HH:mm:ss")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#004B8D]/60">Changed By</p>
                    <p className="text-[#003366]">
                      {selectedLog.changed_by ? profiles.get(selectedLog.changed_by) || "Unknown" : "System"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-[#004B8D]/60">Record ID</p>
                    <p className="text-[#003366] font-mono text-sm">{selectedLog.record_id}</p>
                  </div>
                </div>

                {selectedLog.old_data && (
                  <div>
                    <p className="text-sm font-medium text-[#004B8D] mb-2">Previous Data</p>
                    <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs overflow-x-auto text-red-800">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <p className="text-sm font-medium text-[#004B8D] mb-2">New Data</p>
                    <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs overflow-x-auto text-green-800">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
