import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { 
  RefreshCw, Plus, Edit, Trash2, Calendar, Bell, Loader2, 
  AlertTriangle, CheckCircle, Clock 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useFeatures } from "@/hooks/useFeatures";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, differenceInDays, parseISO } from "date-fns";

interface RecurringExpense {
  id: string;
  vendor_name: string;
  description: string | null;
  amount_zmw: number;
  category: string;
  frequency: string;
  custom_interval_days: number | null;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  last_generated_date: string | null;
  advance_notice_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Interval" },
];

const CATEGORY_OPTIONS = [
  { value: "Operations/Rent", label: "Operations/Rent" },
  { value: "Marketing", label: "Marketing" },
  { value: "Other", label: "Other" },
  { value: "Cost of Goods Sold - Vestergaard", label: "Cost of Goods Sold" },
];

export function RecurringExpensesManager() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Operations/Rent");
  const [frequency, setFrequency] = useState("monthly");
  const [customDays, setCustomDays] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState("7");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currencySymbol } = useFeatures();
  const { user, isAdmin } = useAuth();

  const fetchExpenses = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("next_due_date", { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching recurring expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load recurring expenses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchExpenses();
      processRecurringExpenses();
    }
  }, [tenantId]);

  const calculateNextDueDate = (currentDue: Date, freq: string, customDays?: number): Date => {
    switch (freq) {
      case "daily":
        return addDays(currentDue, 1);
      case "weekly":
        return addDays(currentDue, 7);
      case "bi-weekly":
        return addDays(currentDue, 14);
      case "monthly":
        const nextMonth = new Date(currentDue);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case "quarterly":
        const nextQuarter = new Date(currentDue);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      case "yearly":
        const nextYear = new Date(currentDue);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear;
      case "custom":
        return addDays(currentDue, customDays || 30);
      default:
        return addDays(currentDue, 30);
    }
  };

  const processRecurringExpenses = async () => {
    if (!tenantId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch active recurring expenses that are due
      const { data: dueExpenses, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .lte("next_due_date", format(today, "yyyy-MM-dd"));

      if (error) throw error;

      for (const expense of dueExpenses || []) {
        // Check if already generated for this period
        if (expense.last_generated_date === expense.next_due_date) continue;

        // Check if end_date has passed
        if (expense.end_date && parseISO(expense.end_date) < today) {
          // Deactivate the recurring expense
          await supabase
            .from("recurring_expenses")
            .update({ is_active: false })
            .eq("id", expense.id);
          continue;
        }

        // Create accounts payable entry
        const { error: payableError } = await supabase
          .from("accounts_payable")
          .insert({
            tenant_id: tenantId,
            vendor_name: expense.vendor_name,
            description: expense.description || `Recurring: ${expense.vendor_name}`,
            amount_zmw: expense.amount_zmw,
            due_date: expense.next_due_date,
            status: "pending",
            notes: `Auto-generated from recurring expense. ${expense.notes || ""}`.trim(),
          });

        if (payableError) {
          console.error("Error creating payable:", payableError);
          continue;
        }

        // Create notification
        await supabase
          .from("admin_alerts")
          .insert({
            tenant_id: tenantId,
            alert_type: "recurring_expense",
            message: `Recurring expense due: ${expense.vendor_name} - ${currencySymbol} ${expense.amount_zmw.toLocaleString()}`,
            related_table: "recurring_expenses",
            related_id: expense.id,
          });

        // Update the recurring expense with next due date
        const nextDue = calculateNextDueDate(
          parseISO(expense.next_due_date),
          expense.frequency,
          expense.custom_interval_days || undefined
        );

        await supabase
          .from("recurring_expenses")
          .update({
            last_generated_date: expense.next_due_date,
            next_due_date: format(nextDue, "yyyy-MM-dd"),
          })
          .eq("id", expense.id);
      }

      // Create advance notifications for upcoming expenses
      const noticeDate = addDays(today, 7);
      const { data: upcomingExpenses } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .lte("next_due_date", format(noticeDate, "yyyy-MM-dd"))
        .gt("next_due_date", format(today, "yyyy-MM-dd"));

      for (const expense of upcomingExpenses || []) {
        const dueDate = parseISO(expense.next_due_date);
        const daysUntilDue = differenceInDays(dueDate, today);

        // Only notify if within advance notice period and not already notified
        if (daysUntilDue <= expense.advance_notice_days) {
          // Check if notification already exists
          const { data: existingAlert } = await supabase
            .from("admin_alerts")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("related_id", expense.id)
            .eq("alert_type", "recurring_expense_reminder")
            .gte("created_at", format(addDays(today, -expense.advance_notice_days), "yyyy-MM-dd"))
            .maybeSingle();

          if (!existingAlert) {
            await supabase
              .from("admin_alerts")
              .insert({
                tenant_id: tenantId,
                alert_type: "recurring_expense_reminder",
                message: `Upcoming recurring expense in ${daysUntilDue} days: ${expense.vendor_name} - ${currencySymbol} ${expense.amount_zmw.toLocaleString()}`,
                related_table: "recurring_expenses",
                related_id: expense.id,
              });
          }
        }
      }

      fetchExpenses();
    } catch (error) {
      console.error("Error processing recurring expenses:", error);
    }
  };

  const resetForm = () => {
    setVendorName("");
    setDescription("");
    setAmount("");
    setCategory("Operations/Rent");
    setFrequency("monthly");
    setCustomDays("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setAdvanceNoticeDays("7");
    setNotes("");
    setIsActive(true);
    setEditingExpense(null);
  };

  const openModal = (expense?: RecurringExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setVendorName(expense.vendor_name);
      setDescription(expense.description || "");
      setAmount(expense.amount_zmw.toString());
      setCategory(expense.category);
      setFrequency(expense.frequency);
      setCustomDays(expense.custom_interval_days?.toString() || "");
      setStartDate(expense.start_date);
      setEndDate(expense.end_date || "");
      setAdvanceNoticeDays(expense.advance_notice_days.toString());
      setNotes(expense.notes || "");
      setIsActive(expense.is_active);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!vendorName.trim() || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in vendor name and a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (frequency === "custom" && (!customDays || parseInt(customDays) <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please specify a valid custom interval in days",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const expenseData = {
        vendor_name: vendorName.trim(),
        description: description.trim() || null,
        amount_zmw: parseFloat(amount),
        category,
        frequency,
        custom_interval_days: frequency === "custom" ? parseInt(customDays) : null,
        start_date: startDate,
        end_date: endDate || null,
        next_due_date: editingExpense ? editingExpense.next_due_date : startDate,
        advance_notice_days: parseInt(advanceNoticeDays) || 7,
        is_active: isActive,
        notes: notes.trim() || null,
        tenant_id: tenantId,
        created_by: user?.id || null,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("recurring_expenses")
          .update(expenseData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast({ title: "Success", description: "Recurring expense updated" });
      } else {
        const { error } = await supabase
          .from("recurring_expenses")
          .insert(expenseData);

        if (error) throw error;
        toast({ title: "Success", description: "Recurring expense created" });
      }

      setIsModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      console.error("Error saving recurring expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save recurring expense",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Recurring expense deleted" });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting recurring expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete recurring expense",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleActive = async (expense: RecurringExpense) => {
    try {
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active: !expense.is_active })
        .eq("id", expense.id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Recurring expense ${expense.is_active ? "paused" : "activated"}` 
      });
      fetchExpenses();
    } catch (error) {
      console.error("Error toggling recurring expense:", error);
    }
  };

  const getStatusBadge = (expense: RecurringExpense) => {
    if (!expense.is_active) {
      return <Badge variant="secondary">Paused</Badge>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseISO(expense.next_due_date);
    const daysUntilDue = differenceInDays(dueDate, today);

    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (daysUntilDue <= expense.advance_notice_days) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Due Soon</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>;
  };

  const upcomingCount = expenses.filter(e => {
    if (!e.is_active) return false;
    const dueDate = parseISO(e.next_due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return differenceInDays(dueDate, today) <= 7;
  }).length;

  const totalMonthly = expenses
    .filter(e => e.is_active)
    .reduce((sum, e) => {
      let monthlyAmount = e.amount_zmw;
      switch (e.frequency) {
        case "daily": monthlyAmount *= 30; break;
        case "weekly": monthlyAmount *= 4.33; break;
        case "bi-weekly": monthlyAmount *= 2.17; break;
        case "quarterly": monthlyAmount /= 3; break;
        case "yearly": monthlyAmount /= 12; break;
        case "custom": monthlyAmount *= (30 / (e.custom_interval_days || 30)); break;
      }
      return sum + monthlyAmount;
    }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-[#0077B6]" />
            Recurring Expenses
          </h2>
          <p className="text-[#004B8D]/60">
            Automate your regular bills and subscriptions
          </p>
        </div>
        <Button onClick={() => openModal()} className="bg-[#004B8D] hover:bg-[#003366]">
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Active Recurring</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {expenses.filter(e => e.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-[#0077B6]/10">
                <RefreshCw className="h-5 w-5 text-[#0077B6]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Due This Week</p>
                <p className="text-2xl font-bold text-amber-600">
                  {upcomingCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#004B8D]/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#004B8D]/60">Est. Monthly Total</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {currencySymbol} {totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <Calendar className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="bg-white border-[#004B8D]/10">
        <CardHeader>
          <CardTitle className="text-[#003366]">Scheduled Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#0077B6]" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-[#004B8D]/60">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recurring expenses set up yet</p>
              <p className="text-sm">Add your first recurring expense to automate your bills</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.vendor_name}</p>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {currencySymbol} {expense.amount_zmw.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {FREQUENCY_OPTIONS.find(f => f.value === expense.frequency)?.label}
                      {expense.frequency === "custom" && ` (${expense.custom_interval_days} days)`}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(expense.next_due_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(expense)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={expense.is_active}
                          onCheckedChange={() => toggleActive(expense)}
                          aria-label="Toggle active"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openModal(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(expense.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Recurring Expense" : "Add Recurring Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="vendor">Vendor / Payee *</Label>
                <Input
                  id="vendor"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g., Zesco, MTN, Landlord"
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount ({currencySymbol}) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {frequency === "custom" && (
                <div>
                  <Label htmlFor="customDays">Interval (days)</Label>
                  <Input
                    id="customDays"
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="advanceNotice">Notify Days Before</Label>
                <Input
                  id="advanceNotice"
                  type="number"
                  value={advanceNoticeDays}
                  onChange={(e) => setAdvanceNoticeDays(e.target.value)}
                  placeholder="7"
                  min="0"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isProcessing}
              className="bg-[#004B8D] hover:bg-[#003366]"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingExpense ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring expense. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}