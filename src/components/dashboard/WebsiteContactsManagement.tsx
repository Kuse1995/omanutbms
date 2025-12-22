import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, Phone, Calendar, MessageSquare, Search, Eye, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface WebsiteContact {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string;
  source_page: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function WebsiteContactsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<WebsiteContact | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["website-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WebsiteContact[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from("website_contacts")
        .update({ status, admin_notes, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-contacts"] });
      toast({ title: "Contact updated successfully" });
      setSelectedContact(null);
    },
    onError: () => {
      toast({ title: "Failed to update contact", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-contacts"] });
      toast({ title: "Contact deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    },
  });

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.sender_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "responded":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><MessageSquare className="w-3 h-3 mr-1" />Responded</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "spam":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Spam</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewContact = (contact: WebsiteContact) => {
    setSelectedContact(contact);
    setAdminNotes(contact.admin_notes || "");
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (selectedContact) {
      updateMutation.mutate({
        id: selectedContact.id,
        status: newStatus,
        admin_notes: adminNotes,
      });
    }
  };

  const pendingCount = contacts.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#003366]">Website Contacts</h1>
          <p className="text-muted-foreground">Manage contact form submissions from the website</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <Card className="bg-white border-[#004B8D]/20">
        <CardHeader className="border-b border-[#004B8D]/10 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0f7fa]">
                  <TableHead>Sender</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading contacts...
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-[#f0f7fa]/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#003366]">{contact.sender_name}</p>
                          <p className="text-xs text-muted-foreground">{contact.sender_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">{contact.message}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{contact.source_page}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(contact.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(contact.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewContact(contact)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deleteMutation.mutate(contact.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View/Edit Modal */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#003366]">Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{selectedContact.sender_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Source Page</p>
                  <Badge variant="outline" className="capitalize">{selectedContact.source_page}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${selectedContact.sender_email}`} className="text-blue-600 hover:underline">
                    {selectedContact.sender_email}
                  </a>
                </div>
                {selectedContact.sender_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedContact.sender_phone}`} className="text-blue-600 hover:underline">
                      {selectedContact.sender_phone}
                    </a>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Message</p>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">{selectedContact.message}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Received {format(new Date(selectedContact.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this contact..."
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Update Status:</p>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "responded", "resolved", "spam"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selectedContact.status === status ? "default" : "outline"}
                        onClick={() => handleUpdateStatus(status)}
                        disabled={updateMutation.isPending}
                        className="capitalize"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  View only - Admin access required to update status
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
