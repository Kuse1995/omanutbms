import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Package, DollarSign, RotateCcw, Loader2, Eye, MapPin, Building2, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

interface Agent {
  id: string;
  business_name: string;
  contact_person: string;
  phone_number: string;
  province: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface AgentTransaction {
  id: string;
  agent_id: string;
  transaction_type: string;
  invoice_id: string | null;
  products_json: any;
  amount_zmw: number;
  notes: string | null;
  created_at: string;
  agent_name?: string;
}

const transactionTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  invoice: { label: "Invoice", icon: <FileText className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  consignment: { label: "Consignment", icon: <Package className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  payment: { label: "Payment", icon: <DollarSign className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
  return: { label: "Return", icon: <RotateCcw className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
};

export const AgentTransactionsManager = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    agent_id: "",
    transaction_type: "invoice",
    amount_zmw: 0,
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, transactionsRes] = await Promise.all([
        supabase.from("agent_applications").select("*").eq("status", "approved").order("business_name"),
        supabase.from("agent_transactions").select("*").order("created_at", { ascending: false }),
      ]);

      if (agentsRes.error) throw agentsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setAgents(agentsRes.data || []);

      // Map agent names
      const agentMap = new Map((agentsRes.data || []).map((a) => [a.id, a.business_name]));
      const txWithNames = (transactionsRes.data || []).map((t) => ({
        ...t,
        agent_name: agentMap.get(t.agent_id) || "Unknown",
      }));
      setTransactions(txWithNames);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load agent data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTransaction = async () => {
    if (!transactionForm.agent_id) {
      toast.error("Select an agent");
      return;
    }
    
    if (!tenantId) {
      toast.error("Organization context missing. Please log in again.");
      return;
    }

    try {
      const { error } = await supabase.from("agent_transactions").insert([
        {
          tenant_id: tenantId,
          agent_id: transactionForm.agent_id,
          transaction_type: transactionForm.transaction_type,
          amount_zmw: transactionForm.amount_zmw,
          notes: transactionForm.notes || null,
          recorded_by: user?.id,
        },
      ]);

      if (error) throw error;
      toast.success("Transaction recorded");
      setIsTransactionModalOpen(false);
      setTransactionForm({ agent_id: "", transaction_type: "invoice", amount_zmw: 0, notes: "" });
      fetchData();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to record transaction");
    }
  };

  const getAgentBalance = (agentId: string) => {
    const agentTx = transactions.filter((t) => t.agent_id === agentId);
    return agentTx.reduce((acc, t) => {
      if (t.transaction_type === "invoice" || t.transaction_type === "consignment") {
        return acc + t.amount_zmw;
      } else if (t.transaction_type === "payment") {
        return acc - t.amount_zmw;
      } else if (t.transaction_type === "return") {
        return acc - t.amount_zmw;
      }
      return acc;
    }, 0);
  };

  const totalOutstanding = agents.reduce((acc, a) => acc + Math.max(0, getAgentBalance(a.id)), 0);
  const provinceCounts = agents.reduce((acc, a) => {
    acc[a.province] = (acc[a.province] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{agents.length}</div>
            <div className="text-xs text-muted-foreground">Active Agents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <div className="text-2xl font-bold">{transactions.length}</div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-orange-600 mb-1" />
            <div className="text-2xl font-bold">K{totalOutstanding.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <div className="text-2xl font-bold">{Object.keys(provinceCounts).length}</div>
            <div className="text-xs text-muted-foreground">Provinces</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsTransactionModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Transaction
        </Button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const balance = getAgentBalance(agent.id);
          const agentTx = transactions.filter((t) => t.agent_id === agent.id);

          return (
            <Card key={agent.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedAgent(agent); setIsProfileOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {agent.business_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{agent.contact_person}</p>
                  </div>
                  <Badge variant="outline">{agent.province}</Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Phone className="h-3 w-3" />
                  <span>{agent.phone_number}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <div className="text-muted-foreground">Transactions</div>
                    <div className="font-bold">{agentTx.length}</div>
                  </div>
                  <div className={`p-2 rounded text-center ${balance > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                    <div className="text-muted-foreground">Balance</div>
                    <div className={`font-bold ${balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                      K{Math.abs(balance).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((tx) => {
                const typeInfo = transactionTypeLabels[tx.transaction_type] || transactionTypeLabels.invoice;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{tx.agent_name}</TableCell>
                    <TableCell>
                      <Badge className={typeInfo.color}>
                        {typeInfo.icon}
                        <span className="ml-1">{typeInfo.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">K{tx.amount_zmw.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{tx.notes || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAgent?.business_name}</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Person</Label>
                  <p className="font-medium">{selectedAgent.contact_person}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedAgent.phone_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Province</Label>
                  <p className="font-medium">{selectedAgent.province}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{selectedAgent.address || "Not specified"}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Account Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Invoiced</div>
                    <div className="text-lg font-bold text-blue-600">
                      K{transactions.filter((t) => t.agent_id === selectedAgent.id && t.transaction_type === "invoice").reduce((a, t) => a + t.amount_zmw, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                    <div className="text-lg font-bold text-green-600">
                      K{transactions.filter((t) => t.agent_id === selectedAgent.id && t.transaction_type === "payment").reduce((a, t) => a + t.amount_zmw, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Balance</div>
                    <div className={`text-lg font-bold ${getAgentBalance(selectedAgent.id) > 0 ? "text-orange-600" : "text-green-600"}`}>
                      K{getAgentBalance(selectedAgent.id).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Transaction History</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter((t) => t.agent_id === selectedAgent.id)
                      .slice(0, 5)
                      .map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <Badge className={transactionTypeLabels[tx.transaction_type]?.color}>
                              {transactionTypeLabels[tx.transaction_type]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">K{tx.amount_zmw.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Transaction Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Agent Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Agent</Label>
              <Select
                value={transactionForm.agent_id}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, agent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Type</Label>
              <Select
                value={transactionForm.transaction_type}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice Issued</SelectItem>
                  <SelectItem value="consignment">Consignment Given</SelectItem>
                  <SelectItem value="payment">Payment Received</SelectItem>
                  <SelectItem value="return">Product Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (ZMW)</Label>
              <Input
                type="number"
                value={transactionForm.amount_zmw}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount_zmw: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTransactionModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTransaction}>Save Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
