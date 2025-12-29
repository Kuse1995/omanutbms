import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Download, Loader2, AlertTriangle, CheckCircle, Clock, FileText, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTenant } from "@/hooks/useTenant";

interface CreditSale {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string;
  quantity: number;
  total_amount_zmw: number;
  created_at: string;
  selected_color: string | null;
  selected_size: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface CreditSaleWithInvoice extends CreditSale {
  invoice?: Invoice | null;
}

export function CreditSalesReport() {
  const [creditSales, setCreditSales] = useState<CreditSaleWithInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [selectedSale, setSelectedSale] = useState<CreditSaleWithInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  useEffect(() => {
    fetchCreditSales();
  }, []);

  const fetchCreditSales = async () => {
    setIsLoading(true);
    try {
      // Fetch credit sales
      const { data: salesData, error: salesError } = await supabase
        .from("sales_transactions")
        .select("*")
        .eq("payment_method", "credit_invoice")
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // Fetch all invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_number, client_name, total_amount, due_date, status, created_at")
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Match sales with invoices by customer name and approximate amount/date
      const salesWithInvoices: CreditSaleWithInvoice[] = (salesData || []).map((sale) => {
        // Find matching invoice by client name and similar amount within a reasonable time window
        const matchingInvoice = invoicesData?.find(
          (inv) =>
            inv.client_name.toLowerCase() === sale.customer_name?.toLowerCase() &&
            Math.abs(inv.total_amount - sale.total_amount_zmw) < 1 // Allow small rounding differences
        );

        return {
          ...sale,
          invoice: matchingInvoice || null,
        };
      });

      setCreditSales(salesWithInvoices);
    } catch (error) {
      console.error("Error fetching credit sales:", error);
      toast({
        title: "Error",
        description: "Failed to fetch credit sales data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (invoice: Invoice | null | undefined) => {
    if (!invoice) {
      return <Badge variant="outline" className="border-gray-300 text-gray-600">No Invoice</Badge>;
    }

    const status = invoice.status;
    if (status === "paid") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    
    if (invoice.due_date) {
      const daysOverdue = differenceInDays(new Date(), new Date(invoice.due_date));
      if (daysOverdue > 0) {
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {daysOverdue} days overdue
          </Badge>
        );
      }
    }

    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <Clock className="w-3 h-3 mr-1" />
        {status === "sent" ? "Pending" : status}
      </Badge>
    );
  };

  const getDaysOutstanding = (sale: CreditSaleWithInvoice) => {
    if (sale.invoice?.status === "paid") return 0;
    return differenceInDays(new Date(), new Date(sale.created_at));
  };

  // Calculate summary stats
  const totalCreditSales = creditSales.length;
  const totalOutstanding = creditSales
    .filter((s) => s.invoice?.status !== "paid")
    .reduce((sum, s) => sum + s.total_amount_zmw, 0);
  const totalPaid = creditSales
    .filter((s) => s.invoice?.status === "paid")
    .reduce((sum, s) => sum + s.total_amount_zmw, 0);
  const overdueCount = creditSales.filter((s) => {
    if (s.invoice?.status === "paid") return false;
    if (!s.invoice?.due_date) return false;
    return differenceInDays(new Date(), new Date(s.invoice.due_date)) > 0;
  }).length;

  const openPaymentDialog = (sale: CreditSaleWithInvoice) => {
    setSelectedSale(sale);
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
  };

  const closePaymentDialog = () => {
    setSelectedSale(null);
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleMarkAsPaid = async () => {
    if (!selectedSale?.invoice) return;
    
    if (!tenantId) {
      toast({ title: "Error", description: "Organization context missing. Please log in again.", variant: "destructive" });
      return;
    }

    setIsMarkingPaid(true);
    try {
      // Update invoice status to paid
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", selectedSale.invoice.id);

      if (invoiceError) throw invoiceError;

      // Create payment receipt
      const { error: receiptError } = await supabase
        .from("payment_receipts")
        .insert([{
          tenant_id: tenantId,
          invoice_id: selectedSale.invoice.id,
          client_name: selectedSale.customer_name || "Unknown",
          client_email: selectedSale.customer_email,
          amount_paid: selectedSale.total_amount_zmw,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: paymentNotes || `Payment for invoice ${selectedSale.invoice.invoice_number}`,
        }] as any);

      if (receiptError) throw receiptError;

      toast({
        title: "Payment Recorded",
        description: `Invoice ${selectedSale.invoice.invoice_number} marked as paid and receipt generated`,
      });

      closePaymentDialog();
      fetchCreditSales();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add header
      pdf.setFillColor(0, 75, 141);
      pdf.rect(0, 0, pdfWidth, 25, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("Credit Sales Report", 14, 16);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${format(new Date(), "PPP")}`, pdfWidth - 60, 16);
      
      // Calculate image dimensions
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 10, 30, imgWidth, Math.min(imgHeight, pdfHeight - 40));
      
      pdf.save(`credit-sales-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Credit sales report exported successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-[#003366]">Credit Sales Report</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export PDF
        </Button>
      </div>

      <div ref={contentRef}>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <p className="text-blue-600 text-sm">Total Credit Sales</p>
              <p className="text-2xl font-bold text-blue-700">{totalCreditSales}</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-4">
              <p className="text-amber-600 text-sm">Outstanding Amount</p>
              <p className="text-2xl font-bold text-amber-700">K {totalOutstanding.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <p className="text-green-600 text-sm">Paid Amount</p>
              <p className="text-2xl font-bold text-green-700">K {totalPaid.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="py-4">
              <p className="text-red-600 text-sm">Overdue Invoices</p>
              <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Sales Table */}
        <Card className="border-[#004B8D]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#003366] text-base">Credit Sales History</CardTitle>
            <CardDescription>All sales made on credit with invoice status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#004B8D]/10">
                  <TableHead className="text-[#004B8D]/70">Date</TableHead>
                  <TableHead className="text-[#004B8D]/70">Customer</TableHead>
                  <TableHead className="text-[#004B8D]/70">Product</TableHead>
                  <TableHead className="text-[#004B8D]/70 text-right">Amount</TableHead>
                  <TableHead className="text-[#004B8D]/70">Invoice #</TableHead>
                  <TableHead className="text-[#004B8D]/70">Due Date</TableHead>
                  <TableHead className="text-[#004B8D]/70">Status</TableHead>
                  <TableHead className="text-[#004B8D]/70 text-right">Days Out</TableHead>
                  <TableHead className="text-[#004B8D]/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-[#004B8D]/50 py-8">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No credit sales recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  creditSales.map((sale) => (
                    <TableRow key={sale.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                      <TableCell className="text-[#003366]/70 text-sm">
                        {format(new Date(sale.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#003366] font-medium">{sale.customer_name || "Unknown"}</p>
                          {sale.customer_phone && (
                            <p className="text-[#004B8D]/50 text-xs">{sale.customer_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#003366]">{sale.product_name}</p>
                          {(sale.selected_color || sale.selected_size) && (
                            <p className="text-[#004B8D]/50 text-xs">
                              {[sale.selected_color, sale.selected_size].filter(Boolean).join(" / ")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#0077B6]">
                        K {sale.total_amount_zmw.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {sale.invoice ? (
                          <span className="text-[#003366] font-mono text-sm">{sale.invoice.invoice_number}</span>
                        ) : (
                          <span className="text-[#004B8D]/40 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#003366]/70 text-sm">
                        {sale.invoice?.due_date
                          ? format(new Date(sale.invoice.due_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.invoice)}</TableCell>
                      <TableCell className="text-right">
                        {sale.invoice?.status === "paid" ? (
                          <span className="text-green-600">0</span>
                        ) : (
                          <span className={getDaysOutstanding(sale) > 30 ? "text-red-600 font-medium" : "text-[#003366]"}>
                            {getDaysOutstanding(sale)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.invoice && sale.invoice.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPaymentDialog(sale)}
                            className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <Banknote className="w-3 h-3 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        {sale.invoice?.status === "paid" && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => closePaymentDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#003366]">
              <Banknote className="w-5 h-5 text-green-600" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Confirm payment details for invoice{" "}
              <span className="font-mono font-medium">{selectedSale?.invoice?.invoice_number}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-[#004B8D]/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#004B8D]/70">Customer:</span>
                <span className="font-medium text-[#003366]">{selectedSale?.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#004B8D]/70">Amount:</span>
                <span className="font-bold text-[#0077B6]">K {selectedSale?.total_amount_zmw.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="border-[#004B8D]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-[#004B8D]/20">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Textarea
                id="payment-notes"
                placeholder="Payment reference or notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="border-[#004B8D]/20 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closePaymentDialog}
              className="border-[#004B8D]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={isMarkingPaid}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isMarkingPaid ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditSalesReport;
