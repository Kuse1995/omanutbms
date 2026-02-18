import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { TrainingSessionView } from "./TrainingSessionView";
import { TrainingSessionHistory } from "./TrainingSessionHistory";
import {
  Building2, Users, GraduationCap, Search, ArrowLeft,
  Plus, Loader2, User, ChevronRight, BookOpen
} from "lucide-react";

// Teaching guide types
export interface TeachingGuide {
  demo: string[];
  userTask: string;
  watchFor: string;
}

interface FeatureDef {
  key: string;
  label: string;
  group: string;
  sort_order?: number;
  teachingGuide: TeachingGuide;
}

// Feature checklist definition — grouped by module
const CORE_FEATURES: FeatureDef[] = [
  {
    key: "dashboard_kpis", label: "Dashboard overview & KPIs", group: "Core", sort_order: 1,
    teachingGuide: {
      demo: ["Log in and land on the Dashboard", "Point out the KPI cards (Revenue, Sales, Customers)", "Show the date filter and how stats update", "Scroll down to show charts and recent activity"],
      userTask: "Ask the user to tell you what the total revenue for this month is, and find the most recent sale on the dashboard.",
      watchFor: "Ensure they understand KPIs are read-only summaries — they cannot be edited directly here.",
    },
  },
  {
    key: "customer_management", label: "Customer management", group: "Core", sort_order: 2,
    teachingGuide: {
      demo: ["Go to Customers in the sidebar", "Click 'New Customer' and fill in name, phone, email", "Save and reopen the record to show the customer profile", "Show the customer's transaction history tab"],
      userTask: "Ask the user to add a new customer using a real or test name and phone number.",
      watchFor: "Check they do not skip the phone number — it is required for WhatsApp receipts and follow-ups.",
    },
  },
  {
    key: "sales_transactions", label: "Recording sales & transactions", group: "Core", sort_order: 3,
    teachingGuide: {
      demo: ["Go to Sales Recorder in the sidebar", "Click 'New Sale', select or search a customer", "Add a product/service line and set quantity", "Choose payment method (Cash / Mobile Money / Credit) and save"],
      userTask: "Ask the user to record a cash sale to any customer for any product or service.",
      watchFor: "Ensure they understand the difference between Cash sales and Credit sales — credit creates an outstanding balance.",
    },
  },
  {
    key: "quotations", label: "Quotations — create & convert to invoice", group: "Core", sort_order: 4,
    teachingGuide: {
      demo: ["Go to Quotations in the sidebar", "Click 'New Quotation', add a customer and line items", "Save and show the PDF preview", "Use 'Convert to Invoice' to create an invoice from the quotation"],
      userTask: "Ask the user to create a quotation and then convert it to an invoice.",
      watchFor: "Make sure they know a quotation does NOT record a sale — it must be converted or a separate sale recorded.",
    },
  },
  {
    key: "payment_receipts", label: "Payment receipts management", group: "Core", sort_order: 5,
    teachingGuide: {
      demo: ["Go to Receipts in the sidebar", "Show how receipts are auto-generated from sales", "Open a receipt and show the PDF/print option", "Show how to manually create a receipt for a payment"],
      userTask: "Ask the user to find and open the receipt for the sale they just recorded.",
      watchFor: "Confirm they know how to send or print a receipt — this is a key customer-facing document.",
    },
  },
  {
    key: "basic_accounting", label: "Basic accounting — cashbook & expenses", group: "Core", sort_order: 6,
    teachingGuide: {
      demo: ["Go to Accounting → Cash Book to show all cash transactions", "Go to Expenses and click 'Record Expense'", "Add a category, amount, and description", "Show how expenses reduce profit in the reports"],
      userTask: "Ask the user to record a business expense (e.g. rent or supplies) and find it in the cashbook.",
      watchFor: "Ensure they use the correct expense category — miscategorised expenses make reports inaccurate.",
    },
  },
  {
    key: "access_control", label: "Access control — users & roles", group: "Core", sort_order: 7,
    teachingGuide: {
      demo: ["Go to Settings → Authorized Emails", "Show how to add a new user email and assign a role", "Explain the difference between Admin, Manager, Sales Rep, and Viewer", "Show how to remove access"],
      userTask: "Ask the user to walk you through how they would add a new cashier to the system.",
      watchFor: "Warn against giving Admin access to everyone — it exposes financial and settings data.",
    },
  },
  {
    key: "tenant_settings", label: "Tenant settings — branding & currency", group: "Core", sort_order: 8,
    teachingGuide: {
      demo: ["Go to Settings → Business Profile", "Show company name, logo upload, and primary colour", "Show currency and currency symbol fields", "Explain how branding appears on invoices and receipts"],
      userTask: "Ask the user to update their business tagline or slogan in settings.",
      watchFor: "Ensure the currency is set correctly before any transactions — changing it later may cause confusion.",
    },
  },
];

const ADDON_FEATURES: Record<string, FeatureDef[]> = {
  inventory_enabled: [
    {
      key: "inventory_products", label: "Inventory — products & stock management", group: "Inventory", sort_order: 10,
      teachingGuide: {
        demo: ["Go to Inventory → Products", "Click 'Add Product' and fill in name, SKU, price, and stock quantity", "Save and show the product in the list", "Show how to restock using the restock button"],
        userTask: "Ask the user to add a new product with a price and starting stock quantity of 10.",
        watchFor: "Check they set a reorder level — without it, the system cannot send low-stock alerts.",
      },
    },
    {
      key: "inventory_reorder", label: "Inventory — reorder alerts & reports", group: "Inventory", sort_order: 11,
      teachingGuide: {
        demo: ["Go to Inventory and filter by 'Low Stock'", "Show the reorder level badge on products near threshold", "Show the Stock Movements report to see inventory history"],
        userTask: "Ask the user to find which products are currently at or below their reorder level.",
        watchFor: "Ensure they understand that reorder alerts are informational — they still need to manually restock.",
      },
    },
    {
      key: "returns_damages", label: "Returns & damages tracking", group: "Inventory", sort_order: 12,
      teachingGuide: {
        demo: ["Go to Returns & Damages in the sidebar", "Record a return with reason and quantity", "Show how it updates the stock count", "Show a damage record with write-off notes"],
        userTask: "Ask the user to record a dummy return for any product.",
        watchFor: "Ensure they do not confuse Returns (stock comes back) with Damages (stock is written off).",
      },
    },
    {
      key: "shop_pos", label: "Shop manager & POS mode", group: "Inventory", sort_order: 13,
      teachingGuide: {
        demo: ["Go to Shop Manager in the sidebar", "Switch to POS mode", "Add products to the cart and process a payment", "Show the receipt generated from the POS sale"],
        userTask: "Ask the user to complete a full POS sale from product selection to receipt.",
        watchFor: "Ensure they know POS mode is designed for quick retail transactions — not for complex credit sales.",
      },
    },
  ],
  payroll_enabled: [
    {
      key: "hr_employees", label: "HR — employee records & profiles", group: "HR & Payroll", sort_order: 20,
      teachingGuide: {
        demo: ["Go to HR → Employees", "Click 'Add Employee' and complete the profile (name, NRC, position, salary)", "Show the employee detail view", "Show how to upload a profile photo"],
        userTask: "Ask the user to add a test employee with a monthly gross salary.",
        watchFor: "Ensure NRC and NAPSA number fields are filled — these are required for statutory deductions.",
      },
    },
    {
      key: "hr_attendance", label: "HR — attendance tracking", group: "HR & Payroll", sort_order: 21,
      teachingGuide: {
        demo: ["Go to HR → Attendance", "Show how to manually mark an employee as Present, Absent, or Late", "Show the attendance history view for a specific employee", "If geofence is enabled, show the location check-in feature"],
        userTask: "Ask the user to mark all employees as present for today.",
        watchFor: "Ensure they understand attendance records feed directly into payroll calculations for that period.",
      },
    },
    {
      key: "hr_payslips", label: "Payroll — payslips & payroll runs", group: "HR & Payroll", sort_order: 22,
      teachingGuide: {
        demo: ["Go to Payroll → Run Payroll", "Select the pay period and review employee earnings", "Show how the system auto-calculates gross, deductions, and net", "Preview and generate payslips"],
        userTask: "Ask the user to run a payroll and show you the payslip for one employee.",
        watchFor: "Remind them to always review the payroll summary before finalising — corrections after the fact are time-consuming.",
      },
    },
    {
      key: "hr_statutory", label: "Payroll — NAPSA, PAYE & NHIMA provisions", group: "HR & Payroll", sort_order: 23,
      teachingGuide: {
        demo: ["Go to Accounting → Statutory Tax Provisions", "Show the NAPSA, PAYE, and NHIMA columns", "Explain that these are auto-calculated from the payroll run", "Show how to export the statutory report for ZRA submission"],
        userTask: "Ask the user to find the total NAPSA contribution owed for the last payroll run.",
        watchFor: "Ensure they know statutory deductions are a legal obligation — underpaying carries penalties.",
      },
    },
  ],
  agents_enabled: [
    {
      key: "agents_applications", label: "Agents — applications & onboarding", group: "Agents", sort_order: 30,
      teachingGuide: {
        demo: ["Go to Agents in the sidebar", "Show the pending applications list", "Approve an application and explain the onboarding flow", "Show the active agents list"],
        userTask: "Ask the user to show you how they would approve a new agent application.",
        watchFor: "Ensure they verify the agent's business details before approval — approving unverified agents is a risk.",
      },
    },
    {
      key: "agents_inventory", label: "Agents — inventory allocation", group: "Agents", sort_order: 31,
      teachingGuide: {
        demo: ["Go to Agents → Inventory Allocation", "Select an agent and allocate stock items", "Show the quantity and unit price fields", "Show the agent's current allocated stock"],
        userTask: "Ask the user to allocate 5 units of any product to an existing agent.",
        watchFor: "Remind them that allocated inventory is tracked separately — it reduces from the main warehouse stock.",
      },
    },
    {
      key: "agents_transactions", label: "Agents — sales tracking", group: "Agents", sort_order: 32,
      teachingGuide: {
        demo: ["Go to Agents → Transactions", "Show how agent sales are recorded", "Show the agent performance summary", "Explain commission tracking if applicable"],
        userTask: "Ask the user to find the total sales recorded by a specific agent this month.",
        watchFor: "Ensure they understand that agent transactions are separate from direct sales in main reports.",
      },
    },
  ],
  advanced_accounting_enabled: [
    {
      key: "adv_general_ledger", label: "Advanced accounting — general ledger", group: "Advanced Accounting", sort_order: 40,
      teachingGuide: {
        demo: ["Go to Accounting → General Ledger", "Show the chart of accounts and how entries are organised", "Filter by account type or date range", "Show a sample journal entry"],
        userTask: "Ask the user to find all entries under the 'Revenue' account for this month.",
        watchFor: "Ensure they understand the general ledger is a read view — entries come from transactions, not manual edits.",
      },
    },
    {
      key: "adv_trial_balance", label: "Advanced accounting — trial balance", group: "Advanced Accounting", sort_order: 41,
      teachingGuide: {
        demo: ["Go to Accounting → Trial Balance", "Show debits and credits columns and explain they must balance", "Filter by reporting period", "Show how to export to PDF or CSV"],
        userTask: "Ask the user to verify that the trial balance for the current period is balanced.",
        watchFor: "An unbalanced trial balance means there is an inconsistency in the records — flag this immediately.",
      },
    },
    {
      key: "adv_profit_loss", label: "Advanced accounting — P&L statement", group: "Advanced Accounting", sort_order: 42,
      teachingGuide: {
        demo: ["Go to Accounting → Profit & Loss", "Walk through Revenue, Cost of Goods, Gross Profit, Operating Expenses, and Net Profit sections", "Show the date range selector", "Export to PDF"],
        userTask: "Ask the user to tell you the net profit for the last 30 days.",
        watchFor: "Ensure they understand Net Profit = Gross Profit − Operating Expenses. Negative net profit means the business is losing money.",
      },
    },
    {
      key: "adv_balance_sheet", label: "Advanced accounting — balance sheet", group: "Advanced Accounting", sort_order: 43,
      teachingGuide: {
        demo: ["Go to Accounting → Balance Sheet", "Show Assets, Liabilities, and Equity sections", "Explain that Assets must equal Liabilities + Equity", "Export to PDF for reporting"],
        userTask: "Ask the user to find the total assets value on the current balance sheet.",
        watchFor: "If the balance sheet does not balance, it indicates an accounting error that must be investigated.",
      },
    },
  ],
  impact_enabled: [
    {
      key: "impact_metrics", label: "Impact metrics & reporting", group: "Impact & Community", sort_order: 50,
      teachingGuide: {
        demo: ["Go to Impact in the sidebar", "Show the impact metrics dashboard (people served, litres distributed, etc.)", "Show how to update impact numbers", "Show the impact report export"],
        userTask: "Ask the user to update one impact metric with a new figure.",
        watchFor: "Ensure figures entered are accurate — impact metrics may be used in donor and partner reports.",
      },
    },
    {
      key: "impact_communities", label: "Community management & WASH forums", group: "Impact & Community", sort_order: 51,
      teachingGuide: {
        demo: ["Go to Impact → Communities", "Show the WASH forums list and how to add a new community", "Show the community contact and location fields", "Show how to view submitted community messages"],
        userTask: "Ask the user to add a new community with a name and location.",
        watchFor: "Ensure they fill in GPS coordinates if available — this enables map-based reporting.",
      },
    },
  ],
  website_enabled: [
    {
      key: "website_cms", label: "Website CMS — content management", group: "Website & CMS", sort_order: 60,
      teachingGuide: {
        demo: ["Go to Website Manager in the sidebar", "Show the page content sections (hero, about, products)", "Edit the hero text and save", "Show the live preview link"],
        userTask: "Ask the user to update the website's hero headline or tagline.",
        watchFor: "Ensure they preview before sharing — edits are live immediately after saving.",
      },
    },
    {
      key: "website_blog", label: "Website CMS — blog & announcements", group: "Website & CMS", sort_order: 61,
      teachingGuide: {
        demo: ["Go to Website → Blog Manager", "Click 'New Post' and fill in title, content, and cover image", "Set the status to Published", "Show the post on the live website"],
        userTask: "Ask the user to draft a short blog post and publish it.",
        watchFor: "Remind them that published posts are immediately visible to the public — proofread before publishing.",
      },
    },
  ],
  warehouse_enabled: [
    {
      key: "warehouse_transfers", label: "Warehouse — stock transfers", group: "Warehouse", sort_order: 70,
      teachingGuide: {
        demo: ["Go to Warehouse → Stock Transfers", "Click 'New Transfer', select source and destination locations", "Add items and quantities", "Complete the transfer and show how stock levels update"],
        userTask: "Ask the user to transfer 5 units of any product between two warehouse locations.",
        watchFor: "Ensure the source location has sufficient stock — transferring more than available will be blocked.",
      },
    },
    {
      key: "warehouse_locations", label: "Warehouse — location management", group: "Warehouse", sort_order: 71,
      teachingGuide: {
        demo: ["Go to Warehouse → Locations", "Show how to add a new location (e.g. Shelf A, Store Room)", "Show current stock per location", "Show how to view the full warehouse layout"],
        userTask: "Ask the user to create a new warehouse location called 'Storage Room B'.",
        watchFor: "Ensure locations have clear, consistent naming — vague names cause confusion during transfers.",
      },
    },
  ],
  multi_branch_enabled: [
    {
      key: "branch_setup", label: "Multi-branch setup & configuration", group: "Branches", sort_order: 80,
      teachingGuide: {
        demo: ["Go to Settings → Branches", "Show the list of existing branches", "Click 'Add Branch' and fill in name, address, and type", "Show how to assign a branch manager"],
        userTask: "Ask the user to walk you through how they would set up a new branch.",
        watchFor: "Ensure the HQ branch is always marked correctly — some reports are filtered by HQ vs sub-branch.",
      },
    },
    {
      key: "branch_access", label: "Branch-level access control", group: "Branches", sort_order: 81,
      teachingGuide: {
        demo: ["Go to Settings → Authorized Emails", "Show how to assign a user to a specific branch", "Explain that branch-scoped users only see their branch data", "Show admin-level users who see all branches"],
        userTask: "Ask the user to explain the difference between a branch-scoped user and an admin-level user.",
        watchFor: "Misconfigured branch access is a common data privacy issue — verify each user is scoped correctly.",
      },
    },
  ],
};

// Business-type specific features
const BUSINESS_TYPE_FEATURES: Record<string, FeatureDef[]> = {
  fashion: [
    {
      key: "custom_orders", label: "Custom orders — design & measurements", group: "Custom Orders", sort_order: 90,
      teachingGuide: {
        demo: ["Go to Custom Orders in the sidebar", "Click 'New Order' and fill in customer, garment type, fabric, and measurements", "Show the measurement mannequin input tool", "Save and show the order in the production queue"],
        userTask: "Ask the user to create a custom order for a test customer with at least 3 measurements entered.",
        watchFor: "Ensure all measurements are recorded — missing sizes cause costly remake errors.",
      },
    },
    {
      key: "production_floor", label: "Production floor & job tracking", group: "Custom Orders", sort_order: 91,
      teachingGuide: {
        demo: ["Go to Production Floor in the sidebar", "Show all orders in the Kanban/list view by production stage", "Update an order status from 'Cutting' to 'Sewing'", "Show how to assign an order to a tailor"],
        userTask: "Ask the user to move one order to the next production stage and assign it to a tailor.",
        watchFor: "Ensure the user understands production stages are sequential — skipping stages hides bottlenecks.",
      },
    },
    {
      key: "qc_checks", label: "Quality control checks", group: "Custom Orders", sort_order: 92,
      teachingGuide: {
        demo: ["Open a completed order and find the QC Checks section", "Walk through the QC checklist (stitching, measurements, finishing)", "Mark items as passed or failed with notes", "Show how a failed QC sends the order back to production"],
        userTask: "Ask the user to complete a QC check on any order and mark at least one item.",
        watchFor: "Do not allow orders to be collected without a completed QC — this is a key quality gate.",
      },
    },
  ],
  autoshop: [
    {
      key: "job_cards", label: "Job cards — create & manage", group: "Job Cards", sort_order: 90,
      teachingGuide: {
        demo: ["Go to Job Cards in the sidebar", "Click 'New Job Card' and fill in vehicle details, customer, and job description", "Add parts and labour lines", "Save and show the job card status board"],
        userTask: "Ask the user to create a job card for a test vehicle with at least one part and one labour item.",
        watchFor: "Ensure vehicle registration and customer details are always captured — these are required for job tracking.",
      },
    },
    {
      key: "job_card_invoicing", label: "Job card to invoice conversion", group: "Job Cards", sort_order: 91,
      teachingGuide: {
        demo: ["Open a completed job card", "Click 'Convert to Invoice'", "Show the invoice pre-filled with all job lines", "Send or print the invoice for the customer"],
        userTask: "Ask the user to convert a completed job card into an invoice.",
        watchFor: "Ensure they review the invoice before sending — parts pricing may need adjustment from the job card estimate.",
      },
    },
  ],
};

// Build a flat lookup map for teaching guides by feature key
export function buildFeatureGuideMap(profile: BusinessProfile): Record<string, TeachingGuide> {
  const all: FeatureDef[] = [...CORE_FEATURES];
  Object.entries(ADDON_FEATURES).forEach(([flag, items]) => {
    if (profile[flag as keyof BusinessProfile]) all.push(...items);
  });
  if (profile.business_type && BUSINESS_TYPE_FEATURES[profile.business_type]) {
    all.push(...BUSINESS_TYPE_FEATURES[profile.business_type]);
  }
  const map: Record<string, TeachingGuide> = {};
  all.forEach((f) => { map[f.key] = f.teachingGuide; });
  return map;
}

interface Tenant {
  id: string;
  name: string;
  billing_plan?: string;
  user_count?: number;
}

interface TenantUser {
  user_id: string;
  role: string;
  profiles: { full_name: string | null } | null;
  email?: string;
}

interface BusinessProfile {
  inventory_enabled: boolean | null;
  payroll_enabled: boolean | null;
  agents_enabled: boolean | null;
  advanced_accounting_enabled: boolean | null;
  impact_enabled: boolean | null;
  website_enabled: boolean | null;
  warehouse_enabled: boolean | null;
  multi_branch_enabled: boolean | null;
  business_type: string | null;
  billing_plan: string;
}

interface TrainingSession {
  id: string;
  session_date: string;
  status: string;
  overall_notes: string | null;
  trainer_id: string;
  created_at: string;
}

type Step = "tenant" | "user" | "session";

export function TrainingCoachingCenter() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("tenant");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [historySession, setHistorySession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => { fetchTenants(); }, []);

  async function fetchTenants() {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, name")
      .order("name");
    
    if (data) {
      // Fetch user counts and billing plan
      const enriched = await Promise.all(
        data.map(async (t) => {
          const [{ count }, { data: bp }] = await Promise.all([
            supabase.from("tenant_users").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("business_profiles").select("billing_plan").eq("tenant_id", t.id).single(),
          ]);
          return { ...t, user_count: count ?? 0, billing_plan: bp?.billing_plan ?? "starter" };
        })
      );
      setTenants(enriched);
    }
    setLoading(false);
  }

  async function selectTenant(tenant: Tenant) {
    setSelectedTenant(tenant);
    setStep("user");
    setLoading(true);
    
    const { data: tuData } = await supabase
      .from("tenant_users")
      .select("user_id, role")
      .eq("tenant_id", tenant.id);

    // Fetch profiles separately
    const profileMap: Record<string, { full_name: string | null }> = {};
    if (tuData && tuData.length > 0) {
      const ids = tuData.map((u) => u.user_id);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      (profileData || []).forEach((p) => { profileMap[p.user_id] = { full_name: p.full_name }; });
    }

    const enrichedUsers: TenantUser[] = (tuData || []).map((u) => ({
      ...u,
      profiles: profileMap[u.user_id] ?? { full_name: null },
    }));

    setUsers(enrichedUsers);
    setLoading(false);

    // Fetch business profile
    const { data: bp } = await supabase
      .from("business_profiles")
      .select("inventory_enabled, payroll_enabled, agents_enabled, advanced_accounting_enabled, impact_enabled, website_enabled, warehouse_enabled, multi_branch_enabled, business_type, billing_plan")
      .eq("tenant_id", tenant.id)
      .single();
    setBusinessProfile(bp);
  }

  function buildFeatureChecklist(profile: BusinessProfile) {
    const features = [...CORE_FEATURES];
    Object.entries(ADDON_FEATURES).forEach(([flag, items]) => {
      if (profile[flag as keyof BusinessProfile]) {
        features.push(...items);
      }
    });
    if (profile.business_type && BUSINESS_TYPE_FEATURES[profile.business_type]) {
      features.push(...BUSINESS_TYPE_FEATURES[profile.business_type]);
    }
    return features;
  }

  async function startSession(tenantUser: TenantUser) {
    if (!selectedTenant || !user) return;
    setSelectedUser(tenantUser);
    setStartingSession(true);

    // Look for existing in-progress session
    const { data: existing } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("tenant_id", selectedTenant.id)
      .eq("user_id", tenantUser.user_id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1);

    let session: TrainingSession;

    if (existing && existing.length > 0) {
      session = existing[0] as TrainingSession;
      toast.info("Resumed existing session");
    } else {
      // Create new session
      const { data: newSession, error } = await supabase
        .from("training_sessions")
        .insert({
          trainer_id: user.id,
          tenant_id: selectedTenant.id,
          user_id: tenantUser.user_id,
          status: "in_progress",
        })
        .select()
        .single();

      if (error || !newSession) {
        toast.error("Failed to create session");
        setStartingSession(false);
        return;
      }

      session = newSession as TrainingSession;

      // Seed checklist items
      if (businessProfile) {
        const features = buildFeatureChecklist(businessProfile);
        const checklistItems = features.map((f) => ({
          session_id: session.id,
          feature_key: f.key,
          feature_label: f.label,
          module_group: f.group,
          status: "pending",
        }));
        await supabase.from("training_checklist_items").insert(checklistItems);
      }
      toast.success("Training session started");
    }

    setActiveSession(session);
    setHistorySession(null);
    setStep("session");
    setStartingSession(false);
  }

  function handleHistorySelect(session: TrainingSession) {
    setHistorySession(session);
    setActiveSession(null);
  }

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const planBadge = (plan: string) => {
    const colours: Record<string, string> = {
      starter: "bg-blue-100 text-blue-800",
      growth: "bg-purple-100 text-purple-800",
      enterprise: "bg-amber-100 text-amber-800",
    };
    return <Badge className={`text-xs ${colours[plan] || "bg-muted text-muted-foreground"} hover:${colours[plan] || "bg-muted"}`}>{plan}</Badge>;
  };

  const displaySession = historySession || activeSession;
  const isReadOnly = !!historySession;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Training & Coaching Centre</h2>
          <p className="text-sm text-muted-foreground">Structured training sessions for tenant users</p>
        </div>
      </div>

      {/* Breadcrumb */}
      {step !== "tenant" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setStep("tenant"); setSelectedTenant(null); setSelectedUser(null); setActiveSession(null); setHistorySession(null); }}>
            <ArrowLeft className="h-3 w-3 mr-1" /> Tenants
          </Button>
          {selectedTenant && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setStep("user"); setSelectedUser(null); setActiveSession(null); setHistorySession(null); }}>
                {selectedTenant.name}
              </Button>
            </>
          )}
          {step === "session" && selectedUser && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{selectedUser.profiles?.full_name || "User"}</span>
            </>
          )}
        </div>
      )}

      {/* STEP 1: Select Tenant */}
      {step === "tenant" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTenants.map((tenant) => (
                <Card
                  key={tenant.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                  onClick={() => selectTenant(tenant)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tenant.user_count} users</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {planBadge(tenant.billing_plan || "starter")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredTenants.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No tenants found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select User */}
      {step === "user" && selectedTenant && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedTenant.name}</span>
            {selectedTenant.billing_plan && planBadge(selectedTenant.billing_plan)}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.map((u) => {
                const name = u.profiles?.full_name || "Unknown User";
                const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const roleColours: Record<string, string> = {
                  admin: "bg-red-100 text-red-800",
                  manager: "bg-blue-100 text-blue-800",
                  sales_rep: "bg-green-100 text-green-800",
                  cashier: "bg-teal-100 text-teal-800",
                  accountant: "bg-purple-100 text-purple-800",
                  hr_manager: "bg-pink-100 text-pink-800",
                  viewer: "bg-muted text-muted-foreground",
                };
                return (
                  <Card
                    key={u.user_id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                    onClick={() => startSession(u)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight truncate">{name}</p>
                          <Badge className={`text-xs mt-1 ${roleColours[u.role] || "bg-muted text-muted-foreground"} hover:${roleColours[u.role]}`}>
                            {u.role.replace("_", " ")}
                          </Badge>
                        </div>
                        {startingSession ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {users.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No users found in this tenant
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Training Session */}
      {step === "session" && selectedTenant && selectedUser && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
          {/* Left: session info + checklist */}
          <div className="space-y-4">
            {/* Session info bar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedTenant.name}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.profiles?.full_name || "User"}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  {displaySession && (
                    <Badge variant={displaySession.status === "completed" ? "default" : "secondary"}
                      className={displaySession.status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                      {displaySession.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  )}
                  {isReadOnly && (
                    <Badge variant="outline" className="text-muted-foreground">Viewing past session</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active or history session view */}
            {displaySession ? (
              <TrainingSessionView
                session={displaySession as any}
                tenantName={selectedTenant.name}
                userName={selectedUser.profiles?.full_name || "User"}
                userEmail={""}
                readOnly={isReadOnly}
                featureGuides={businessProfile ? buildFeatureGuideMap(businessProfile) : {}}
                onSessionUpdated={() => {
                  // refresh — go back and refetch if needed
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p>Start a new session or select one from history</p>
                  <Button
                    className="mt-4"
                    onClick={() => startSession(selectedUser)}
                    disabled={startingSession}
                  >
                    {startingSession ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Start Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: session history */}
          <TrainingSessionHistory
            userId={selectedUser.user_id}
            tenantId={selectedTenant.id}
            currentSessionId={displaySession?.id}
            onSelectSession={handleHistorySelect as any}
          />
        </div>
      )}
    </div>
  );
}
