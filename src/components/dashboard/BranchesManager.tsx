import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Users,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Branch, useBranch } from '@/hooks/useBranch';
import { BranchModal } from './BranchModal';

interface BranchWithStats extends Branch {
  user_count?: number;
  employee_count?: number;
}

export const BranchesManager: React.FC = () => {
  const { tenant } = useTenant();
  const { refetchBranches } = useBranch();
  const { toast } = useToast();

  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBranches = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      // Fetch branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('is_headquarters', { ascending: false })
        .order('name');

      if (branchError) throw branchError;

      // Fetch user counts per branch
      const { data: userCounts, error: userError } = await supabase
        .from('tenant_users')
        .select('branch_id')
        .eq('tenant_id', tenant.id)
        .not('branch_id', 'is', null);

      // Fetch employee counts per branch
      const { data: employeeCounts, error: empError } = await supabase
        .from('employees')
        .select('branch_id')
        .eq('tenant_id', tenant.id)
        .not('branch_id', 'is', null);

      // Calculate counts
      const userCountMap: Record<string, number> = {};
      const employeeCountMap: Record<string, number> = {};

      (userCounts || []).forEach((u: any) => {
        if (u.branch_id) {
          userCountMap[u.branch_id] = (userCountMap[u.branch_id] || 0) + 1;
        }
      });

      (employeeCounts || []).forEach((e: any) => {
        if (e.branch_id) {
          employeeCountMap[e.branch_id] = (employeeCountMap[e.branch_id] || 0) + 1;
        }
      });

      const branchesWithStats: BranchWithStats[] = (branchData || []).map((branch: any) => ({
        ...branch,
        user_count: userCountMap[branch.id] || 0,
        employee_count: employeeCountMap[branch.id] || 0,
      }));

      setBranches(branchesWithStats);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load branches',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [tenant?.id]);

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingBranch(null);
    setModalOpen(true);
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchToDelete.id);

      if (error) throw error;

      toast({
        title: 'Branch Deleted',
        description: `${branchToDelete.name} has been deleted.`,
      });

      await fetchBranches();
      await refetchBranches();
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete branch',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  const handleSuccess = async () => {
    await fetchBranches();
    await refetchBranches();
  };

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Branch Management</h2>
          <p className="text-muted-foreground">
            Manage your business locations and branches
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBranches}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-xs text-muted-foreground">
              {branches.filter((b) => b.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.reduce((sum, b) => sum + (b.user_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Assigned to branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.reduce((sum, b) => sum + (b.employee_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Working at branches</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Branches Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No branches found matching your search' : 'No branches yet. Add your first branch.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBranches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {branch.is_headquarters ? (
                          <Building2 className="h-4 w-4 text-primary" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium">{branch.name}</div>
                          {branch.is_headquarters && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Headquarters
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                        {branch.code || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      {branch.city || branch.address ? (
                        <div className="text-sm">
                          {branch.city && <div>{branch.city}</div>}
                          {branch.address && (
                            <div className="text-muted-foreground truncate max-w-[200px]">
                              {branch.address}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {branch.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{branch.email}</span>
                          </div>
                        )}
                        {!branch.phone && !branch.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{branch.user_count || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{branch.employee_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(branch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(branch)}
                          disabled={branch.is_headquarters}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Branch Modal */}
      <BranchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        branch={editingBranch}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{branchToDelete?.name}"? This action
              cannot be undone. Users and employees assigned to this branch will
              have their branch assignment removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
