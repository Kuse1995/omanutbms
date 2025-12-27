import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useFeatures } from "@/hooks/useFeatures";
import { guardTenant } from "@/lib/tenant-utils";
import { Plus, Users, MapPin, Heart, Loader2, Trash2, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { ForumViewModal } from "./ForumViewModal";
import { DonationRequestViewModal } from "./DonationRequestViewModal";
import { FeatureGuard } from "./FeatureGuard";

interface Community {
  id: string;
  name: string;
  province: string;
  community_size: number;
  description: string;
  products_needed: string;
  priority: string;
  status: string;
  contact_person: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface OutreachRequest {
  id: string;
  wash_forum_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  wash_forums?: {
    name: string;
  };
}

const provinces = [
  "Central", "Copperbelt", "Eastern", "Luapula", "Lusaka",
  "Muchinga", "Northern", "North-Western", "Southern", "Western"
];

const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
];

const statusOptions = [
  { value: "seeking_donation", label: "Seeking Support" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "fulfilled", label: "Fulfilled" },
];

/**
 * CommunityManagement - Renamed from WASHForumsManagement
 * Generic community/outreach management for any business type
 * Uses dynamic terminology based on business_type
 * 
 * Part of impact add-on module
 */
export function CommunityManagement() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [outreachRequests, setOutreachRequests] = useState<OutreachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCommunity, setIsAddingCommunity] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isCommunityViewOpen, setIsCommunityViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OutreachRequest | null>(null);
  const [isRequestViewOpen, setIsRequestViewOpen] = useState(false);
  const { toast } = useToast();
  const { canAdd, isAdmin } = useAuth();
  const { tenantId } = useTenant();
  const { terminology } = useFeatures();

  const [newCommunity, setNewCommunity] = useState({
    name: "",
    province: "",
    community_size: "",
    description: "",
    products_needed: "",
    priority: "medium",
    contact_person: "",
    contact_phone: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [communitiesRes, requestsRes] = await Promise.all([
      supabase.from("wash_forums").select("*").order("created_at", { ascending: false }),
      supabase.from("donation_requests").select("*, wash_forums(name)").order("created_at", { ascending: false }),
    ]);

    if (communitiesRes.data) setCommunities(communitiesRes.data);
    if (requestsRes.data) setOutreachRequests(requestsRes.data);
    
    setLoading(false);
  };

  const handleAddCommunity = async () => {
    if (!guardTenant(tenantId)) return;
    
    if (!newCommunity.name || !newCommunity.province || !newCommunity.description || !newCommunity.products_needed) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("wash_forums").insert({
      name: newCommunity.name,
      province: newCommunity.province,
      community_size: parseInt(newCommunity.community_size) || 0,
      description: newCommunity.description,
      products_needed: newCommunity.products_needed,
      priority: newCommunity.priority,
      contact_person: newCommunity.contact_person || null,
      contact_phone: newCommunity.contact_phone || null,
      tenant_id: tenantId,
    });

    if (error) {
      toast({ title: "Error", description: `Failed to add ${terminology.communityLabel.toLowerCase()}.`, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${terminology.communityLabel} added successfully.` });
    setIsAddingCommunity(false);
    setNewCommunity({
      name: "", province: "", community_size: "", description: "",
      products_needed: "", priority: "medium", contact_person: "", contact_phone: "",
    });
    fetchData();
  };

  const handleUpdateCommunityStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("wash_forums")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${terminology.communityLabel} status updated.` });
    fetchData();
  };

  const handleUpdateCommunity = async () => {
    if (!editingCommunity) return;
    
    if (!editingCommunity.name || !editingCommunity.province || !editingCommunity.description || !editingCommunity.products_needed) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("wash_forums")
      .update({
        name: editingCommunity.name,
        province: editingCommunity.province,
        community_size: editingCommunity.community_size,
        description: editingCommunity.description,
        products_needed: editingCommunity.products_needed,
        priority: editingCommunity.priority,
        status: editingCommunity.status,
        contact_person: editingCommunity.contact_person || null,
        contact_phone: editingCommunity.contact_phone || null,
      })
      .eq("id", editingCommunity.id);

    if (error) {
      toast({ title: "Error", description: `Failed to update ${terminology.communityLabel.toLowerCase()}.`, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${terminology.communityLabel} updated successfully.` });
    setEditingCommunity(null);
    fetchData();
  };

  const handleDeleteCommunity = async (id: string) => {
    const { error } = await supabase.from("wash_forums").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: `Failed to delete ${terminology.communityLabel.toLowerCase()}.`, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `${terminology.communityLabel} deleted.` });
    fetchData();
  };

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("donation_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update request status.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Request status updated." });
    fetchData();
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-destructive text-destructive-foreground",
      high: "bg-amber-500 text-white",
      medium: "bg-primary text-primary-foreground",
    };
    return <Badge className={colors[priority] || "bg-muted"}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      seeking_donation: "bg-blue-500 text-white",
      partially_funded: "bg-amber-500 text-white",
      fulfilled: "bg-green-500 text-white",
      pending: "bg-slate-500 text-white",
      contacted: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
    };
    return <Badge className={colors[status] || "bg-muted"}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGuard feature="impact" featureName="Community Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{terminology.communitiesLabel} & Outreach</h2>
            <p className="text-muted-foreground">Manage {terminology.communitiesLabel.toLowerCase()} and outreach requests</p>
          </div>
          {canAdd && (
            <Dialog open={isAddingCommunity} onOpenChange={setIsAddingCommunity}>
              <DialogTrigger asChild>
                <Button className="bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add {terminology.communityLabel}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New {terminology.communityLabel}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder={`${terminology.communityLabel} Name *`}
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  />
                  <Select value={newCommunity.province} onValueChange={(v) => setNewCommunity({ ...newCommunity, province: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Province *" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Size (people)"
                    value={newCommunity.community_size}
                    onChange={(e) => setNewCommunity({ ...newCommunity, community_size: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description *"
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  />
                  <Textarea
                    placeholder={`${terminology.productsLabel} Needed *`}
                    value={newCommunity.products_needed}
                    onChange={(e) => setNewCommunity({ ...newCommunity, products_needed: e.target.value })}
                  />
                  <Select value={newCommunity.priority} onValueChange={(v) => setNewCommunity({ ...newCommunity, priority: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Contact Person (optional)"
                    value={newCommunity.contact_person}
                    onChange={(e) => setNewCommunity({ ...newCommunity, contact_person: e.target.value })}
                  />
                  <Input
                    placeholder="Contact Phone (optional)"
                    value={newCommunity.contact_phone}
                    onChange={(e) => setNewCommunity({ ...newCommunity, contact_phone: e.target.value })}
                  />
                  <Button onClick={handleAddCommunity} className="w-full">Add {terminology.communityLabel}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Modal */}
          <Dialog open={!!editingCommunity} onOpenChange={(open) => !open && setEditingCommunity(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit {terminology.communityLabel}</DialogTitle>
              </DialogHeader>
              {editingCommunity && (
                <div className="space-y-4">
                  <Input
                    placeholder={`${terminology.communityLabel} Name *`}
                    value={editingCommunity.name}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, name: e.target.value })}
                  />
                  <Select value={editingCommunity.province} onValueChange={(v) => setEditingCommunity({ ...editingCommunity, province: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Province *" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Size (people)"
                    value={editingCommunity.community_size}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, community_size: parseInt(e.target.value) || 0 })}
                  />
                  <Textarea
                    placeholder="Description *"
                    value={editingCommunity.description}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, description: e.target.value })}
                  />
                  <Textarea
                    placeholder={`${terminology.productsLabel} Needed *`}
                    value={editingCommunity.products_needed}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, products_needed: e.target.value })}
                  />
                  <Select value={editingCommunity.priority} onValueChange={(v) => setEditingCommunity({ ...editingCommunity, priority: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editingCommunity.status} onValueChange={(v) => setEditingCommunity({ ...editingCommunity, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Contact Person (optional)"
                    value={editingCommunity.contact_person || ""}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, contact_person: e.target.value })}
                  />
                  <Input
                    placeholder="Contact Phone (optional)"
                    value={editingCommunity.contact_phone || ""}
                    onChange={(e) => setEditingCommunity({ ...editingCommunity, contact_phone: e.target.value })}
                  />
                  <Button onClick={handleUpdateCommunity} className="w-full">Save Changes</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="communities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="communities" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {terminology.communitiesLabel} ({communities.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Outreach Requests ({outreachRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="communities">
            <Card>
              <CardHeader>
                <CardTitle>{terminology.communitiesLabel}</CardTitle>
                <CardDescription>Registered {terminology.communitiesLabel.toLowerCase()} for outreach</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{terminology.communityLabel}</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>{terminology.productsLabel} Needed</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communities.map((community) => (
                      <TableRow key={community.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedCommunity(community); setIsCommunityViewOpen(true); }}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{community.name}</p>
                            <p className="text-xs text-muted-foreground">{community.description.slice(0, 50)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>{community.province}</TableCell>
                        <TableCell>{community.community_size.toLocaleString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{community.products_needed}</TableCell>
                        <TableCell>{getPriorityBadge(community.priority)}</TableCell>
                        <TableCell>
                          <Select
                            value={community.status}
                            onValueChange={(v) => handleUpdateCommunityStatus(community.id, v)}
                          >
                            <SelectTrigger className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCommunity(community); setIsCommunityViewOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => setEditingCommunity(community)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteCommunity(community.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {communities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No {terminology.communitiesLabel.toLowerCase()} registered yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Outreach Requests</CardTitle>
                <CardDescription>Requests from supporters and partners</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{terminology.communityLabel}</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outreachRequests.map((request) => (
                      <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequest(request); setIsRequestViewOpen(true); }}>
                        <TableCell className="font-medium">{request.wash_forums?.name || "Unknown"}</TableCell>
                        <TableCell>{request.donor_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{request.donor_email}</p>
                            {request.donor_phone && <p className="text-muted-foreground">{request.donor_phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(request.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Select
                            value={request.status}
                            onValueChange={(v) => handleUpdateRequestStatus(request.id, v)}
                          >
                            <SelectTrigger className="w-[120px]" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setIsRequestViewOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {outreachRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No outreach requests yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Modals - reusing existing components with type casting for compatibility */}
        {selectedCommunity && (
          <ForumViewModal
            isOpen={isCommunityViewOpen}
            onClose={() => setIsCommunityViewOpen(false)}
            forum={selectedCommunity as any}
          />
        )}
        {selectedRequest && (
          <DonationRequestViewModal
            isOpen={isRequestViewOpen}
            onClose={() => setIsRequestViewOpen(false)}
            request={selectedRequest as any}
          />
        )}
      </div>
    </FeatureGuard>
  );
}
