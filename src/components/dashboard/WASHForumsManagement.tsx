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
import { Plus, Users, MapPin, Heart, Loader2, Trash2, Edit, Mail, Phone, Eye, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ForumViewModal } from "./ForumViewModal";
import { DonationRequestViewModal } from "./DonationRequestViewModal";

interface WashForum {
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

interface DonationRequest {
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
  { value: "seeking_donation", label: "Seeking Donation" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "fulfilled", label: "Fulfilled" },
];

export function WASHForumsManagement() {
  const [forums, setForums] = useState<WashForum[]>([]);
  const [donationRequests, setDonationRequests] = useState<DonationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingForum, setIsAddingForum] = useState(false);
  const [editingForum, setEditingForum] = useState<WashForum | null>(null);
  const [selectedForum, setSelectedForum] = useState<WashForum | null>(null);
  const [isForumViewOpen, setIsForumViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DonationRequest | null>(null);
  const [isRequestViewOpen, setIsRequestViewOpen] = useState(false);
  const { toast } = useToast();
  const { canAdd, isAdmin } = useAuth();

  const [newForum, setNewForum] = useState({
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
    
    const [forumsRes, requestsRes] = await Promise.all([
      supabase.from("wash_forums").select("*").order("created_at", { ascending: false }),
      supabase.from("donation_requests").select("*, wash_forums(name)").order("created_at", { ascending: false }),
    ]);

    if (forumsRes.data) setForums(forumsRes.data);
    if (requestsRes.data) setDonationRequests(requestsRes.data);
    
    setLoading(false);
  };

  const handleAddForum = async () => {
    if (!newForum.name || !newForum.province || !newForum.description || !newForum.products_needed) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("wash_forums").insert({
      name: newForum.name,
      province: newForum.province,
      community_size: parseInt(newForum.community_size) || 0,
      description: newForum.description,
      products_needed: newForum.products_needed,
      priority: newForum.priority,
      contact_person: newForum.contact_person || null,
      contact_phone: newForum.contact_phone || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add WASH forum.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "WASH forum added successfully." });
    setIsAddingForum(false);
    setNewForum({
      name: "", province: "", community_size: "", description: "",
      products_needed: "", priority: "medium", contact_person: "", contact_phone: "",
    });
    fetchData();
  };

  const handleUpdateForumStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("wash_forums")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Forum status updated." });
    fetchData();
  };

  const handleUpdateForum = async () => {
    if (!editingForum) return;
    
    if (!editingForum.name || !editingForum.province || !editingForum.description || !editingForum.products_needed) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("wash_forums")
      .update({
        name: editingForum.name,
        province: editingForum.province,
        community_size: editingForum.community_size,
        description: editingForum.description,
        products_needed: editingForum.products_needed,
        priority: editingForum.priority,
        status: editingForum.status,
        contact_person: editingForum.contact_person || null,
        contact_phone: editingForum.contact_phone || null,
      })
      .eq("id", editingForum.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update WASH forum.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "WASH forum updated successfully." });
    setEditingForum(null);
    fetchData();
  };

  const handleDeleteForum = async (id: string) => {
    const { error } = await supabase.from("wash_forums").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete forum.", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Forum deleted." });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WASH Forums & Donations</h2>
          <p className="text-muted-foreground">Manage community forums and donation requests</p>
        </div>
      {canAdd && (
        <Dialog open={isAddingForum} onOpenChange={setIsAddingForum}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add WASH Forum
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New WASH Forum</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Forum/Community Name *"
                value={newForum.name}
                onChange={(e) => setNewForum({ ...newForum, name: e.target.value })}
              />
              <Select value={newForum.province} onValueChange={(v) => setNewForum({ ...newForum, province: v })}>
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
                placeholder="Community Size (people)"
                value={newForum.community_size}
                onChange={(e) => setNewForum({ ...newForum, community_size: e.target.value })}
              />
              <Textarea
                placeholder="Description of their water situation *"
                value={newForum.description}
                onChange={(e) => setNewForum({ ...newForum, description: e.target.value })}
              />
              <Textarea
                placeholder="Products Needed (e.g., 3x LifeStraw Community) *"
                value={newForum.products_needed}
                onChange={(e) => setNewForum({ ...newForum, products_needed: e.target.value })}
              />
              <Select value={newForum.priority} onValueChange={(v) => setNewForum({ ...newForum, priority: v })}>
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
                value={newForum.contact_person}
                onChange={(e) => setNewForum({ ...newForum, contact_person: e.target.value })}
              />
              <Input
                placeholder="Contact Phone (optional)"
                value={newForum.contact_phone}
                onChange={(e) => setNewForum({ ...newForum, contact_phone: e.target.value })}
              />
              <Button onClick={handleAddForum} className="w-full">Add Forum</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

        {/* Edit Forum Modal */}
        <Dialog open={!!editingForum} onOpenChange={(open) => !open && setEditingForum(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit WASH Forum</DialogTitle>
            </DialogHeader>
            {editingForum && (
              <div className="space-y-4">
                <Input
                  placeholder="Forum/Community Name *"
                  value={editingForum.name}
                  onChange={(e) => setEditingForum({ ...editingForum, name: e.target.value })}
                />
                <Select value={editingForum.province} onValueChange={(v) => setEditingForum({ ...editingForum, province: v })}>
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
                  placeholder="Community Size (people)"
                  value={editingForum.community_size}
                  onChange={(e) => setEditingForum({ ...editingForum, community_size: parseInt(e.target.value) || 0 })}
                />
                <Textarea
                  placeholder="Description of their water situation *"
                  value={editingForum.description}
                  onChange={(e) => setEditingForum({ ...editingForum, description: e.target.value })}
                />
                <Textarea
                  placeholder="Products Needed (e.g., 3x LifeStraw Community) *"
                  value={editingForum.products_needed}
                  onChange={(e) => setEditingForum({ ...editingForum, products_needed: e.target.value })}
                />
                <Select value={editingForum.priority} onValueChange={(v) => setEditingForum({ ...editingForum, priority: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editingForum.status} onValueChange={(v) => setEditingForum({ ...editingForum, status: v })}>
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
                  value={editingForum.contact_person || ""}
                  onChange={(e) => setEditingForum({ ...editingForum, contact_person: e.target.value })}
                />
                <Input
                  placeholder="Contact Phone (optional)"
                  value={editingForum.contact_phone || ""}
                  onChange={(e) => setEditingForum({ ...editingForum, contact_phone: e.target.value })}
                />
                <Button onClick={handleUpdateForum} className="w-full">Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="forums" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forums" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            WASH Forums ({forums.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Donation Requests ({donationRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forums">
          <Card>
            <CardHeader>
              <CardTitle>WASH Forums</CardTitle>
              <CardDescription>Communities registered for the donation program</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forum</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Products Needed</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forums.map((forum) => (
                    <TableRow key={forum.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedForum(forum); setIsForumViewOpen(true); }}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{forum.name}</p>
                          <p className="text-xs text-muted-foreground">{forum.description.slice(0, 50)}...</p>
                        </div>
                      </TableCell>
                      <TableCell>{forum.province}</TableCell>
                      <TableCell>{forum.community_size.toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{forum.products_needed}</TableCell>
                      <TableCell>{getPriorityBadge(forum.priority)}</TableCell>
                      <TableCell>
                        <Select
                          value={forum.status}
                          onValueChange={(v) => handleUpdateForumStatus(forum.id, v)}
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setSelectedForum(forum); setIsForumViewOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setEditingForum(forum); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteForum(forum.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Donation Requests</CardTitle>
              <CardDescription>Incoming donation inquiries from the website</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Forum</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donationRequests.map((request) => (
                    <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequest(request); setIsRequestViewOpen(true); }}>
                      <TableCell className="font-medium">{request.donor_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="w-3 h-3" />
                            {request.donor_email}
                          </span>
                          {request.donor_phone && (
                            <span className="flex items-center gap-1 text-xs">
                              <Phone className="w-3 h-3" />
                              {request.donor_phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{request.wash_forums?.name || "Unknown"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.message || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setIsRequestViewOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ForumViewModal
        forum={selectedForum}
        isOpen={isForumViewOpen}
        onClose={() => { setIsForumViewOpen(false); setSelectedForum(null); }}
      />

      <DonationRequestViewModal
        request={selectedRequest}
        isOpen={isRequestViewOpen}
        onClose={() => { setIsRequestViewOpen(false); setSelectedRequest(null); }}
      />
    </div>
  );
}
