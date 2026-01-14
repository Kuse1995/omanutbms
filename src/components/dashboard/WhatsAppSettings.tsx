import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Plus, Trash2, Phone, User, Shield, Loader2, Info } from "lucide-react";
import { format } from "date-fns";

interface WhatsAppMapping {
  id: string;
  tenant_id: string;
  user_id: string;
  whatsapp_number: string;
  display_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface TenantUser {
  user_id: string;
  role: string;
  profiles: { full_name: string | null } | null;
}

export function WhatsAppSettings() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    user_id: "",
    whatsapp_number: "+260",
    display_name: "",
    role: "viewer",
  });

  // Fetch WhatsApp mappings
  const { data: mappings, isLoading } = useQuery({
    queryKey: ["whatsapp-mappings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_user_mappings")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WhatsAppMapping[];
    },
    enabled: !!tenantId,
  });

  // Fetch tenant users for dropdown
  const { data: tenantUsers } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data: users, error } = await supabase
        .from("tenant_users")
        .select("user_id, role")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = users.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      return users.map(u => ({
        user_id: u.user_id,
        role: u.role,
        profiles: profiles?.find(p => p.user_id === u.user_id) || null,
      })) as TenantUser[];
    },
    enabled: !!tenantId,
  });

  // Add mapping mutation
  const addMutation = useMutation({
    mutationFn: async (mapping: typeof newMapping) => {
      const { error } = await supabase.from("whatsapp_user_mappings").insert({
        tenant_id: tenantId,
        user_id: mapping.user_id,
        whatsapp_number: mapping.whatsapp_number,
        display_name: mapping.display_name,
        role: mapping.role,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
      setIsAddModalOpen(false);
      setNewMapping({ user_id: "", whatsapp_number: "+260", display_name: "", role: "viewer" });
      toast({ title: "Success", description: "WhatsApp number added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add WhatsApp number.", variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_user_mappings")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_user_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
      toast({ title: "Deleted", description: "WhatsApp mapping removed." });
    },
  });

  const handleUserSelect = (userId: string) => {
    const selectedUser = tenantUsers?.find((u) => u.user_id === userId);
    setNewMapping({
      ...newMapping,
      user_id: userId,
      display_name: selectedUser?.profiles?.full_name || "",
      role: selectedUser?.role || "viewer",
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-3 rounded-full bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">WhatsApp Business Integration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your team can message the Omanut BMS WhatsApp number to record sales, check stock, and manage your business on the go.
            </p>
            <div className="mt-3 p-3 bg-background rounded-lg border">
              <p className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp Number: <span className="text-primary">Contact admin@omanut.co for setup</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registered Phone Numbers</CardTitle>
            <CardDescription>Team members who can access BMS via WhatsApp</CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Phone
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappings && mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono">{mapping.whatsapp_number}</TableCell>
                    <TableCell>{mapping.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{mapping.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={mapping.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: mapping.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {mapping.last_used_at ? format(new Date(mapping.last_used_at), "MMM d, HH:mm") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(mapping.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No phone numbers registered yet.</p>
              <p className="text-sm">Add team members to enable WhatsApp access.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
            <DialogDescription>Link a team member's WhatsApp number to access BMS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={newMapping.user_id} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {tenantUsers?.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.profiles?.full_name || "Unnamed User"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={newMapping.whatsapp_number}
                onChange={(e) => setNewMapping({ ...newMapping, whatsapp_number: e.target.value })}
                placeholder="+260971234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={newMapping.display_name}
                onChange={(e) => setNewMapping({ ...newMapping, display_name: e.target.value })}
                placeholder="John Mwanza"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Role</Label>
              <Select value={newMapping.role} onValueChange={(v) => setNewMapping({ ...newMapping, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="manager">Manager - Full access</SelectItem>
                  <SelectItem value="cashier">Cashier - Sales & stock only</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(newMapping)} disabled={!newMapping.user_id || !newMapping.whatsapp_number || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
