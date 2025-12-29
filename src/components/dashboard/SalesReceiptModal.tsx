import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { TenantDocumentHeader } from "./TenantDocumentHeader";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  item_type: string;
  selected_color?: string | null;
  selected_size?: string | null;
}

interface SalesReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentDate: string;
  litersImpact: number;
}

export function SalesReceiptModal({
  isOpen,
  onClose,
  receiptNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  totalAmount,
  paymentMethod,
  paymentDate,
  litersImpact,
}: SalesReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { companyName, tagline, isImpactEnabled, impact } = useBusinessConfig();

  const formatPaymentMethod = (method: string) => {
    return method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("sales-receipt-content");
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xOffset = 10; // 10mm left margin
      const yOffset = 10; // 10mm top margin
      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      pdf.save(`receipt-${receiptNumber}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("sales-receipt-content");
    if (!element) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .header img { height: 60px; margin-bottom: 10px; }
              .header h2 { color: #004B8D; margin: 10px 0 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f5f5f5; }
              .total { font-size: 1.2em; font-weight: bold; }
              .impact { background: #e6f7f0; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white text-gray-900 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Sales Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div id="sales-receipt-content" className="bg-white p-6 space-y-4">
            <TenantDocumentHeader
              documentType="RECEIPT"
              documentNumber={receiptNumber}
              variant="centered"
            />

            <div className="bg-green-50 text-center py-4 rounded-lg">
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-3xl font-bold text-green-600">
                K {totalAmount.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Receipt Number:</span>
                <span className="font-medium">{receiptNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{customerName || "Walk-in Customer"}</span>
              </div>
              {customerEmail && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Email:</span>
                  <span>{customerEmail}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Phone:</span>
                  <span>{customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payment Date:</span>
                <span>{format(new Date(paymentDate), "dd MMM yyyy")}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{formatPaymentMethod(paymentMethod)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 mb-2">Items Purchased</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">
                        {item.product_name}
                        {item.selected_color && ` - ${item.selected_color}`}
                        {item.selected_size && ` (${item.selected_size})`}
                        {item.item_type === "service" && (
                          <span className="ml-1 text-xs text-amber-600">[Service]</span>
                        )}
                      </td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">K {item.unit_price_zmw.toLocaleString()}</td>
                      <td className="text-right py-2">K {item.total_amount_zmw.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={3} className="text-right py-2">Total:</td>
                    <td className="text-right py-2 text-green-600">K {totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {isImpactEnabled && litersImpact > 0 && (
              <div className="bg-teal-50 text-center py-4 rounded-lg border border-teal-200">
                <p className="text-sm text-teal-600">{impact.unitLabel || 'Impact'} Generated</p>
                <p className="text-2xl font-bold text-teal-700">
                  {litersImpact.toLocaleString()} {impact.unitLabel || 'Units'}
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  Thank you for your contribution!
                </p>
              </div>
            )}

            <div className="text-center text-gray-500 text-xs pt-4 border-t">
              <p>Thank you for your purchase!</p>
              {(companyName || tagline) && (
                <p className="mt-1">{[companyName, tagline].filter(Boolean).join(' - ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-[#004B8D] hover:bg-[#003a6d]"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
