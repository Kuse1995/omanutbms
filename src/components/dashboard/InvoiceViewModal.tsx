import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { TenantDocumentHeader } from "./TenantDocumentHeader";

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
  discount_amount?: number | null;
  discount_reason?: string | null;
  source_quotation_id?: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  original_amount?: number;
  discount_applied?: number;
}

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoiceViewModal({ isOpen, onClose, invoice }: InvoiceViewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sourceQuotation, setSourceQuotation] = useState<string | null>(null);

  useEffect(() => {
    if (invoice && isOpen) {
      fetchItems();
      fetchSourceQuotation();
    }
  }, [invoice, isOpen]);

  const fetchItems = async () => {
    if (!invoice) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);
    
    setItems(data?.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      amount: Number(item.amount),
      original_amount: item.original_amount ? Number(item.original_amount) : undefined,
      discount_applied: item.discount_applied ? Number(item.discount_applied) : undefined,
    })) || []);
    setIsLoading(false);
  };

  const fetchSourceQuotation = async () => {
    if (!invoice?.source_quotation_id) {
      setSourceQuotation(null);
      return;
    }
    const { data } = await supabase
      .from("quotations")
      .select("quotation_number")
      .eq("id", invoice.source_quotation_id)
      .maybeSingle();
    
    setSourceQuotation(data?.quotation_number || null);
  };

  if (!invoice) return null;

  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const handleDownloadPDF = async () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #004B8D; }
            .invoice-title { font-size: 32px; color: #333; text-align: right; }
            .invoice-number { color: #666; text-align: right; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .client-info h3, .invoice-info h3 { color: #666; font-size: 12px; margin-bottom: 8px; }
            .client-info p, .invoice-info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .total-section { width: 250px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.final { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 12px; }
            .banking { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 40px; }
            .banking h3 { margin-bottom: 12px; color: #333; }
            .banking p { margin: 4px 0; color: #666; }
            .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white text-gray-900 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Invoice Preview</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div ref={invoiceRef} className="p-6 bg-white">
              {/* Header */}
              <TenantDocumentHeader 
                documentType="INVOICE" 
                documentNumber={invoice.invoice_number}
                sourceReference={sourceQuotation}
              />

              {/* Details */}
              <div className="flex justify-between mb-8">
                <div>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                  <p className="font-semibold">{invoice.client_name}</p>
                  {invoice.client_email && <p className="text-sm text-gray-600">{invoice.client_email}</p>}
                  {invoice.client_phone && <p className="text-sm text-gray-600">{invoice.client_phone}</p>}
                </div>
                <div className="text-right">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invoice Date</h3>
                  <p>{invoiceDate}</p>
                  {dueDate && (
                    <>
                      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-4">Due Date</h3>
                      <p>{dueDate}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Table */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 text-gray-600">Description</th>
                    <th className="text-right py-3 text-gray-600">Qty</th>
                    <th className="text-right py-3 text-gray-600">Unit Price</th>
                    <th className="text-right py-3 text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3">{item.description}</td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">K {Number(item.unit_price).toLocaleString()}</td>
                      <td className="text-right py-3">K {Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-72">
                  {invoice.discount_amount && invoice.discount_amount > 0 && (
                    <>
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-gray-500">Original Subtotal:</span>
                        <span className="line-through text-gray-400">
                          K {(Number(invoice.subtotal) + Number(invoice.discount_amount)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-green-600">
                        <span className="text-sm">
                          Discount{invoice.discount_reason ? ` (${invoice.discount_reason})` : ""}:
                        </span>
                        <span>- K {Number(invoice.discount_amount).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>K {Number(invoice.subtotal).toLocaleString()}</span>
                  </div>
                  {invoice.tax_rate && invoice.tax_rate > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                      <span>K {Number(invoice.tax_amount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-t-2 border-gray-800 font-bold text-lg">
                    <span>Total:</span>
                    <span>K {Number(invoice.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Banking Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Bank:</span> Atlas Mara</p>
                  <p><span className="font-medium">Branch:</span> Lusaka Main</p>
                  <p><span className="font-medium">Account Number:</span> 0015997204011</p>
                  <p><span className="font-medium">Account Name:</span> Finch Investments Ltd</p>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm text-blue-800">Notes</h3>
                  <p className="text-sm text-blue-700">{invoice.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 text-center text-gray-400 text-xs">
                <p>Thank you for your business.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            variant="outline"
            disabled={isDownloading}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-[#004B8D] hover:bg-[#003a6d]">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}