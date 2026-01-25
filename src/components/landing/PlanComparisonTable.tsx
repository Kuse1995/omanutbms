import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingPlan } from "@/lib/billing-plans";

interface FeatureRow {
  feature: string;
  category: string;
  starter: boolean | string;
  growth: boolean | string;
  enterprise: boolean | string;
}

const featureComparison: FeatureRow[] = [
  // Core Features
  { category: "Core Features", feature: "Dashboard & Analytics", starter: true, growth: true, enterprise: true },
  { category: "Core Features", feature: "Sales & Invoicing", starter: true, growth: true, enterprise: true },
  { category: "Core Features", feature: "Payment Receipts", starter: true, growth: true, enterprise: true },
  { category: "Core Features", feature: "Customer Records", starter: true, growth: true, enterprise: true },
  { category: "Core Features", feature: "Inventory Management", starter: true, growth: true, enterprise: true },
  
  // Limits
  { category: "Usage Limits", feature: "Team Members", starter: "1 user", growth: "10 users", enterprise: "Unlimited" },
  { category: "Usage Limits", feature: "Inventory Items", starter: "100 items", growth: "1,000 items", enterprise: "Unlimited" },
  { category: "Usage Limits", feature: "WhatsApp Messages", starter: "30/month", growth: "500/month", enterprise: "Unlimited" },
  { category: "Usage Limits", feature: "AI Advisor Queries", starter: "10/day", growth: "50/day", enterprise: "Unlimited" },
  
  // Accounting
  { category: "Accounting", feature: "Cashbook & Expenses", starter: true, growth: true, enterprise: true },
  { category: "Accounting", feature: "Profit & Loss Statement", starter: false, growth: true, enterprise: true },
  { category: "Accounting", feature: "Trial Balance", starter: false, growth: true, enterprise: true },
  { category: "Accounting", feature: "General Ledger", starter: false, growth: true, enterprise: true },
  { category: "Accounting", feature: "Balance Sheet", starter: false, growth: true, enterprise: true },
  { category: "Accounting", feature: "AI Financial Reports", starter: false, growth: false, enterprise: true },
  
  // HR & Payroll
  { category: "HR & Payroll", feature: "Employee Management", starter: false, growth: true, enterprise: true },
  { category: "HR & Payroll", feature: "Payroll Processing", starter: false, growth: true, enterprise: true },
  { category: "HR & Payroll", feature: "NAPSA/PAYE/NHIMA", starter: false, growth: true, enterprise: true },
  { category: "HR & Payroll", feature: "Attendance Tracking", starter: false, growth: true, enterprise: true },
  
  // AI & Automation
  { category: "AI & Automation", feature: "AI Advisor (Basic)", starter: true, growth: true, enterprise: true },
  { category: "AI & Automation", feature: "AI Teaching Mode", starter: false, growth: true, enterprise: true },
  { category: "AI & Automation", feature: "Document Import AI", starter: false, growth: true, enterprise: true },
  { category: "AI & Automation", feature: "WhatsApp Assistant", starter: true, growth: true, enterprise: true },
  
  // Distribution
  { category: "Distribution", feature: "Agent Network", starter: false, growth: true, enterprise: true },
  { category: "Distribution", feature: "Impact Reporting", starter: false, growth: true, enterprise: true },
  { category: "Distribution", feature: "Impact Certificates", starter: false, growth: true, enterprise: true },
  
  // Operations
  { category: "Operations", feature: "Website & CMS", starter: false, growth: true, enterprise: true },
  { category: "Operations", feature: "Returns & Damages", starter: false, growth: true, enterprise: true },
  { category: "Operations", feature: "Collections Management", starter: false, growth: true, enterprise: true },
  
  // Enterprise Features
  { category: "Enterprise", feature: "Multi-Branch Management", starter: false, growth: "Add-on", enterprise: true },
  { category: "Enterprise", feature: "Warehouse & Stock Transfers", starter: false, growth: "Add-on", enterprise: true },
  { category: "Enterprise", feature: "White-Label Branding", starter: false, growth: false, enterprise: true },
  { category: "Enterprise", feature: "Custom Integrations", starter: false, growth: false, enterprise: true },
  
  // Support
  { category: "Support", feature: "Email Support", starter: true, growth: true, enterprise: true },
  { category: "Support", feature: "Priority Support", starter: false, growth: true, enterprise: true },
  { category: "Support", feature: "Dedicated Account Manager", starter: false, growth: false, enterprise: true },
  { category: "Support", feature: "SLA Guarantee", starter: false, growth: false, enterprise: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium">{value}</span>;
  }
  
  return value ? (
    <Check className="w-5 h-5 text-green-500 mx-auto" />
  ) : (
    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
  );
}

export function PlanComparisonTable() {
  const { plans, loading } = useBillingPlans();

  if (loading) {
    return (
      <div className="mt-20">
        <Skeleton className="h-8 w-64 mx-auto mb-8" />
        <Skeleton className="h-[600px] w-full max-w-5xl mx-auto rounded-xl" />
      </div>
    );
  }

  // Group features by category
  const categories = [...new Set(featureComparison.map(f => f.category))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-20"
    >
      <h3 className="text-2xl md:text-3xl font-bold text-center mb-8">
        Compare All Features
      </h3>
      
      <div className="max-w-5xl mx-auto overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-4 px-4 font-semibold text-muted-foreground w-[40%]">
                Features
              </th>
              <th className="text-center py-4 px-4 w-[20%]">
                <div className="font-bold">{plans.starter.label}</div>
                <div className="text-sm text-muted-foreground">K{plans.starter.monthlyPrice}/mo</div>
              </th>
              <th className="text-center py-4 px-4 w-[20%] bg-primary/5 rounded-t-lg">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold">{plans.growth.label}</span>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">Popular</Badge>
                </div>
                <div className="text-sm text-muted-foreground">K{plans.growth.monthlyPrice}/mo</div>
              </th>
              <th className="text-center py-4 px-4 w-[20%]">
                <div className="font-bold">{plans.enterprise.label}</div>
                <div className="text-sm text-muted-foreground">K{plans.enterprise.monthlyPrice}/mo</div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {categories.map((category, catIndex) => (
              <>
                {/* Category header */}
                <tr key={`cat-${category}`} className="bg-muted/50">
                  <td colSpan={4} className="py-3 px-4 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </td>
                </tr>
                
                {/* Feature rows */}
                {featureComparison
                  .filter(f => f.category === category)
                  .map((row, rowIndex) => (
                    <tr 
                      key={`${category}-${row.feature}`}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        <FeatureCell value={row.starter} />
                      </td>
                      <td className="py-3 px-4 text-center bg-primary/5">
                        <FeatureCell value={row.growth} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <FeatureCell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile hint */}
      <p className="text-center text-xs text-muted-foreground mt-4 md:hidden">
        ← Scroll horizontally to see all plans →
      </p>
    </motion.div>
  );
}