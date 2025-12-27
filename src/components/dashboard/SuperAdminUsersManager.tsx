import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Mail } from "lucide-react";
import { format } from "date-fns";

interface AuthorizedEmail {
  id: string;
  email: string;
  default_role: string;
  tenant_id: string;
  created_at: string;
  notes: string | null;
  tenant?: {
    name: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function SuperAdminUsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    email: "",
    tenant_id: "",
    default_role: "viewer" as "admin" | "manager" | "viewer",
    notes: "",
  });

  // Fetch all tenants
  const { data: tenants } = useQuery({
    queryKey: ["all-tenants-for-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .order("name");

      if (error) throw error;
      return data as Tenant[];
    },
  });

  // Fetch all authorized emails across tenants
  const { data: authorizedEmails, isLoading } = useQuery({
    queryKey: ["all-authorized-emails", selectedTenantFilter],
    queryFn: async () => {
      let query = supabase
        .from("authorized_emails")
        .select(`
          *,
          tenant:tenants(name)
        `)
        .order("created_at", { ascending: false });

      if (selectedTenantFilter !== "all") {
        query = query.eq("tenant_id", selectedTenantFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuthorizedEmail[];
    },
  });

  // Add authorized email mutation
  const addEmailMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("authorized_emails")
        .insert({
          email: data.email.toLowerCase(),
          tenant_id: data.tenant_id,
          default_role: data.default_role,
          notes: data.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-authorized-emails"] });
      setIsAddOpen(false);
      resetForm();
      toast({
        title: "User authorized",
        description: "The email has been authorized for the selected tenant.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete authorized email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("authorized_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-authorized-emails"] });
      toast({
        title: "User removed",
        description: "The authorized email has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      tenant_id: "",
      default_role: "viewer",
      notes: "",
    });
  };

  const handleAdd = () => {
    if (!formData.email || !formData.tenant_id) {
      toast({
        title: "Validation error",
        description: "Email and tenant are required.",
        variant: "destructive",
      });
      return;
    }
    addEmailMutation.mutate(formData);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500">Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-500">Manager</Badge>;
      case "viewer":
        return <Badge variant="secondary">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Authorized Users
          </CardTitle>
          <CardDescription>
            Manage authorized users across all tenants
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTenantFilter} onValueChange={setSelectedTenantFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Authorize New User</DialogTitle>
                <DialogDescription>
                  Add an email to allow access to a specific tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant</Label>
                  <Select
                    value={formData.tenant_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, tenant_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.default_role}
                    onValueChange={(value: "admin" | "manager" | "viewer") => 
                      setFormData((prev) => ({ ...prev, default_role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any notes about this user..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={addEmailMutation.isPending}
                >
                  {addEmailMutation.isPending ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {authorizedEmails && authorizedEmails.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorizedEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {email.email}
                    </div>
                  </TableCell>
                  <TableCell>{email.tenant?.name || "Unknown"}</TableCell>
                  <TableCell>{getRoleBadge(email.default_role)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {email.notes || "-"}
                  </TableCell>
                  <TableCell>{format(new Date(email.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEmailMutation.mutate(email.id)}
                      disabled={deleteEmailMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No authorized users found</p>
            <p className="text-sm text-muted-foreground">Add users to allow them access to tenants</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
