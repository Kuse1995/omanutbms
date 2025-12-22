import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Eye, CheckCircle, XCircle, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AgentApplication {
  id: string;
  business_name: string;
  province: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
  motivation: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export function AgentApplications() {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AgentApplication | null>(null);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

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
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel("agent-applications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_applications",
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplications();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Applications updated",
    });
  };

  const updateStatus = async (id: string, status: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({ status, notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Application marked as ${status}`,
      });
      setSelectedApplication(null);
      setNotes("");
      fetchApplications();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#004B8D] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Agent Applications</h2>
              <p className="text-sm text-slate-400">
                {applications.filter((a) => a.status === "pending").length} pending review
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400 font-medium">Business</TableHead>
                <TableHead className="text-slate-400 font-medium">Contact</TableHead>
                <TableHead className="text-slate-400 font-medium">Province</TableHead>
                <TableHead className="text-slate-400 font-medium">Type</TableHead>
                <TableHead className="text-slate-400 font-medium">Date</TableHead>
                <TableHead className="text-slate-400 font-medium">Status</TableHead>
                <TableHead className="text-slate-400 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No applications yet
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id} className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell className="font-medium text-white">{app.business_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white">{app.contact_person}</p>
                        <p className="text-sm text-slate-400">{app.phone_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{app.province}</TableCell>
                    <TableCell className="text-slate-300">{app.business_type}</TableCell>
                    <TableCell className="text-slate-300">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedApplication(app);
                          setNotes(app.notes || "");
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedApplication?.business_name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Application from {selectedApplication?.province}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Contact Person</p>
                  <p className="text-white">{selectedApplication.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone Number</p>
                  <p className="text-white">{selectedApplication.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Business Type</p>
                  <p className="text-white">{selectedApplication.business_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  {getStatusBadge(selectedApplication.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-2">Motivation</p>
                <p className="text-white bg-slate-700/50 p-3 rounded-lg">
                  {selectedApplication.motivation}
                </p>
              </div>

              {isAdmin && (
                <>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Internal Notes</p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this application..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => updateStatus(selectedApplication.id, "approved")}
                      disabled={isUpdating}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => updateStatus(selectedApplication.id, "rejected")}
                      disabled={isUpdating}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </>
              )}
              {!isAdmin && (
                <div className="bg-slate-700/50 rounded-lg p-3 text-slate-400 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  View only - Admin access required to approve/reject
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
