import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, ArrowRight, Check, Flag, Loader2, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  bank_type: string;
  bank_amount: number;
  bank_currency: string;
  bank_reference: string;
  bank_date: string;
  bank_sender: string;
  ai_invoice: string | null;
  ai_client: string | null;
  ai_amount: number | null;
  ai_confidence: number | null;
  ai_description: string | null;
  status: string;
}

export function AutomatedFinancials() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, canEdit } = useAuth();

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('Transaction change:', payload);
          if (payload.eventType === 'INSERT') {
            setTransactions((prev) => [payload.new as Transaction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions((prev) =>
              prev.map((tx) => (tx.id === payload.new.id ? (payload.new as Transaction) : tx))
            );
          } else if (payload.eventType === 'DELETE') {
            setTransactions((prev) => prev.filter((tx) => tx.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string) => {
    if (!canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to approve transactions",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, status: "approved" } : tx))
      );

      toast({
        title: "Approved",
        description: "Transaction match approved successfully",
      });
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast({
        title: "Error",
        description: "Failed to approve transaction",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFlag = async (id: string) => {
    if (!canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to flag transactions",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "flagged",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, status: "flagged" } : tx))
      );

      toast({
        title: "Flagged",
        description: "Transaction flagged for review",
      });
    } catch (error) {
      console.error("Error flagging transaction:", error);
      toast({
        title: "Error",
        description: "Failed to flag transaction",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-slate-400";
    if (confidence >= 95) return "text-emerald-400";
    if (confidence >= 85) return "text-amber-400";
    return "text-red-400";
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#004B8D] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Automated Financials</h2>
              <p className="text-sm text-slate-400">AI-Powered Bank Reconciliation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">AtlasMara Account:</span>
            <span className="font-mono text-sm text-white">0015997204011</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
              Live
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {transactions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No transactions found
          </div>
        ) : (
          transactions.map((tx) => (
            <motion.div
              key={tx.id}
              layout
              className={`rounded-xl border overflow-hidden ${
                tx.status === "approved"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : tx.status === "flagged"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-slate-600 bg-slate-700/30"
              }`}
            >
              <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 p-4">
                {/* Bank Transaction Side */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-500 text-slate-300">
                      Raw Transaction
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800 border border-slate-600">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400">AtlasMara Bank</span>
                    </div>
                    <p className="text-lg font-semibold text-white mb-1">
                      {tx.bank_type} - {tx.bank_currency}{" "}
                      {tx.bank_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400">Ref: {tx.bank_reference}</p>
                    <p className="text-sm text-slate-400">From: {tx.bank_sender}</p>
                    <p className="text-xs text-slate-500 mt-2">{tx.bank_date}</p>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-violet-400" />
                  </div>
                </div>

                {/* AI Match Side */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                      AI Match
                    </Badge>
                    <span className={`text-sm font-semibold ${getConfidenceColor(tx.ai_confidence)}`}>
                      {tx.ai_confidence}% Confidence
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800 border border-violet-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-violet-400" />
                      <span className="text-sm text-violet-400">Invoice Match</span>
                    </div>
                    <p className="text-lg font-semibold text-white mb-1">
                      Matched to {tx.ai_invoice}
                    </p>
                    <p className="text-sm text-slate-300">Client: {tx.ai_client}</p>
                    <p className="text-sm text-slate-400">{tx.ai_description}</p>
                    <p className="text-sm text-emerald-400 mt-2">
                      Amount: ZMW {tx.ai_amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4">
                <AnimatePresence mode="wait">
                  {tx.status === "approved" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-emerald-400"
                    >
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Match Approved</span>
                    </motion.div>
                  ) : tx.status === "flagged" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-amber-400"
                    >
                      <Flag className="w-5 h-5" />
                      <span className="font-medium">Flagged for Review</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <Button
                        onClick={() => handleApprove(tx.id)}
                        disabled={processingId === tx.id || !canEdit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {processingId === tx.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve Match
                      </Button>
                      <Button
                        onClick={() => handleFlag(tx.id)}
                        disabled={processingId === tx.id || !canEdit}
                        variant="outline"
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Flag for Review
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
