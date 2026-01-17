import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Building2, UserCheck, UserX, Loader2, Shield, Edit, UserPlus, Clock, Briefcase, DollarSign, Store, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useTenant } from "@/hooks/useTenant";
import { StaffProfileModal } from "./StaffProfileModal";
import { EmployeeManager } from "./EmployeeManager";
import { PayrollManager } from "./PayrollManager";
import { AgentTransactionsManager } from "./AgentTransactionsManager";
import { AttendanceManager } from "./AttendanceManager";
import { FeatureGuard } from "./FeatureGuard";

interface AgentApplication {
  id: string;
  business_name: string;
  contact_person: string;
  phone_number: string;
  province: string;
  business_type: string;
  status: string;
  created_at: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  department: string | null;
  avatar_url: string | null;
  last_login: string | null;
  role: "admin" | "manager" | "viewer";
}

interface AuthorizedEmail {
  id: string;
  email: string;
  default_role: "admin" | "manager" | "viewer";
  created_at: string;
}

export function HRAgent() {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AuthorizedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { isEnabled, terminology } = useFeatures();
  const { tenantId } = useTenant();

  const showAgents = isEnabled('agents');

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    if (!tenantId) return;
    
    try {
      setStaffLoading(true);
      
      // Query tenant_users for users belonging to this tenant
      const { data: tenantUsers, error: tenantUsersError } = await supabase
        .from("tenant_users")
        .select("id, user_id, role, is_owner")
        .eq("tenant_id", tenantId);

      if (tenantUsersError) throw tenantUsersError;

      // Get user_ids to fetch profiles
      const userIds = (tenantUsers || []).map(tu => tu.user_id);
      
      // Fetch profiles for these users
      let profilesMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, title, department, avatar_url, last_login")
          .in("user_id", userIds);
        
        if (!profilesError && profiles) {
          profiles.forEach(p => profilesMap.set(p.user_id, p));
        }
      }

      const staffWithRoles: StaffMember[] = (tenantUsers || []).map((tu) => {
        const profile = profilesMap.get(tu.user_id);
        return {
          id: profile?.id || tu.id,
          user_id: tu.user_id,
          full_name: profile?.full_name || null,
          title: profile?.title || null,
          department: profile?.department || null,
          avatar_url: profile?.avatar_url || null,
          last_login: profile?.last_login || null,
          role: tu.role as "admin" | "manager" | "viewer",
        };
      });

      setStaffMembers(staffWithRoles);

      // Fetch authorized emails for this tenant
      const { data: authorizedEmails, error: authError } = await supabase
        .from("authorized_emails")
        .select("*")
        .eq("tenant_id", tenantId);

      if (authError) throw authError;
      setPendingUsers(authorizedEmails || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive",
      });
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    if (tenantId) {
      fetchStaffMembers();
    }

    const channel = supabase
      .channel("applications-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_applications" },
        () => fetchApplications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const handleApprove = async (application: AgentApplication) => {
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({ status: "approved" })
        .eq("id", application.id);

      if (error) throw error;

      toast({
        title: "Agent Approved!",
        description: `Welcome Email & Contract Sent to ${application.contact_person}`,
      });

      fetchApplications();
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId);

      if (error) throw error;

      toast({
        title: "Application Rejected",
        description: "The application has been rejected",
      });

      fetchApplications();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Manager</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Viewer</Badge>;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setProfileModalOpen(true);
  };

  const roleCounts = {
    admin: staffMembers.filter((s) => s.role === "admin").length,
    manager: staffMembers.filter((s) => s.role === "manager").length,
    viewer: staffMembers.filter((s) => s.role === "viewer").length,
  };

  const pendingApplications = applications.filter((a) => a.status === "pending").length;
  const approvedAgents = applications.filter((a) => a.status === "approved").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Wrap entire component with FeatureGuard for payroll
  return (
    <FeatureGuard feature="payroll" featureName="HR & Payroll">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">HR & Staff Management</h1>
            <p className="text-muted-foreground">Manage staff, employees, payroll, and distribution partners</p>
          </div>
        </div>

        <Tabs defaultValue="bms-staff" className="space-y-6">
          <TabsList className={`grid w-full max-w-3xl ${showAgents ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <TabsTrigger value="bms-staff" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">BMS Staff</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Payroll</span>
            </TabsTrigger>
            {showAgents && (
              <>
                <TabsTrigger value="agents" className="flex items-center gap-1">
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:inline">Partners</span>
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-1 relative">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Applications</span>
                  {pendingApplications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingApplications}
                    </span>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* BMS Staff Tab */}
          <TabsContent value="bms-staff" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                  <div className="text-2xl font-bold">{staffMembers.length}</div>
                  <div className="text-xs text-muted-foreground">Total BMS Users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{roleCounts.admin}</div>
                  <div className="text-xs text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{roleCounts.manager}</div>
                  <div className="text-xs text-muted-foreground">Managers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{roleCounts.viewer}</div>
                  <div className="text-xs text-muted-foreground">Viewers</div>
                </CardContent>
              </Card>
            </div>

            {staffLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffMembers.map((staff) => (
                  <Card key={staff.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={staff.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(staff.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{staff.full_name || "Unnamed User"}</h3>
                            {getRoleBadge(staff.role)}
                          </div>
                          {staff.title && (
                            <p className="text-sm text-muted-foreground">{staff.title}</p>
                          )}
                          {staff.department && (
                            <p className="text-xs text-muted-foreground">{staff.department}</p>
                          )}
                          {staff.last_login && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Last login: {new Date(staff.last_login).toLocaleDateString()}
                            </div>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => handleEditStaff(staff)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Profile
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Authorized Emails ({pendingUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">{user.email}</span>
                        {getRoleBadge(user.default_role)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <EmployeeManager />
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AttendanceManager />
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <PayrollManager />
          </TabsContent>

          {/* Agents Tab - Only if agents feature enabled */}
          {showAgents && (
            <TabsContent value="agents">
              <FeatureGuard feature="agents" featureName="Distribution Partners">
                <AgentTransactionsManager />
              </FeatureGuard>
            </TabsContent>
          )}

          {/* Applications Tab - Only if agents feature enabled */}
          {showAgents && (
            <TabsContent value="applications" className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
                    <div className="text-2xl font-bold">{applications.length}</div>
                    <div className="text-xs text-muted-foreground">Total Applications</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{pendingApplications}</div>
                    <div className="text-xs text-muted-foreground">Pending Review</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{approvedAgents}</div>
                    <div className="text-xs text-muted-foreground">Approved Partners</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Partner Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.business_name}</TableCell>
                          <TableCell>
                            <div>{app.contact_person}</div>
                            <div className="text-xs text-muted-foreground">{app.phone_number}</div>
                          </TableCell>
                          <TableCell>{app.province}</TableCell>
                          <TableCell>{app.business_type}</TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {app.status === "pending" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleApprove(app)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleReject(app.id)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <StaffProfileModal
          staff={selectedStaff}
          open={profileModalOpen}
          onOpenChange={(open) => {
            setProfileModalOpen(open);
            if (!open) setSelectedStaff(null);
          }}
          onSuccess={fetchStaffMembers}
          isAdmin={true}
        />
      </motion.div>
    </FeatureGuard>
  );
}