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

// Feature checklist definition — grouped by module
const CORE_FEATURES = [
  { key: "dashboard_kpis", label: "Dashboard overview & KPIs", group: "Core" },
  { key: "sales_transactions", label: "Recording sales & transactions", group: "Core" },
  { key: "quotations", label: "Quotations — create & convert to invoice", group: "Core" },
  { key: "payment_receipts", label: "Payment receipts management", group: "Core" },
  { key: "basic_accounting", label: "Basic accounting — cashbook & expenses", group: "Core" },
  { key: "customer_management", label: "Customer management", group: "Core" },
  { key: "access_control", label: "Access control — users & roles", group: "Core" },
  { key: "tenant_settings", label: "Tenant settings — branding & currency", group: "Core" },
];

const ADDON_FEATURES: Record<string, { key: string; label: string; group: string }[]> = {
  inventory_enabled: [
    { key: "inventory_products", label: "Inventory — products & stock management", group: "Inventory" },
    { key: "inventory_reorder", label: "Inventory — reorder alerts & reports", group: "Inventory" },
    { key: "returns_damages", label: "Returns & damages tracking", group: "Inventory" },
    { key: "shop_pos", label: "Shop manager & POS mode", group: "Inventory" },
  ],
  payroll_enabled: [
    { key: "hr_employees", label: "HR — employee records & profiles", group: "HR & Payroll" },
    { key: "hr_attendance", label: "HR — attendance tracking", group: "HR & Payroll" },
    { key: "hr_payslips", label: "Payroll — payslips & payroll runs", group: "HR & Payroll" },
    { key: "hr_statutory", label: "Payroll — NAPSA, PAYE & NHIMA provisions", group: "HR & Payroll" },
  ],
  agents_enabled: [
    { key: "agents_applications", label: "Agents — applications & onboarding", group: "Agents" },
    { key: "agents_inventory", label: "Agents — inventory allocation", group: "Agents" },
    { key: "agents_transactions", label: "Agents — sales tracking", group: "Agents" },
  ],
  advanced_accounting_enabled: [
    { key: "adv_general_ledger", label: "Advanced accounting — general ledger", group: "Advanced Accounting" },
    { key: "adv_trial_balance", label: "Advanced accounting — trial balance", group: "Advanced Accounting" },
    { key: "adv_profit_loss", label: "Advanced accounting — P&L statement", group: "Advanced Accounting" },
    { key: "adv_balance_sheet", label: "Advanced accounting — balance sheet", group: "Advanced Accounting" },
  ],
  impact_enabled: [
    { key: "impact_metrics", label: "Impact metrics & reporting", group: "Impact & Community" },
    { key: "impact_communities", label: "Community management & WASH forums", group: "Impact & Community" },
  ],
  website_enabled: [
    { key: "website_cms", label: "Website CMS — content management", group: "Website & CMS" },
    { key: "website_blog", label: "Website CMS — blog & announcements", group: "Website & CMS" },
  ],
  warehouse_enabled: [
    { key: "warehouse_transfers", label: "Warehouse — stock transfers", group: "Warehouse" },
    { key: "warehouse_locations", label: "Warehouse — location management", group: "Warehouse" },
  ],
  multi_branch_enabled: [
    { key: "branch_setup", label: "Multi-branch setup & configuration", group: "Branches" },
    { key: "branch_access", label: "Branch-level access control", group: "Branches" },
  ],
};

// Business-type specific features
const BUSINESS_TYPE_FEATURES: Record<string, { key: string; label: string; group: string }[]> = {
  fashion: [
    { key: "custom_orders", label: "Custom orders — design & measurements", group: "Custom Orders" },
    { key: "production_floor", label: "Production floor & job tracking", group: "Custom Orders" },
    { key: "qc_checks", label: "Quality control checks", group: "Custom Orders" },
  ],
  autoshop: [
    { key: "job_cards", label: "Job cards — create & manage", group: "Job Cards" },
    { key: "job_card_invoicing", label: "Job card to invoice conversion", group: "Job Cards" },
  ],
};

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
