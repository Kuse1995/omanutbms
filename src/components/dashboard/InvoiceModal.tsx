import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRef } from "react";
import { TenantDocumentHeader, DocumentBankDetails } from "./TenantDocumentHeader";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface Transaction {
  id: string;
  ai_client: string | null;
  bank_date: string;
  bank_amount: number;
  status: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function InvoiceModal({ isOpen, onClose, transaction }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { currencySymbol, terminology } = useBusinessConfig();

  if (!transaction) return null;

  const invoiceNumber = `INV-${transaction.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(transaction.bank_date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
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
            .total-row { font-weight: bold; font-size: 18px; }
            .total-row td { border-top: 2px solid #333; padding-top: 16px; }
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

        <div className="flex-1 overflow-y-auto pr-1">
          <div ref={invoiceRef} className="p-6 bg-white">
            {/* Tenant-branded Header */}
            <TenantDocumentHeader 
              documentType="INVOICE" 
              documentNumber={invoiceNumber}
            />

            {/* Details */}
            <div className="flex justify-between mb-8">
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                <p className="font-semibold">{transaction.ai_client || terminology.customer}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invoice Date</h3>
                <p>{invoiceDate}</p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-gray-600">Description</th>
                  <th className="text-right py-3 text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3">{terminology.products} &amp; Services</td>
                  <td className="text-right py-3">{currencySymbol} {Number(transaction.bank_amount).toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-lg">
                  <td className="py-4 border-t-2 border-gray-800">Total</td>
                  <td className="text-right py-4 border-t-2 border-gray-800">
                    {currencySymbol} {Number(transaction.bank_amount).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bank Details */}
            <DocumentBankDetails />

            {/* Footer */}
            <div className="mt-8 text-center text-gray-400 text-xs">
              <p>Thank you for your business.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-[#004B8D] hover:bg-[#003a6d]">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
