import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle,
  MoreHorizontal,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { StockTransferModal } from "./StockTransferModal";

type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

interface Transfer {
  id: string;
  tenant_id: string;
  from_branch_id: string;
  to_branch_id: string;
  inventory_id: string;
  quantity: number;
  status: TransferStatus;
  requires_approval: boolean;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined data
  from_branch_name?: string;
  to_branch_name?: string;
  product_name?: string;
  requested_by_name?: string;
}

const statusConfig: Record<TransferStatus, { label: string; icon: React.ElementType; variant: string }> = {
  pending: { label: 'Pending Approval', icon: Clock, variant: 'outline' },
  in_transit: { label: 'In Transit', icon: Truck, variant: 'default' },
  completed: { label: 'Completed', icon: CheckCircle2, variant: 'secondary' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'destructive' },
};

export function StockTransfersManager() {
  const { tenant, tenantUser } = useTenant();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | TransferStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  // User's branch assignment for transfer completion check
  const userBranchId = tenantUser?.branch_id;
  const canAccessAllBranches = tenantUser?.can_access_all_branches ?? false;
  const userRole = tenantUser?.role;

  const fetchTransfers = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      // First fetch transfers with basic joins (no profiles join that may fail)
      const { data, error } = await supabase
        .from("stock_transfers")
        .select(`
          *,
          from_branch:from_branch_id(name),
          to_branch:to_branch_id(name),
          inventory:inventory_id(name, sku)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch requester names separately if needed
      const requesterIds = [...new Set((data || []).map(t => t.requested_by).filter(Boolean))];
      let requesterMap: Record<string, string> = {};
      
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', requesterIds);
        
        requesterMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedTransfers: Transfer[] = (data || []).map((t: any) => ({
        ...t,
        from_branch_name: t.from_branch?.name || 'Unknown',
        to_branch_name: t.to_branch?.name || 'Unknown',
        product_name: t.inventory?.name || 'Unknown Product',
        requested_by_name: requesterMap[t.requested_by] || 'Unknown',
      }));

      setTransfers(formattedTransfers);
    } catch (error: any) {
      console.error("Error fetching transfers:", error);
      toast({
        title: "Error",
        description: "Failed to load transfers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [tenant?.id]);

  const handleApprove = async (transfer: Transfer) => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("stock_transfers")
        .update({
          status: 'in_transit',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", transfer.id);

      if (error) throw error;

      toast({
        title: "Transfer Approved",
        description: "The transfer is now in transit.",
      });
      fetchTransfers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve transfer",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("stock_transfers")
        .update({
          status: 'cancelled',
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedTransfer.id);

      if (error) throw error;

      toast({
        title: "Transfer Rejected",
        description: "The transfer has been cancelled.",
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject transfer",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Check if user can complete a specific transfer (must be at receiving location)
  const canCompleteTransfer = (transfer: Transfer): boolean => {
    // Admins and managers can always complete
    if (userRole === 'admin' || userRole === 'manager') return true;
    
    // Users with access to all branches can complete
    if (canAccessAllBranches) return true;
    
    // User must be assigned to the receiving branch
    if (userBranchId && userBranchId === transfer.to_branch_id) return true;
    
    return false;
  };

  const getCompleteDisabledReason = (transfer: Transfer): string | null => {
    if (canCompleteTransfer(transfer)) return null;
    return "Only users assigned to the receiving location can mark this transfer as complete";
  };

  const handleComplete = async (transfer: Transfer) => {
    if (!canCompleteTransfer(transfer)) {
      toast({
        title: "Not Authorized",
        description: "Only users at the receiving location can complete this transfer.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Call the database function to complete transfer and update branch_inventory
      const { error: rpcError } = await supabase.rpc('complete_stock_transfer', {
        p_transfer_id: transfer.id
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Transfer Completed",
        description: "Stock has been moved to the destination location.",
      });
      fetchTransfers();
    } catch (error: any) {
      console.error("Error completing transfer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete transfer",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setRejectDialogOpen(true);
  };

  const filteredTransfers = transfers.filter((t) => {
    const matchesSearch = 
      t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.from_branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.to_branch_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    pending: transfers.filter(t => t.status === 'pending').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    completed: transfers.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Stock Transfers</h2>
          <p className="text-muted-foreground">Move inventory between locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransfers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer) => {
                  const StatusIcon = statusConfig[transfer.status]?.icon || Clock;
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="font-medium">{transfer.product_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{transfer.from_branch_name}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span>{transfer.to_branch_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{transfer.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[transfer.status]?.variant as any || 'outline'}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[transfer.status]?.label || transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{transfer.requested_by_name}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(transfer.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {transfer.status === 'pending' && isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleApprove(transfer)}>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRejectDialog(transfer)}>
                                <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {transfer.status === 'in_transit' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleComplete(transfer)}
                                    disabled={actionLoading || !canCompleteTransfer(transfer)}
                                    className={!canCompleteTransfer(transfer) ? "opacity-50" : ""}
                                  >
                                    {!canCompleteTransfer(transfer) && (
                                      <AlertCircle className="h-3 w-3 mr-1 text-amber-500" />
                                    )}
                                    Mark Complete
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {getCompleteDisabledReason(transfer) && (
                                <TooltipContent side="left" className="max-w-[200px]">
                                  <p className="text-xs">{getCompleteDisabledReason(transfer)}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <StockTransferModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchTransfers}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rejection *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
