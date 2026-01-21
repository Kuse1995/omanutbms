import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Pencil, 
  Trash2, 
  Store, 
  Warehouse, 
  Factory,
  MapPin,
  Building2,
  Users
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { LocationModal } from "./LocationModal";

export type LocationType = 'Store' | 'Warehouse' | 'Production';

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  type: LocationType;
  is_headquarters: boolean;
  is_active: boolean;
  created_at: string;
}

interface LocationWithStats extends Location {
  user_count?: number;
  employee_count?: number;
  inventory_count?: number;
}

const typeConfig: Record<LocationType, { icon: React.ElementType; color: string; bgColor: string }> = {
  Store: { icon: Store, color: "text-blue-600", bgColor: "bg-blue-100" },
  Warehouse: { icon: Warehouse, color: "text-amber-600", bgColor: "bg-amber-100" },
  Production: { icon: Factory, color: "text-purple-600", bgColor: "bg-purple-100" },
};

export function LocationsManager() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all');

  const fetchLocations = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name");

      if (branchesError) throw branchesError;

      // Get user counts per branch
      const { data: usersData } = await supabase
        .from("tenant_users")
        .select("branch_id")
        .eq("tenant_id", tenant.id);

      // Get employee counts per branch
      const { data: employeesData } = await supabase
        .from("employees")
        .select("branch_id")
        .eq("tenant_id", tenant.id);

      // Get inventory counts per branch
      const { data: inventoryData } = await supabase
        .from("branch_inventory")
        .select("branch_id, current_stock")
        .eq("tenant_id", tenant.id);

      const locationsWithStats: LocationWithStats[] = (branchesData || []).map((branch: any) => ({
        ...branch,
        type: branch.type || 'Store',
        user_count: usersData?.filter(u => u.branch_id === branch.id).length || 0,
        employee_count: employeesData?.filter(e => e.branch_id === branch.id).length || 0,
        inventory_count: inventoryData?.filter(i => i.branch_id === branch.id).reduce((sum, i) => sum + (i.current_stock || 0), 0) || 0,
      }));

      setLocations(locationsWithStats);
    } catch (error: any) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [tenant?.id]);

  const handleAdd = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setModalOpen(true);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;
    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", locationToDelete.id);

      if (error) throw error;

      toast({
        title: "Location Deleted",
        description: `${locationToDelete.name} has been removed.`,
      });
      fetchLocations();
    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || loc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    stores: locations.filter(l => l.type === 'Store').length,
    warehouses: locations.filter(l => l.type === 'Warehouse').length,
    production: locations.filter(l => l.type === 'Production').length,
    total: locations.length,
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
          <h2 className="text-2xl font-bold text-foreground">Locations</h2>
          <p className="text-muted-foreground">Manage your stores, warehouses, and production facilities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLocations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTypeFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${typeFilter === 'Store' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setTypeFilter(typeFilter === 'Store' ? 'all' : 'Store')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.stores}</p>
                <p className="text-sm text-muted-foreground">Stores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${typeFilter === 'Warehouse' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setTypeFilter(typeFilter === 'Warehouse' ? 'all' : 'Warehouse')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Warehouse className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.warehouses}</p>
                <p className="text-sm text-muted-foreground">Warehouses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${typeFilter === 'Production' ? 'ring-2 ring-purple-500' : ''}`} onClick={() => setTypeFilter(typeFilter === 'Production' ? 'all' : 'Production')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Factory className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.production}</p>
                <p className="text-sm text-muted-foreground">Production</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
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
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Staff</TableHead>
                <TableHead className="text-center">Stock Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No locations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((location) => {
                  const TypeIcon = typeConfig[location.type]?.icon || Store;
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${typeConfig[location.type]?.bgColor || 'bg-gray-100'}`}>
                            <TypeIcon className={`h-4 w-4 ${typeConfig[location.type]?.color || 'text-gray-600'}`} />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {location.name}
                              {location.is_headquarters && (
                                <Badge variant="outline" className="text-xs">HQ</Badge>
                              )}
                            </div>
                            {location.code && (
                              <div className="text-sm text-muted-foreground">{location.code}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={typeConfig[location.type]?.bgColor}>
                          {location.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {location.city && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {location.city}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {location.user_count || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{location.employee_count || 0}</TableCell>
                      <TableCell className="text-center">{location.inventory_count?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? "default" : "secondary"}>
                          {location.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(location)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <LocationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        location={editingLocation}
        onSuccess={fetchLocations}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
