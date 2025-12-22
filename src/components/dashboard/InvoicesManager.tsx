import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FileText, Plus, RefreshCw, Loader2, Eye, Pencil, Trash2, Receipt, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { InvoiceFormModal } from "./InvoiceFormModal";
import { InvoiceViewModal } from "./InvoiceViewModal";
import { ReceiptModal } from "./ReceiptModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  notes: string | null;
}

export function InvoicesManager() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { canAdd, isAdmin } = useAuth();

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    const channel = supabase
      .channel("invoices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchInvoices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInvoices();
    toast({ title: "Refreshed", description: "Invoices updated" });
  };

  const handleCreate = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsReceiptOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("invoices").delete().eq("id", deleteId);
      if (error) throw error;

      toast({ title: "Deleted", description: "Invoice deleted successfully" });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 border-gray-200",
      sent: "bg-blue-100 text-blue-700 border-blue-200",
      paid: "bg-green-100 text-green-700 border-green-200",
      overdue: "bg-red-100 text-red-700 border-red-200",
      cancelled: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return styles[status] || styles.draft;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Invoices</h2>
          <p className="text-[#004B8D]/60">Create, view, and manage invoices</p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Button
              onClick={handleCreate}
              className="bg-[#004B8D] hover:bg-[#003a6d] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice List ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#004B8D]/10 hover:bg-transparent">
                <TableHead className="text-[#004B8D]/70">Invoice #</TableHead>
                <TableHead className="text-[#004B8D]/70">Client</TableHead>
                <TableHead className="text-[#004B8D]/70">Date</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Amount</TableHead>
                <TableHead className="text-[#004B8D]/70">Status</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#004B8D]/50 py-8">
                    No invoices found. Create your first invoice!
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                    <TableCell className="text-[#003366] font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-[#003366]">
                      {invoice.client_name}
                    </TableCell>
                    <TableCell className="text-[#003366]/70">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-[#003366] font-medium">
                      K {Number(invoice.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(invoice)}
                          className="h-8 w-8 text-[#004B8D] hover:bg-[#004B8D]/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== "paid" && canAdd && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRecordPayment(invoice)}
                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                            title="Record Payment"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(invoice)}
                                  className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                  disabled={!isAdmin}
                                >
                                  {isAdmin ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(invoice.id)}
                                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  disabled={!isAdmin}
                                >
                                  {isAdmin ? <Trash2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoiceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchInvoices}
        invoice={selectedInvoice}
      />

      <InvoiceViewModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        invoice={selectedInvoice}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onSuccess={fetchInvoices}
        invoice={selectedInvoice}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice and all its items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}