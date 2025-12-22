import { useState, useEffect } from "react";
import { MessageSquare, Mail, Phone, User, MapPin, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CommunityMessage {
  id: string;
  wash_forum_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  wash_forums?: {
    name: string;
    province: string;
  };
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  forwarded: { label: "Forwarded", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export function CommunityMessagesManagement() {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<CommunityMessage | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("community_messages")
      .select(`
        *,
        wash_forums (
          name,
          province
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data as CommunityMessage[]);
    }
    setLoading(false);
  };

  const handleViewMessage = (message: CommunityMessage) => {
    setSelectedMessage(message);
    setAdminNotes(message.admin_notes || "");
    setViewModalOpen(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedMessage) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("community_messages")
        .update({ status, admin_notes: adminNotes.trim() || null })
        .eq("id", selectedMessage.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Message marked as ${status}.`,
      });

      fetchMessages();
      setViewModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004B8D] mx-auto" />
          <p className="text-[#004B8D]/60 mt-4">Loading messages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Community Messages</h2>
        <p className="text-[#004B8D]/60">Manage messages from donors to WASH forums</p>
      </div>

      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0077B6]" />
            Messages
            {messages.filter(m => m.status === "pending").length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-2">
                {messages.filter(m => m.status === "pending").length} Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-[#004B8D]/30 mx-auto mb-4" />
              <p className="text-[#004B8D]/50">No community messages yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#004B8D]/10">
                    <TableHead className="text-[#004B8D]/70">Sender</TableHead>
                    <TableHead className="text-[#004B8D]/70">Community</TableHead>
                    <TableHead className="text-[#004B8D]/70">Date</TableHead>
                    <TableHead className="text-[#004B8D]/70">Status</TableHead>
                    <TableHead className="text-[#004B8D]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                      <TableCell>
                        <div className="text-[#003366] font-medium">{message.donor_name}</div>
                        <div className="text-[#004B8D]/50 text-sm">{message.donor_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[#003366]">{message.wash_forums?.name || "Unknown"}</div>
                        <div className="text-[#004B8D]/50 text-sm">{message.wash_forums?.province} Province</div>
                      </TableCell>
                      <TableCell className="text-[#003366]/70">
                        {format(new Date(message.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMessage(message)}
                          className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Message Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-[#004B8D]/20 text-[#003366]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#003366]">
              <MessageSquare className="w-5 h-5 text-[#0077B6]" />
              Message Details
            </DialogTitle>
            <DialogDescription className="text-[#004B8D]/60">
              Review and respond to community message
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4 mt-4">
              <div className="bg-[#f0f7fa] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#004B8D]/60" />
                  <span className="font-medium text-[#003366]">{selectedMessage.donor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#004B8D]/60" />
                  <a href={`mailto:${selectedMessage.donor_email}`} className="text-[#0077B6] hover:underline">
                    {selectedMessage.donor_email}
                  </a>
                </div>
                {selectedMessage.donor_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#004B8D]/60" />
                    <span className="text-[#003366]">{selectedMessage.donor_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#004B8D]/60" />
                  <span className="text-[#003366]">To: {selectedMessage.wash_forums?.name} ({selectedMessage.wash_forums?.province})</span>
                </div>
              </div>

              <div>
                <Label className="text-[#004B8D] mb-2 block">Message</Label>
                <div className="bg-[#f0f7fa] rounded-lg p-4 text-[#003366]">
                  {selectedMessage.message}
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes" className="text-[#004B8D] mb-2 block">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add internal notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => handleUpdateStatus("forwarded")}
                  disabled={updating}
                >
                  Mark Forwarded
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D]/10"
                  onClick={() => handleUpdateStatus("resolved")}
                  disabled={updating}
                >
                  Mark Resolved
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleUpdateStatus("declined")}
                  disabled={updating}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
