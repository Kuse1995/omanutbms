import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Printer, FileCheck } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { TenantDocumentHeader, DocumentBankDetails } from "./TenantDocumentHeader";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

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
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onConvertToInvoice?: (quotation: Quotation) => void;
}

export function QuotationViewModal({ isOpen, onClose, quotation, onConvertToInvoice }: QuotationViewModalProps) {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const { terminology, currencySymbol } = useBusinessConfig();

  useEffect(() => {
    if (isOpen && quotation) {
      fetchItems();
    }
  }, [isOpen, quotation]);

  const fetchItems = async () => {
    if (!quotation) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("quotation-content");
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`quotation-${quotation?.quotation_number}.pdf`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("quotation-content");
    if (!element) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quotation ${quotation?.quotation_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .header { margin-bottom: 30px; }
              .totals { text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>${element.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white text-gray-900 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            Quotation {quotation.quotation_number}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div id="quotation-content" className="bg-white p-6 space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <TenantDocumentHeader 
                  documentType="QUOTATION" 
                  documentNumber={quotation.quotation_number}
                />
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Quote To ({terminology.customer}):</h4>
                  <p className="font-medium">{quotation.client_name}</p>
                  {quotation.client_email && <p className="text-sm text-gray-600">{quotation.client_email}</p>}
                  {quotation.client_phone && <p className="text-sm text-gray-600">{quotation.client_phone}</p>}
                </div>
                <div className="text-right">
                  <p><span className="text-gray-600">Date:</span> {format(new Date(quotation.quotation_date), "dd MMM yyyy")}</p>
                  {quotation.valid_until && (
                    <p><span className="text-gray-600">Valid Until:</span> {format(new Date(quotation.valid_until), "dd MMM yyyy")}</p>
                  )}
                  <p className="mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      quotation.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      quotation.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quotation.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-right w-20">Qty</th>
                    <th className="border p-2 text-right w-28">Unit Price</th>
                    <th className="border p-2 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.description}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                      <td className="border p-2 text-right">{currencySymbol} {Number(item.unit_price).toLocaleString()}</td>
                      <td className="border p-2 text-right">{currencySymbol} {Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{currencySymbol} {Number(quotation.subtotal).toLocaleString()}</span>
                  </div>
                  {quotation.tax_rate && quotation.tax_rate > 0 && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax ({quotation.tax_rate}%):</span>
                        <span>{currencySymbol} {Number(quotation.tax_amount || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span>{currencySymbol} {Number(quotation.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <DocumentBankDetails />

              {/* Notes */}
              {quotation.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Terms & Conditions:</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{quotation.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {onConvertToInvoice && quotation.status !== 'converted' && (
              <Button 
                onClick={() => onConvertToInvoice(quotation)} 
                className="bg-green-600 hover:bg-green-700"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isDownloading} className="bg-[#004B8D] hover:bg-[#003a6d]">
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
