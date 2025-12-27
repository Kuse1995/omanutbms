import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Edit, RefreshCw, Loader2, Plus, Trash2, Package, DollarSign, BarChart3, List, FileText, Archive, ArchiveRestore } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AgentPerformanceDashboard } from "./AgentPerformanceDashboard";
import { AgentTransactionsManager } from "./AgentTransactionsManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { guardTenant } from "@/lib/tenant-utils";
import { FeatureGuard } from "./FeatureGuard";

interface Agent {
  id: string;
  business_name: string;
  province: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
  motivation: string;
  status: string;
  notes: string | null;
  address: string | null;
  created_at: string;
}

interface AgentInventory {
  id: string;
  agent_id: string;
  product_type: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_value: number;
  notes: string | null;
  assigned_at: string;
}

interface InventoryProduct {
  id: string;
  name: string;
  current_stock: number;
  wholesale_stock: number;
  unit_price: number;
}

const zambianProvinces = [
  "Central",
  "Copperbelt",
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western",
];

const productTypes = [
  { name: "LifeStraw Personal", defaultPrice: 450 },
  { name: "LifeStraw Go", defaultPrice: 650 },
  { name: "LifeStraw Family 2.0", defaultPrice: 1200 },
  { name: "LifeStraw Community", defaultPrice: 4500 },
  { name: "LifeStraw Max", defaultPrice: 2800 },
];

const agentStatuses = [
  { value: "approved", label: "Active", color: "bg-green-500/20 text-green-400" },
  { value: "archived", label: "Archived", color: "bg-muted text-muted-foreground" },
  { value: "suspended", label: "Suspended", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "terminated", label: "Terminated", color: "bg-destructive/20 text-destructive" },
];

export function AgentsManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agentInventory, setAgentInventory] = useState<AgentInventory[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [mainInventory, setMainInventory] = useState<InventoryProduct[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({
    product_id: "",
    product_type: "",
    quantity: 0,
    unit_price: 0,
    notes: "",
  });
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { tenantId } = useTenant();

  // Form state for editing
  const [formData, setFormData] = useState({
    business_name: "",
    province: "",
    contact_person: "",
    phone_number: "",
    business_type: "",
    address: "",
    notes: "",
    status: "approved",
  });

  const fetchAgents = async () => {
    try {
      // Fetch agents that are not pending or rejected (i.e., have been processed)
      const statusFilter = showArchived 
        ? ["archived", "suspended", "terminated"] 
        : ["approved"];
      
      const { data, error } = await supabase
        .from("agent_applications")
        .select("*")
        .in("status", statusFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgentInventory = async (agentId: string) => {
    setIsLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from("agent_inventory")
        .select("*")
        .eq("agent_id", agentId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      setAgentInventory(data || []);
    } catch (error) {
      console.error("Error fetching agent inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load agent inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const fetchMainInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, current_stock, wholesale_stock, unit_price")
        .gt("current_stock", 0)
        .order("name");

      if (error) throw error;
      setMainInventory(data || []);
    } catch (error) {
      console.error("Error fetching main inventory:", error);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchMainInventory();
  }, [showArchived]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAgents();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Agents list updated",
    });
  };

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      business_name: agent.business_name,
      province: agent.province,
      contact_person: agent.contact_person,
      phone_number: agent.phone_number,
      business_type: agent.business_type,
      address: agent.address || "",
      notes: agent.notes || "",
      status: agent.status,
    });
    fetchAgentInventory(agent.id);
    setIsEditModalOpen(true);
  };

  const handleArchiveAgent = async (agent: Agent, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({ status: newStatus })
        .eq("id", agent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Agent ${newStatus === "approved" ? "restored" : newStatus}`,
      });
      fetchAgents();
    } catch (error) {
      console.error("Error updating agent status:", error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = agentStatuses.find(s => s.value === status) || agentStatuses[0];
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const handleSaveAgent = async () => {
    if (!selectedAgent) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("agent_applications")
        .update({
          business_name: formData.business_name,
          province: formData.province,
          contact_person: formData.contact_person,
          phone_number: formData.phone_number,
          business_type: formData.business_type,
          address: formData.address,
          notes: formData.notes,
          status: formData.status,
        })
        .eq("id", selectedAgent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent updated successfully",
      });
      setIsEditModalOpen(false);
      fetchAgents();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInventory = async () => {
    if (!guardTenant(tenantId)) return;
    
    if (!selectedAgent || !newInventoryItem.product_id || newInventoryItem.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please select a product and enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    // Find the selected product from main inventory
    const selectedProduct = mainInventory.find(p => p.id === newInventoryItem.product_id);
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Selected product not found",
        variant: "destructive",
      });
      return;
    }

    // Check if there's enough retail stock
    if (newInventoryItem.quantity > selectedProduct.current_stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.current_stock} units available in retail inventory`,
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Insert into agent_inventory with product_id link
      const { error: insertError } = await supabase
        .from("agent_inventory")
        .insert({
          agent_id: selectedAgent.id,
          product_id: newInventoryItem.product_id,
          product_type: selectedProduct.name,
          quantity: newInventoryItem.quantity,
          unit_price: newInventoryItem.unit_price || selectedProduct.unit_price,
          notes: newInventoryItem.notes || null,
          tenant_id: tenantId,
        });

      if (insertError) throw insertError;

      // 2. Deduct from main inventory current_stock and add to wholesale_stock
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          current_stock: selectedProduct.current_stock - newInventoryItem.quantity,
          wholesale_stock: selectedProduct.wholesale_stock + newInventoryItem.quantity,
        })
        .eq("id", newInventoryItem.product_id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${newInventoryItem.quantity} units of ${selectedProduct.name} assigned to agent`,
      });
      
      setNewInventoryItem({ product_id: "", product_type: "", quantity: 0, unit_price: 0, notes: "" });
      fetchAgentInventory(selectedAgent.id);
      fetchMainInventory(); // Refresh main inventory to reflect changes
    } catch (error) {
      console.error("Error adding inventory:", error);
      toast({
        title: "Error",
        description: "Failed to assign inventory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInventory = async (inventoryItem: AgentInventory) => {
    if (!selectedAgent) return;

    try {
      // If this inventory is linked to a main product, return stock
      if (inventoryItem.product_id) {
        const product = mainInventory.find(p => p.id === inventoryItem.product_id);
        if (product) {
          const { error: updateError } = await supabase
            .from("inventory")
            .update({
              current_stock: product.current_stock + inventoryItem.quantity,
              wholesale_stock: Math.max(0, product.wholesale_stock - inventoryItem.quantity),
            })
            .eq("id", inventoryItem.product_id);

          if (updateError) throw updateError;
        }
      }

      const { error } = await supabase
        .from("agent_inventory")
        .delete()
        .eq("id", inventoryItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory returned to main stock",
      });
      fetchAgentInventory(selectedAgent.id);
      fetchMainInventory();
    } catch (error) {
      console.error("Error deleting inventory:", error);
      toast({
        title: "Error",
        description: "Failed to remove inventory",
        variant: "destructive",
      });
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = mainInventory.find((p) => p.id === productId);
    setNewInventoryItem({
      ...newInventoryItem,
      product_id: productId,
      product_type: product?.name || "",
      unit_price: product?.unit_price || 0,
    });
  };

  const calculateTotalStockValue = () => {
    return agentInventory.reduce((sum, item) => sum + (item.total_value || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Agents Directory</h2>
                  <p className="text-sm text-muted-foreground">
                    {agents.length} {showArchived ? "archived/inactive" : "active"} agents
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowArchived(!showArchived)}
                  variant={showArchived ? "default" : "outline"}
                  className="border-border"
                >
                  {showArchived ? (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Show Active
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Show Archived
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-border"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Business Name</TableHead>
                <TableHead className="text-muted-foreground font-medium">Contact Person</TableHead>
                <TableHead className="text-muted-foreground font-medium">Phone</TableHead>
                <TableHead className="text-muted-foreground font-medium">Province</TableHead>
                <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium">Joined</TableHead>
                <TableHead className="text-muted-foreground font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No {showArchived ? "archived/inactive" : "active"} agents
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">{agent.business_name}</TableCell>
                    <TableCell className="text-foreground">{agent.contact_person}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.phone_number}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.province}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{agent.business_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(agent.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(agent)}
                          className="border-border"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {canEdit && (
                          agent.status === "approved" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveAgent(agent, "archived")}
                              className="border-border"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveAgent(agent, "approved")}
                              className="border-border text-green-500 hover:text-green-400"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
        </TabsContent>

        <TabsContent value="transactions">
          <AgentTransactionsManager />
        </TabsContent>

        <TabsContent value="performance">
          <AgentPerformanceDashboard />
        </TabsContent>
      </Tabs>

      {/* Edit Agent Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Agent: {selectedAgent?.business_name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update agent details and manage assigned inventory
            </DialogDescription>
          </DialogHeader>

          {selectedAgent && (
            <div className="space-y-6 mt-4">
              {/* Agent Details Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Agent Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Select
                      value={formData.province}
                      onValueChange={(value) => setFormData({ ...formData, province: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {zambianProvinces.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_type">Business Type</Label>
                    <Input
                      id="business_type"
                      value={formData.business_type}
                      onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {agentStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-background border-border"
                    rows={2}
                  />
                </div>
                {canEdit && (
                  <Button onClick={handleSaveAgent} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Agent Details
                  </Button>
                )}
              </div>

              {/* Assigned Inventory Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Assigned Inventory
                  </h3>
                  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Total Value: K{calculateTotalStockValue().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Add New Inventory */}
                {canEdit && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-foreground">Assign Inventory from Main Stock</p>
                    <div className="grid grid-cols-4 gap-3">
                      <Select
                        value={newInventoryItem.product_id}
                        onValueChange={handleProductSelect}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {mainInventory.length === 0 ? (
                            <SelectItem value="" disabled>No products in stock</SelectItem>
                          ) : (
                            mainInventory.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.current_stock} avail.)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={newInventoryItem.quantity || ""}
                        onChange={(e) =>
                          setNewInventoryItem({ ...newInventoryItem, quantity: parseInt(e.target.value) || 0 })
                        }
                        className="bg-background border-border"
                      />
                      <Input
                        type="number"
                        placeholder="Unit Price (ZMW)"
                        value={newInventoryItem.unit_price || ""}
                        onChange={(e) =>
                          setNewInventoryItem({ ...newInventoryItem, unit_price: parseFloat(e.target.value) || 0 })
                        }
                        className="bg-background border-border"
                      />
                      <Button onClick={handleAddInventory} disabled={!newInventoryItem.product_id}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inventory Table */}
                {isLoadingInventory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : agentInventory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
                    No inventory assigned to this agent yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Product Type</TableHead>
                        <TableHead className="text-muted-foreground">Quantity</TableHead>
                        <TableHead className="text-muted-foreground">Unit Price (ZMW)</TableHead>
                        <TableHead className="text-muted-foreground">Total Value (ZMW)</TableHead>
                        <TableHead className="text-muted-foreground">Assigned</TableHead>
                        {canEdit && <TableHead className="text-muted-foreground">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentInventory.map((item) => (
                        <TableRow key={item.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{item.product_type}</TableCell>
                          <TableCell className="text-foreground">{item.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">K{item.unit_price.toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-primary">
                            K{item.total_value.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(item.assigned_at).toLocaleDateString()}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteInventory(item)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
