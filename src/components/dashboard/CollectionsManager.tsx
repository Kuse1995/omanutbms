import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Pencil, Trash2, Loader2, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { CollectionModal } from "./CollectionModal";
import { format } from "date-fns";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  product_count?: number;
}

export function CollectionsManager() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  const fetchCollections = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      // Fetch collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from("collections")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (collectionsError) throw collectionsError;

      // Fetch product counts per collection
      const { data: productCounts, error: countsError } = await supabase
        .from("inventory")
        .select("collection_id")
        .eq("tenant_id", tenantId)
        .not("collection_id", "is", null);

      if (countsError) throw countsError;

      // Count products per collection
      const countMap = new Map<string, number>();
      productCounts?.forEach((p) => {
        if (p.collection_id) {
          countMap.set(p.collection_id, (countMap.get(p.collection_id) || 0) + 1);
        }
      });

      // Merge counts
      const enrichedCollections = (collectionsData || []).map((c) => ({
        ...c,
        product_count: countMap.get(c.id) || 0,
      }));

      setCollections(enrichedCollections);
    } catch (error: any) {
      toast({ title: "Error loading collections", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [tenantId]);

  const handleAdd = () => {
    setSelectedCollection(null);
    setModalOpen(true);
  };

  const handleEdit = (collection: Collection) => {
    setSelectedCollection(collection);
    setModalOpen(true);
  };

  const handleDeleteClick = (collection: Collection) => {
    setCollectionToDelete(collection);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;

    try {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionToDelete.id);

      if (error) throw error;

      toast({ title: "Collection deleted successfully" });
      fetchCollections();
    } catch (error: any) {
      toast({ title: "Error deleting collection", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    }
  };

  const getStatusBadge = (collection: Collection) => {
    const now = new Date();
    const start = collection.start_date ? new Date(collection.start_date) : null;
    const end = collection.end_date ? new Date(collection.end_date) : null;

    if (!collection.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (end && now > end) {
      return <Badge variant="outline" className="text-muted-foreground">Ended</Badge>;
    }
    if (start && now < start) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Upcoming</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Collections
          </h3>
          <p className="text-sm text-muted-foreground">
            Organize products by seasons, drops, or campaigns
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {collections.filter((c) => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products in Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {collections.reduce((sum, c) => sum + (c.product_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No collections yet. Create your first collection to organize products.
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{collection.name}</div>
                        {collection.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {collection.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {collection.start_date
                          ? format(new Date(collection.start_date), "MMM d")
                          : "—"}
                        {" → "}
                        {collection.end_date
                          ? format(new Date(collection.end_date), "MMM d, yyyy")
                          : "Ongoing"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        {collection.product_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(collection)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(collection)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(collection)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Collection Modal */}
      <CollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        collection={selectedCollection}
        onSuccess={fetchCollections}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{collectionToDelete?.name}" but products in this collection will be preserved.
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
    </motion.div>
  );
}
