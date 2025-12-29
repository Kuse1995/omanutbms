import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Package, CreditCard, Droplets, Calendar, FileText, Wrench } from "lucide-react";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface SaleTransaction {
  id: string;
  transaction_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  liters_impact: number;
  payment_method: string | null;
  selected_color: string | null;
  selected_size: string | null;
  notes: string | null;
  created_at: string;
  item_type?: string;
}

interface SaleDetailsModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SaleDetailsModal({ sale, isOpen, onClose }: SaleDetailsModalProps) {
  const { isImpactEnabled, impact } = useBusinessConfig();
  
  if (!sale) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZM', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Cash';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#003366] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0077B6]" />
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#004B8D] uppercase tracking-wide">Customer Information</h4>
            <div className="bg-[#f0f7fa] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-[#004B8D]/60" />
                <div>
                  <p className="text-xs text-[#004B8D]/60">Name</p>
                  <p className="text-[#003366] font-medium">
                    {sale.customer_name || <span className="text-[#004B8D]/40 italic">Walk-in Customer</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#004B8D]/60" />
                <div>
                  <p className="text-xs text-[#004B8D]/60">Email</p>
                  <p className="text-[#003366]">
                    {sale.customer_email ? (
                      <a href={`mailto:${sale.customer_email}`} className="text-[#0077B6] hover:underline">
                        {sale.customer_email}
                      </a>
                    ) : (
                      <span className="text-[#004B8D]/40 italic">Not provided</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#004B8D]/60" />
                <div>
                  <p className="text-xs text-[#004B8D]/60">Phone</p>
                  <p className="text-[#003366]">
                    {sale.customer_phone ? (
                      <a href={`tel:${sale.customer_phone}`} className="text-[#0077B6] hover:underline">
                        {sale.customer_phone}
                      </a>
                    ) : (
                      <span className="text-[#004B8D]/40 italic">Not provided</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-[#004B8D]/10" />

          {/* Product/Service Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#004B8D] uppercase tracking-wide flex items-center gap-2">
              {sale.item_type === "service" ? (
                <>
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Service Details
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 text-[#0077B6]" />
                  Product Details
                </>
              )}
            </h4>
            <div className={`rounded-lg p-4 space-y-3 ${sale.item_type === "service" ? "bg-amber-50" : "bg-[#f0f7fa]"}`}>
              <div className="flex items-center gap-3">
                {sale.item_type === "service" ? (
                  <Wrench className="w-4 h-4 text-amber-600/60" />
                ) : (
                  <Package className="w-4 h-4 text-[#004B8D]/60" />
                )}
                <div className="flex-1">
                  <p className="text-xs text-[#004B8D]/60">{sale.item_type === "service" ? "Service" : "Product"}</p>
                  <p className="text-[#003366] font-medium flex items-center gap-2">
                    {sale.product_name}
                    {sale.item_type === "service" && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">Service</Badge>
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#004B8D]/60">Quantity</p>
                  <p className="text-[#003366] font-medium">{sale.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-[#004B8D]/60">Unit Price</p>
                  <p className="text-[#003366] font-medium">K{sale.unit_price_zmw?.toLocaleString() || '-'}</p>
                </div>
              </div>
              {(sale.selected_color || sale.selected_size) && sale.item_type !== "service" && (
                <div className="flex gap-2 flex-wrap">
                  {sale.selected_color && (
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                      Color: {sale.selected_color}
                    </Badge>
                  )}
                  {sale.selected_size && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      Size: {sale.selected_size}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-[#004B8D]/10" />

          {/* Transaction Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#004B8D] uppercase tracking-wide">Transaction Details</h4>
            <div className="bg-gradient-to-br from-[#004B8D]/5 to-[#0077B6]/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#004B8D]/60">Total Amount</span>
                <span className="text-[#0077B6] font-bold text-xl">K{sale.total_amount_zmw.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#004B8D]/60 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </span>
                <Badge variant="outline" className="border-[#004B8D]/20 text-[#003366]">
                  {formatPaymentMethod(sale.payment_method)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#004B8D]/60 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </span>
                <span className="text-[#003366] text-sm">{formatDate(sale.created_at)}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#004B8D]/10" />

          {/* Impact - only show for products when impact is enabled */}
          {isImpactEnabled && sale.item_type !== "service" && sale.liters_impact > 0 && (
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-teal-600" />
                  <span className="text-teal-700 font-medium">{impact.unitLabel || 'Impact'} Generated</span>
                </div>
                <span className="text-teal-600 font-bold text-lg">{sale.liters_impact.toLocaleString()} {impact.unitLabel || 'Units'}</span>
              </div>
            </div>
          )}

          {/* No impact notice for services when impact is enabled */}
          {isImpactEnabled && sale.item_type === "service" && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span className="text-amber-700 text-sm">Services do not generate impact metrics</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
              <p className="text-amber-800 text-sm">{sale.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
