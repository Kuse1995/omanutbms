import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Loader2, Plus, Eye, Edit, Trash2, FileCheck, CheckCircle, Lock, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { QuotationFormModal } from "./QuotationFormModal";
import { QuotationViewModal } from "./QuotationViewModal";
import { QuotationToInvoiceModal } from "./QuotationToInvoiceModal";

interface Quotation {
  id: string;
  quotation_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  notes: string | null;
  converted_to_invoice_id: string | null;
}

interface ClientGroup {
  clientName: string;
  quotations: Quotation[];
  totalAmount: number;
  quotationCount: number;
}

export function QuotationsManager() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { canAdd, isAdmin } = useAuth();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchQuotations();
    }
  }, [tenantId]);

  const fetchQuotations = async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Group quotations by client name
  const clientGroups = useMemo((): ClientGroup[] => {
    const groups: Record<string, Quotation[]> = {};
    
    quotations.forEach((quotation) => {
      const clientName = quotation.client_name || "Unknown Client";
      if (!groups[clientName]) {
        groups[clientName] = [];
      }
      groups[clientName].push(quotation);
    });

    return Object.entries(groups).map(([clientName, clientQuotations]) => ({
      clientName,
      quotations: clientQuotations,
      totalAmount: clientQuotations.reduce((sum, q) => sum + Number(q.total_amount), 0),
      quotationCount: clientQuotations.length,
    })).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [quotations]);

  const toggleClient = (clientName: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;

    try {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Quotation deleted" });
      fetchQuotations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenConvertModal = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowConvertModal(true);
    setShowViewModal(false);
  };

  const handleMarkAsAccepted = async (quotation: Quotation) => {
    try {
      await supabase
        .from("quotations")
        .update({ status: "accepted" })
        .eq("id", quotation.id);

      toast({ title: "Success", description: "Quotation marked as accepted" });
      fetchQuotations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-amber-100 text-amber-800",
      converted: "bg-purple-100 text-purple-800",
    };
    return <Badge className={styles[status] || styles.draft}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quotations by Client ({clientGroups.length} clients, {quotations.length} quotations)
          </CardTitle>
          {canAdd && (
            <Button onClick={() => { setSelectedQuotation(null); setShowFormModal(true); }} className="bg-[#004B8D] hover:bg-[#003a6d]">
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {clientGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No quotations yet. Create your first quotation!
            </div>
          ) : (
            clientGroups.map((group) => (
              <Collapsible
                key={group.clientName}
                open={expandedClients.has(group.clientName)}
                onOpenChange={() => toggleClient(group.clientName)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-[#004B8D]/5 hover:bg-[#004B8D]/10 rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedClients.has(group.clientName) ? (
                        <ChevronDown className="h-4 w-4 text-[#004B8D]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#004B8D]" />
                      )}
                      <div>
                        <span className="font-medium text-[#003366]">{group.clientName}</span>
                        <span className="text-xs text-[#004B8D]/60 ml-2">
                          ({group.quotationCount} quotation{group.quotationCount !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#003366] font-medium">K {group.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-4 border-l-2 border-[#004B8D]/10 pl-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.quotations.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="font-medium">{q.quotation_number}</TableCell>
                            <TableCell>{format(new Date(q.quotation_date), "dd MMM yyyy")}</TableCell>
                            <TableCell>{q.valid_until ? format(new Date(q.valid_until), "dd MMM yyyy") : "-"}</TableCell>
                            <TableCell>K {Number(q.total_amount).toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(q.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setSelectedQuotation(q); setShowViewModal(true); }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => { setSelectedQuotation(q); setShowFormModal(true); }}
                                          disabled={q.status === "converted" || !isAdmin}
                                        >
                                          {isAdmin ? <Edit className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                                  </Tooltip>
                                </TooltipProvider>
                                {q.status === "sent" && isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMarkAsAccepted(q)}
                                    title="Mark as Accepted"
                                  >
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {q.status !== "converted" && canAdd && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenConvertModal(q)}
                                    title="Convert to Invoice"
                                  >
                                    <FileCheck className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(q.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </CardContent>
      </Card>

      <QuotationFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={fetchQuotations}
        quotation={selectedQuotation}
      />

      <QuotationViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        quotation={selectedQuotation}
        onConvertToInvoice={handleOpenConvertModal}
      />

      <QuotationToInvoiceModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={fetchQuotations}
        quotation={selectedQuotation}
      />
    </>
  );
}
