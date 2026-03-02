import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Scale, FileSpreadsheet, TrendingUp, CreditCard, Receipt, FileText, Landmark } from "lucide-react";
import { GeneralLedger } from "./GeneralLedger";
import { TrialBalance } from "./TrialBalance";
import { BalanceSheet } from "./BalanceSheet";
import { ProfitLossStatement } from "./ProfitLossStatement";
import AccountsPayable from "./AccountsPayable";
import AccountsReceivableAging from "./AccountsReceivableAging";
import { CreditSalesReport } from "./CreditSalesReport";
import { FinancialReportGenerator } from "./FinancialReportGenerator";
import { AccountBalancesDashboard } from "./AccountBalancesDashboard";

/**
 * AdvancedAccounting - Add-on accounting module
 * Includes: General Ledger, Trial Balance, Balance Sheet, P&L, A/R, A/P, Credit Sales, AI Reports
 * Part of add-on modules (feature-flag controlled)
 * 
 * Future paid module - Professional tier
 */
export function AdvancedAccounting() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Advanced Accounting</h2>
        <p className="text-muted-foreground">Comprehensive financial reports and analysis</p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <Tabs defaultValue="ledger" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="bg-muted flex-wrap h-auto gap-1">
              <TabsTrigger value="ledger" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="h-4 w-4 mr-2" />
                General Ledger
              </TabsTrigger>
              <TabsTrigger value="trial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4 mr-2" />
                Trial Balance
              </TabsTrigger>
              <TabsTrigger value="balance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger value="pnl" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="h-4 w-4 mr-2" />
                P&L Statement
              </TabsTrigger>
              <TabsTrigger value="receivables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Receipt className="h-4 w-4 mr-2" />
                A/R Aging
              </TabsTrigger>
              <TabsTrigger value="payables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CreditCard className="h-4 w-4 mr-2" />
                A/P Tracking
              </TabsTrigger>
              <TabsTrigger value="credit-sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Credit Sales
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="ledger"><GeneralLedger /></TabsContent>
            <TabsContent value="trial"><TrialBalance /></TabsContent>
            <TabsContent value="balance"><BalanceSheet /></TabsContent>
            <TabsContent value="pnl"><ProfitLossStatement /></TabsContent>
            <TabsContent value="receivables"><AccountsReceivableAging /></TabsContent>
            <TabsContent value="payables"><AccountsPayable /></TabsContent>
            <TabsContent value="credit-sales"><CreditSalesReport /></TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* AI Financial Reports */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            AI Financial Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialReportGenerator />
        </CardContent>
      </Card>
    </div>
  );
}
