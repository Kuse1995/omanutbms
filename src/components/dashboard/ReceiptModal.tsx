import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { guardTenant } from "@/lib/tenant-utils";
import { Loader2, Sparkles, Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { TenantDocumentHeader } from "./TenantDocumentHeader";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  total_amount: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null;
}

export function ReceiptModal({ isOpen, onClose, onSuccess, invoice }: ReceiptModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [createdReceipt, setCreatedReceipt] = useState<any>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (invoice && isOpen) {
      setAmountPaid(invoice.total_amount.toString());
      setShowPreview(false);
      setCreatedReceipt(null);
    }
  }, [invoice, isOpen]);

  const generateThankYouMessage = async () => {
    if (!invoice) return;
    setIsGeneratingMessage(true);
    
    try {
      const response = await supabase.functions.invoke("blog-writer", {
        body: {
          prompt: `Generate a brief, professional thank-you message (2-3 sentences max) for a payment receipt. Client name: ${invoice.client_name}. Amount paid: K ${Number(amountPaid).toLocaleString()}. Keep it warm but professional.`,
        },
      });

      if (response.error) throw response.error;
      setThankYouMessage(response.data?.content || "Thank you for your payment!");
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate message", variant: "destructive" });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;
    if (!guardTenant(tenantId)) return;
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("payment_receipts")
        .insert({
          receipt_number: "",
          invoice_id: invoice.id,
          client_name: invoice.client_name,
          client_email: invoice.client_email,
          amount_paid: Number(amountPaid),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: notes || null,
          ai_thank_you_message: thankYouMessage || null,
          created_by: user?.id || null,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update invoice status to paid
      await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", invoice.id);

      setCreatedReceipt(data);
      setShowPreview(true);
      toast({ title: "Success", description: "Payment receipt created successfully" });
      onSuccess();
    } catch (error: any) {
      console.error("Error creating receipt:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("receipt-content");
    if (!element) return;

    try {
      // Clone element for capturing to avoid viewport issues on mobile
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '600px';
      clone.style.maxWidth = '600px';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 600,
        windowWidth: 600,
      });
      
      document.body.removeChild(clone);
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, pdfWidth - 20, pdfHeight);
      pdf.save(`receipt-${createdReceipt?.receipt_number}.pdf`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("receipt-content");
    if (!element) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${createdReceipt?.receipt_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin: 20px 0; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .amount { font-size: 24px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; margin: 20px 0; }
              .message { font-style: italic; color: #666; margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px; }
            </style>
          </head>
          <body>${element.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg bg-white text-gray-900 max-h-[90vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-gray-900 text-base sm:text-lg">
            {showPreview ? `Receipt ${createdReceipt?.receipt_number}` : "Record Payment & Generate Receipt"}
          </DialogTitle>
        </DialogHeader>

        {showPreview && createdReceipt ? (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-3 px-3 sm:-mx-6 sm:px-6">
              <div id="receipt-content" className="bg-white p-3 sm:p-6 space-y-3 sm:space-y-4 min-w-0">
                <TenantDocumentHeader 
                  documentType="RECEIPT" 
                  documentNumber={createdReceipt.receipt_number}
                  variant="centered"
                />

                <div className="bg-green-50 text-center py-3 sm:py-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600">Amount Received</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">K {Number(createdReceipt.amount_paid).toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Received From:</span>
                    <span className="font-medium">{createdReceipt.client_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Date:</span>
                    <span>{format(new Date(createdReceipt.payment_date), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="capitalize">{createdReceipt.payment_method}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">For Invoice:</span>
                    <span>{invoice.invoice_number}</span>
                  </div>
                </div>

                {createdReceipt.ai_thank_you_message && (
                  <div className="bg-blue-50 p-4 rounded-lg italic text-gray-700 text-center">
                    "{createdReceipt.ai_thank_you_message}"
                  </div>
                )}

                {createdReceipt.notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {createdReceipt.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="order-last sm:order-first">Close</Button>
              <div className="flex gap-2 flex-1 sm:flex-none justify-end">
                <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none">
                  <Printer className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button onClick={handleDownloadPDF} className="bg-[#004B8D] hover:bg-[#003a6d] flex-1 sm:flex-none">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Recording payment for:</p>
              <p className="font-medium">{invoice.invoice_number} - {invoice.client_name}</p>
              <p className="text-lg font-bold text-[#004B8D]">K {invoice.total_amount.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountPaid">Amount Paid (ZMW) *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="thankYou">Thank You Message</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateThankYouMessage}
                  disabled={isGeneratingMessage}
                  className="text-purple-600 hover:text-purple-700"
                >
                  {isGeneratingMessage ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                id="thankYou"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder="Optional personalized thank-you message for the receipt..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Receipt
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
