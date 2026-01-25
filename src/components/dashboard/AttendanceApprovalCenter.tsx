import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

interface PendingRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  work_hours: number | null;
  edit_status: string;
  requested_times: { clock_in?: string; clock_out?: string; work_hours?: number } | null;
  requested_by: string | null;
  requested_at: string | null;
  change_log: any[];
  employees: { full_name: string } | null;
  requester?: { full_name: string } | null;
}

export const AttendanceApprovalCenter = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { user, profile } = useAuth();

  const { data: pendingRecords = [], isLoading } = useQuery({
    queryKey: ["attendance-pending", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_attendance")
        .select(`
          *,
          employees(full_name)
        `)
        .eq("edit_status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      // Fetch requester names
      const recordsWithRequesters = await Promise.all(
        (data || []).map(async (record: any) => {
          if (record.requested_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", record.requested_by)
              .single();
            return { ...record, requester: profileData };
          }
          return record;
        })
      );

      return recordsWithRequesters as PendingRecord[];
    },
    enabled: !!tenantId,
  });

  const approveMutation = useMutation({
    mutationFn: async (record: PendingRecord) => {
      if (!user || !record.requested_times) throw new Error("Missing data");

      const changeEntry = {
        old_clock_in: record.clock_in,
        old_clock_out: record.clock_out,
        new_clock_in: record.requested_times.clock_in,
        new_clock_out: record.requested_times.clock_out,
        changed_by: record.requested_by,
        approved_by: user.id,
        approved_by_name: profile?.full_name || user.email,
        timestamp: new Date().toISOString(),
        action: "approved",
      };

      const existingLog = Array.isArray(record.change_log) ? record.change_log : [];

      const { error } = await supabase
        .from("employee_attendance")
        .update({
          clock_in: record.requested_times.clock_in,
          clock_out: record.requested_times.clock_out,
          work_hours: record.requested_times.work_hours,
          edit_status: "approved",
          change_log: [...existingLog, changeEntry],
          requested_times: null,
          requested_by: null,
          requested_at: null,
        })
        .eq("id", record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-pending"] });
      toast.success("Attendance adjustment approved");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve", { description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (record: PendingRecord) => {
      if (!user) throw new Error("Not authenticated");

      const changeEntry = {
        requested_clock_in: record.requested_times?.clock_in,
        requested_clock_out: record.requested_times?.clock_out,
        rejected_by: user.id,
        rejected_by_name: profile?.full_name || user.email,
        timestamp: new Date().toISOString(),
        action: "rejected",
      };

      const existingLog = Array.isArray(record.change_log) ? record.change_log : [];

      const { error } = await supabase
        .from("employee_attendance")
        .update({
          edit_status: "approved", // Reset to approved (no changes applied)
          change_log: [...existingLog, changeEntry],
          requested_times: null,
          requested_by: null,
          requested_at: null,
        })
        .eq("id", record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-pending"] });
      toast.info("Attendance adjustment rejected");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject", { description: error.message });
    },
  });

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return "-";
    try {
      return format(new Date(isoString), "HH:mm");
    } catch {
      return "-";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading pending approvals...
        </CardContent>
      </Card>
    );
  }

  if (pendingRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Approval Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mb-2 text-green-500" />
            <p>No pending attendance adjustments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance Approval Center
          <Badge variant="secondary" className="ml-2">
            {pendingRecords.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Original Times</TableHead>
              <TableHead></TableHead>
              <TableHead>Requested Times</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRecords.map((record) => (
              <TableRow key={record.id} className="bg-amber-50/50">
                <TableCell className="font-medium">
                  {record.employees?.full_name}
                </TableCell>
                <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>In: {formatTime(record.clock_in)}</div>
                    <div>Out: {formatTime(record.clock_out)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-primary">
                    <div>In: {formatTime(record.requested_times?.clock_in)}</div>
                    <div>Out: {formatTime(record.requested_times?.clock_out)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{record.requester?.full_name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.requested_at && format(new Date(record.requested_at), "MMM dd, HH:mm")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(record)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate(record)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="text-destructive border-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};