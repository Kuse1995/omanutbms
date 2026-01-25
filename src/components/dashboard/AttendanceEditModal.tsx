import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  work_hours: number | null;
  status: string;
  change_log?: any[];
  edit_status?: string;
  requested_times?: { clock_in?: string; clock_out?: string };
  employees: { full_name: string } | null;
}

interface AttendanceEditModalProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceEditModal = ({ record, isOpen, onClose }: AttendanceEditModalProps) => {
  const queryClient = useQueryClient();
  const { user, role, profile } = useAuth();
  const isAdmin = role === "admin";
  
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");

  // Initialize times when record changes
  useEffect(() => {
    if (record && isOpen) {
      setClockInTime(format(new Date(record.clock_in), "HH:mm"));
      setClockOutTime(record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "");
    }
  }, [record, isOpen]);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!record || !user) throw new Error("Missing record or user");

      const recordDate = record.date;
      const newClockIn = clockInTime ? `${recordDate}T${clockInTime}:00` : null;
      const newClockOut = clockOutTime ? `${recordDate}T${clockOutTime}:00` : null;

      // Calculate new work hours if both times are set
      let newWorkHours = record.work_hours;
      if (newClockIn && newClockOut) {
        const clockInDate = new Date(newClockIn);
        const clockOutDate = new Date(newClockOut);
        const diffMinutes = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60);
        newWorkHours = Number((diffMinutes / 60).toFixed(2));
      }

      // Build change log entry
      const changeEntry = {
        old_clock_in: record.clock_in,
        old_clock_out: record.clock_out,
        new_clock_in: newClockIn,
        new_clock_out: newClockOut,
        changed_by: user.id,
        changed_by_name: profile?.full_name || user.email,
        timestamp: new Date().toISOString(),
        is_admin_change: isAdmin,
      };

      const existingLog = Array.isArray(record.change_log) ? record.change_log : [];

      if (isAdmin) {
        // Admin: Apply changes immediately
        const { error } = await supabase
          .from("employee_attendance")
          .update({
            clock_in: newClockIn,
            clock_out: newClockOut,
            work_hours: newWorkHours,
            change_log: [...existingLog, changeEntry],
            edit_status: "approved",
            requested_times: null,
            requested_by: null,
            requested_at: null,
          })
          .eq("id", record.id);

        if (error) throw error;
        return { approved: true };
      } else {
        // Manager: Set to pending status
        const { error } = await supabase
          .from("employee_attendance")
          .update({
            edit_status: "pending",
            requested_times: { 
              clock_in: newClockIn, 
              clock_out: newClockOut,
              work_hours: newWorkHours,
            },
            requested_by: user.id,
            requested_at: new Date().toISOString(),
          })
          .eq("id", record.id);

        if (error) throw error;
        return { approved: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-pending"] });
      
      if (result.approved) {
        toast.success("Attendance record updated successfully");
      } else {
        toast.info("Change request submitted for admin approval", {
          description: "The adjustment is pending approval.",
          icon: <Clock className="h-4 w-4" />,
        });
      }
      onClose();
    },
    onError: (error: Error) => {
      toast.error("Failed to update attendance", { description: error.message });
    },
  });

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Attendance Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            <strong>{record.employees?.full_name}</strong> - {format(new Date(record.date), "MMMM dd, yyyy")}
          </div>

          {!isAdmin && (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                As a Manager, your changes will require Admin approval before taking effect.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clock In Time</Label>
              <div className="text-xs text-muted-foreground mb-1">
                Original: {format(new Date(record.clock_in), "HH:mm")}
              </div>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clock Out Time</Label>
              <div className="text-xs text-muted-foreground mb-1">
                Original: {record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "Not set"}
              </div>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
              />
            </div>
          </div>

          {record.edit_status === "pending" && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This record has a pending change request awaiting approval.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => editMutation.mutate()} 
            disabled={editMutation.isPending}
          >
            {isAdmin ? "Apply Changes" : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};