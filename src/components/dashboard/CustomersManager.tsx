import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomerModal } from "./CustomerModal";
import { Users, Plus, Search, Edit, Trash2, Loader2, Ruler, Phone, Mail } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Measurements } from "./MeasurementsForm";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  measurements: Measurements;
  notes: string | null;
  created_at: string;
}

export function CustomersManager() {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { isAdmin, canEdit: canEditRole } = useAuth();
  const { terminology } = useBusinessConfig();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const canEdit = isAdmin || canEditRole;

  const fetchCustomers = async () => {
    if (!tenant?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      
      // Parse measurements from JSONB
      const parsedData = (data || []).map(c => ({
        ...c,
        measurements: (c.measurements as Measurements) || {},
      }));
      
      setCustomers(parsedData);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [tenant?.id]);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete.id);

      if (error) throw error;
      toast({ title: "Success", description: `${terminology.customer} deleted successfully` });
      fetchCustomers();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const countMeasurements = (measurements: Measurements): number => {
    return Object.values(measurements).filter(v => typeof v === 'number' && v > 0).length;
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {terminology.customers}
          </h1>
          <p className="text-muted-foreground">
            Manage {terminology.customer.toLowerCase()} profiles and body measurements
          </p>
        </div>

        {canEdit && (
          <Button onClick={() => { setSelectedCustomer(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add {terminology.customer}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${terminology.customers.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? `No ${terminology.customers.toLowerCase()} match your search` : `No ${terminology.customers.toLowerCase()} yet`}
              </p>
              {canEdit && !searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setSelectedCustomer(null); setModalOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First {terminology.customer}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Measurements</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {countMeasurements(customer.measurements) > 0 ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Ruler className="h-3 w-3" />
                            {countMeasurements(customer.measurements)} recorded
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not recorded</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(customer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setCustomerToDelete(customer);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {terminology.customer}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
