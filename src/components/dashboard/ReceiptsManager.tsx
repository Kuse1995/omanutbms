import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Search, Filter, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { SalesReceiptModal } from "./SalesReceiptModal";
import { useTenant } from "@/hooks/useTenant";

interface ReceiptData {
  id: string;
  receipt_number: string;
  client_name: string;
  client_email: string | null;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  invoice_id: string | null;
}

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  item_type: string;
  selected_color: string | null;
  selected_size: string | null;
  liters_impact: number;
  customer_phone: string | null;
}

export function ReceiptsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptItems, setReceiptItems] = useState<SaleItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const { tenantId } = useTenant();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["all-receipts", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReceiptData[];
    },
    enabled: !!tenantId,
  });

  // Fetch items linked to a receipt via sales_transactions
  const fetchReceiptItems = async (receiptNumber: string) => {
    if (!tenantId) return;
    setIsLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("product_name, quantity, unit_price_zmw, total_amount_zmw, item_type, selected_color, selected_size, liters_impact, customer_phone")
        .eq("tenant_id", tenantId)
        .eq("receipt_number", receiptNumber);

      if (error) throw error;
      setReceiptItems(data || []);
    } catch (error) {
      console.error("Error fetching receipt items:", error);
      setReceiptItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleViewReceipt = async (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    await fetchReceiptItems(receipt.receipt_number);
  };

  // Filter receipts
  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesPaymentMethod =
      paymentMethodFilter === "all" || receipt.payment_method === paymentMethodFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const receiptDate = new Date(receipt.payment_date);
      const now = new Date();
      switch (dateFilter) {
        case "today":
          matchesDate = receiptDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = receiptDate >= weekAgo;
          break;
        case "month":
          matchesDate =
            receiptDate.getMonth() === now.getMonth() &&
            receiptDate.getFullYear() === now.getFullYear();
          break;
        case "year":
          matchesDate = receiptDate.getFullYear() === now.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesPaymentMethod && matchesDate;
  });

  // Calculate stats
  const totalAmount = filteredReceipts.reduce((sum, r) => sum + Number(r.amount_paid), 0);
  const cashReceipts = filteredReceipts.filter((r) => r.payment_method === "cash").length;
  const mobileReceipts = filteredReceipts.filter((r) => r.payment_method === "mobile_money").length;

  const getPaymentMethodBadge = (method: string | null) => {
    switch (method) {
      case "cash":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Cash</Badge>;
      case "mobile_money":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Mobile Money</Badge>;
      case "card":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Card</Badge>;
      case "credit_invoice":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Credit</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Calculate total liters from linked items
  const totalLitersImpact = receiptItems.reduce((sum, item) => sum + (item.liters_impact || 0), 0);
  const customerPhone = receiptItems.length > 0 ? receiptItems[0].customer_phone : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366]">Receipts Manager</h2>
          <p className="text-muted-foreground">View and manage all payment receipts</p>
        </div>
        <Receipt className="h-8 w-8 text-[#004B8D]" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Receipts</p>
              <p className="text-3xl font-bold text-[#003366]">{filteredReceipts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-green-600">K{totalAmount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Cash Receipts</p>
              <p className="text-3xl font-bold text-[#004B8D]">{cashReceipts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Mobile Money</p>
              <p className="text-3xl font-bold text-blue-600">{mobileReceipts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt #, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="credit_invoice">Credit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004B8D]"></div>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No receipts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{receipt.receipt_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{receipt.client_name}</p>
                        {receipt.client_email && (
                          <p className="text-xs text-muted-foreground">{receipt.client_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      K{Number(receipt.amount_paid).toLocaleString()}
                    </TableCell>
                    <TableCell>{getPaymentMethodBadge(receipt.payment_method)}</TableCell>
                    <TableCell>{format(new Date(receipt.payment_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReceipt(receipt)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt View Modal */}
      {selectedReceipt && (
        <SalesReceiptModal
          isOpen={!!selectedReceipt}
          onClose={() => {
            setSelectedReceipt(null);
            setReceiptItems([]);
          }}
          receiptNumber={selectedReceipt.receipt_number}
          customerName={selectedReceipt.client_name}
          customerEmail={selectedReceipt.client_email}
          customerPhone={customerPhone}
          items={receiptItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_zmw: item.unit_price_zmw,
            total_amount_zmw: item.total_amount_zmw,
            item_type: item.item_type,
            selected_color: item.selected_color,
            selected_size: item.selected_size,
          }))}
          totalAmount={Number(selectedReceipt.amount_paid)}
          paymentMethod={selectedReceipt.payment_method || "cash"}
          paymentDate={selectedReceipt.payment_date}
          litersImpact={totalLitersImpact}
        />
      )}
    </div>
  );
}
