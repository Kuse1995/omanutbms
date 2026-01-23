import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Calendar, Users, Timer, MapPin, MapPinOff } from "lucide-react";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { useTenant } from "@/hooks/useTenant";

export const AttendanceManager = () => {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { tenantId } = useTenant();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employment_status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["attendance", selectedMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
      const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));
      
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*, employees(full_name)")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        employee_id: string;
        date: string;
        clock_in: string;
        clock_out: string | null;
        work_hours: number | null;
        status: string;
        clock_in_verified: boolean | null;
        clock_in_distance_meters: number | null;
        employees: { full_name: string } | null;
      }>;
    },
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*, employees(full_name)")
        .eq("date", today);
      if (error) throw error;
      return data;
    },
  });

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!tenantId) {
        throw new Error("Unable to determine your organization. Please log in again.");
      }
      
      const { data: user } = await supabase.auth.getUser();
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Check if already clocked in today
      const { data: existing } = await supabase
        .from("employee_attendance")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .is("clock_out", null)
        .single();
      
      if (existing) {
        throw new Error("Employee is already clocked in today");
      }

      const { error } = await supabase.from("employee_attendance").insert({
        employee_id: employeeId,
        clock_in: new Date().toISOString(),
        date: today,
        status: "clocked_in",
        recorded_by: user?.user?.id,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast.success("Employee clocked in successfully");
      setSelectedEmployee("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { data: record } = await supabase
        .from("employee_attendance")
        .select("clock_in")
        .eq("id", attendanceId)
        .single();
      
      if (!record) throw new Error("Attendance record not found");
      
      const clockOut = new Date();
      const clockIn = new Date(record.clock_in);
      const workMinutes = differenceInMinutes(clockOut, clockIn);
      const workHours = Number((workMinutes / 60).toFixed(2));

      const { error } = await supabase
        .from("employee_attendance")
        .update({
          clock_out: clockOut.toISOString(),
          work_hours: workHours,
          status: "clocked_out",
        })
        .eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast.success("Employee clocked out successfully");
    },
    onError: () => {
      toast.error("Failed to clock out");
    },
  });

  const clockedInToday = todayAttendance.filter((a: any) => !a.clock_out);
  const totalHoursToday = todayAttendance.reduce((sum: number, a: any) => sum + (a.work_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LogIn className="h-4 w-4 text-green-500" />
              Clocked In Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clockedInToday.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-500" />
              Hours Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursToday.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Records This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendance.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clock In Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Clock In/Out
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select employee to clock in" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => clockInMutation.mutate(selectedEmployee)}
              disabled={!selectedEmployee || clockInMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          </div>

          {/* Currently Clocked In */}
          {clockedInToday.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Currently Clocked In</h4>
              <div className="flex flex-wrap gap-3">
                {clockedInToday.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2"
                  >
                    <span className="font-medium">{record.employees?.full_name}</span>
                    <span className="text-sm text-muted-foreground">
                      since {format(new Date(record.clock_in), "HH:mm")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clockOutMutation.mutate(record.id)}
                      disabled={clockOutMutation.isPending}
                      className="ml-2"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Out
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance History</CardTitle>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records for this month
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{record.employees?.full_name}</TableCell>
                    <TableCell>{format(new Date(record.clock_in), "HH:mm")}</TableCell>
                    <TableCell>
                      {record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>{record.work_hours ? `${record.work_hours}h` : "-"}</TableCell>
                    <TableCell>
                      {record.clock_in_verified === true ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">{record.clock_in_distance_meters}m</span>
                        </div>
                      ) : record.clock_in_verified === false ? (
                        <div className="flex items-center gap-1 text-amber-500">
                          <MapPinOff className="h-3 w-3" />
                          <span className="text-xs">Unverified</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === "clocked_in" ? "default" : "secondary"}>
                        {record.status === "clocked_in" ? "Active" : "Completed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
