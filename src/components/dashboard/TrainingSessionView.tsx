import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertTriangle, SkipForward, ChevronDown, ChevronUp,
  Save, Trophy, FileText, Loader2, BookOpen, Lightbulb, ChevronRight,
  ChevronLeft, Maximize2, Minimize2, Eye, ListChecks
} from "lucide-react";
import { format } from "date-fns";
import type { TeachingGuide } from "./TrainingCoachingCenter";

type ItemStatus = "pending" | "taught" | "needs_practice" | "skipped";

interface ChecklistItem {
  id: string;
  feature_key: string;
  feature_label: string;
  module_group: string | null;
  status: ItemStatus;
  trainer_notes: string | null;
  improvement_notes: string | null;
}

interface Session {
  id: string;
  session_date: string;
  status: string;
  overall_notes: string | null;
  trainer_id: string;
}

interface Props {
  session: Session;
  tenantName: string;
  userName: string;
  userEmail: string;
  readOnly?: boolean;
  featureGuides?: Record<string, TeachingGuide>;
  onSessionUpdated: () => void;
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.ReactNode; colour: string; next: ItemStatus }> = {
  pending: { label: "Pending", icon: <Clock className="h-4 w-4" />, colour: "text-muted-foreground bg-muted", next: "taught" },
  taught: { label: "Taught", icon: <CheckCircle2 className="h-4 w-4" />, colour: "text-green-700 bg-green-100", next: "needs_practice" },
  needs_practice: { label: "Needs Practice", icon: <AlertTriangle className="h-4 w-4" />, colour: "text-amber-700 bg-amber-100", next: "skipped" },
  skipped: { label: "Skipped", icon: <SkipForward className="h-4 w-4" />, colour: "text-muted-foreground bg-muted/60", next: "pending" },
};

const TRAINER_TIPS = [
  "Start with a real scenario — use the user's actual business data wherever possible.",
  "Let them navigate, don't click for them — hands-on learning sticks far better.",
  "Teach one module fully before moving to the next.",
  'End every feature with: "Can you show me how to do that again?"',
  "If they make a mistake, let them discover it and correct it — that's the best teacher.",
  "Ask 'What would you do next?' to test understanding before revealing the answer.",
];

export function TrainingSessionView({ session, tenantName, userName, userEmail, readOnly = false, featureGuides = {}, onSessionUpdated }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [overallNotes, setOverallNotes] = useState(session.overall_notes || "");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [localNotes, setLocalNotes] = useState<Record<string, { trainer_notes: string; improvement_notes: string }>>({});
  const [saveTimers, setSaveTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const [tipsOpen, setTipsOpen] = useState(true);
  const [focusModeIndex, setFocusModeIndex] = useState<number | null>(null);
  const [verifyingItemId, setVerifyingItemId] = useState<string | null>(null);

  // Refs for flush-on-exit — always hold latest values without stale closures
  const overallNotesRef = useRef(overallNotes);
  const localNotesRef = useRef(localNotes);
  const saveTimersRef = useRef(saveTimers);
  const sessionIdRef = useRef(session.id);

  useEffect(() => { overallNotesRef.current = overallNotes; }, [overallNotes]);
  useEffect(() => { localNotesRef.current = localNotes; }, [localNotes]);
  useEffect(() => { saveTimersRef.current = saveTimers; }, [saveTimers]);
  useEffect(() => { sessionIdRef.current = session.id; }, [session.id]);

  // Flush all pending saves immediately (used on exit/tab hide)
  const flushPendingSaves = useCallback(async () => {
    // Cancel all debounce timers
    Object.values(saveTimersRef.current).forEach(clearTimeout);

    const notes = localNotesRef.current;
    const overall = overallNotesRef.current;
    const sid = sessionIdRef.current;

    // Flush overall notes
    await supabase.from("training_sessions").update({ overall_notes: overall }).eq("id", sid);

    // Flush all pending item notes
    const itemIds = Object.keys(notes);
    await Promise.all(
      itemIds.map((itemId) =>
        supabase.from("training_checklist_items").update({
          trainer_notes: notes[itemId].trainer_notes,
          improvement_notes: notes[itemId].improvement_notes,
        }).eq("id", itemId)
      )
    );
  }, []);

  // Save on page unload / tab visibility change
  useEffect(() => {
    if (readOnly) return;

    const handleBeforeUnload = () => { flushPendingSaves(); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSaves();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Also flush on component unmount (navigation away)
      if (!readOnly) flushPendingSaves();
    };
  }, [readOnly, flushPendingSaves]);

  useEffect(() => {
    fetchItems();
  }, [session.id]);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from("training_checklist_items")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");
    const mapped = (data || []).map((i) => ({ ...i, status: (i.status as ItemStatus) || "pending" })) as ChecklistItem[];
    setItems(mapped);
    const notes: Record<string, { trainer_notes: string; improvement_notes: string }> = {};
    mapped.forEach((i) => {
      notes[i.id] = { trainer_notes: i.trainer_notes || "", improvement_notes: i.improvement_notes || "" };
    });
    setLocalNotes(notes);
    setLoading(false);
  }

  const taughtCount = items.filter((i) => i.status === "taught").length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((taughtCount / totalCount) * 100) : 0;
  const pendingItems = items.filter((i) => i.status === "pending" || i.status === "needs_practice");

  async function applyStatus(item: ChecklistItem, next: ItemStatus) {
    setVerifyingItemId(null);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: next } : i));
    await supabase.from("training_checklist_items").update({ status: next }).eq("id", item.id);
  }

  function requestStatusChange(item: ChecklistItem) {
    if (readOnly) return;
    if (item.status === "pending" || item.status === "needs_practice") {
      // Open the verification prompt
      setVerifyingItemId(item.id);
      setExpandedItems((prev) => { const s = new Set(prev); s.add(item.id); return s; });
    } else {
      // Cycle normally for taught → needs_practice → skipped → pending
      const next = STATUS_CONFIG[item.status].next;
      applyStatus(item, next);
    }
  }

  function toggleExpand(id: string) {
    setExpandedItems((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const debounceNoteSave = useCallback((itemId: string, field: "trainer_notes" | "improvement_notes", value: string) => {
    setLocalNotes((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    setSaveTimers((prev) => {
      if (prev[`${itemId}-${field}`]) clearTimeout(prev[`${itemId}-${field}`]);
      const t = setTimeout(async () => {
        await supabase.from("training_checklist_items").update({ [field]: value }).eq("id", itemId);
      }, 500);
      return { ...prev, [`${itemId}-${field}`]: t };
    });
  }, []);

  const debounceOverallSave = useCallback((value: string) => {
    setOverallNotes(value);
    setSaveTimers((prev) => {
      if (prev["overall"]) clearTimeout(prev["overall"]);
      const t = setTimeout(async () => {
        await supabase.from("training_sessions").update({ overall_notes: value }).eq("id", session.id);
      }, 500);
      return { ...prev, overall: t };
    });
  }, [session.id]);

  async function saveSession() {
    setSaving(true);
    await supabase.from("training_sessions").update({ overall_notes: overallNotes }).eq("id", session.id);
    setSaving(false);
    toast.success("Session saved");
    onSessionUpdated();
  }

  async function completeSession() {
    setCompleting(true);
    await supabase.from("training_sessions").update({ status: "completed", overall_notes: overallNotes }).eq("id", session.id);
    setCompleting(false);
    toast.success("Session marked as complete!");
    onSessionUpdated();
  }

  function exportSummary() {
    const lines: string[] = [
      `TRAINING SESSION SUMMARY`,
      `========================`,
      `Tenant: ${tenantName}`,
      `User: ${userName} (${userEmail})`,
      `Date: ${format(new Date(session.session_date), "d MMMM yyyy")}`,
      `Status: ${session.status.replace("_", " ").toUpperCase()}`,
      `Progress: ${taughtCount}/${totalCount} features taught (${pct}%)`,
      ``,
      `OVERALL NOTES:`,
      overallNotes || "(none)",
      ``,
      `FEATURE BREAKDOWN:`,
      `------------------`,
    ];
    items.forEach((item) => {
      lines.push(`[${STATUS_CONFIG[item.status].label.toUpperCase()}] ${item.feature_label}`);
      const n = localNotes[item.id];
      if (n?.trainer_notes) lines.push(`  Trainer notes: ${n.trainer_notes}`);
      if (n?.improvement_notes) lines.push(`  Improvement: ${n.improvement_notes}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-${userName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group items by module_group
  const groups = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const g = item.module_group || "Core";
    acc[g] = [...(acc[g] || []), item];
    return acc;
  }, {});

  // Focus mode: flat list of all items
  const flatItems = items;

  // ─── FOCUS MODE ───────────────────────────────────────────────────
  if (focusModeIndex !== null && flatItems.length > 0) {
    const item = flatItems[focusModeIndex];
    const cfg = STATUS_CONFIG[item.status];
    const guide = featureGuides[item.feature_key];
    const n = localNotes[item.id] || { trainer_notes: "", improvement_notes: "" };
    const isVerifying = verifyingItemId === item.id;

    return (
      <div className="space-y-4">
        {/* Focus mode header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Focus Mode</span>
            <span className="text-xs text-muted-foreground">— {focusModeIndex + 1} of {flatItems.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFocusModeIndex(null)}>
              <Minimize2 className="h-3 w-3 mr-1" /> Exit Focus Mode
            </Button>
          </div>
        </div>

        {/* Progress strip */}
        <div className="flex gap-1 flex-wrap">
          {flatItems.map((fi, idx) => {
            const isActive = idx === focusModeIndex;
            const colour = fi.status === "taught" ? "bg-green-400" : fi.status === "needs_practice" ? "bg-amber-400" : fi.status === "skipped" ? "bg-muted" : "bg-border";
            return (
              <button
                key={fi.id}
                onClick={() => { setFocusModeIndex(idx); setVerifyingItemId(null); }}
                className={`h-2 rounded-full transition-all ${isActive ? "w-8 bg-primary" : `w-4 ${colour} hover:opacity-80`}`}
                title={fi.feature_label}
              />
            );
          })}
        </div>

        {/* Main teaching card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{item.module_group || "Core"}</p>
                <CardTitle className="text-lg leading-snug">{item.feature_label}</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`shrink-0 flex items-center gap-1.5 text-xs font-medium h-8 px-3 ${cfg.colour} border-transparent hover:opacity-80`}
                onClick={() => requestStatusChange(item)}
                disabled={readOnly}
              >
                {cfg.icon}
                {cfg.label}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-5">
            {/* Verification prompt */}
            {isVerifying && !readOnly && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-sm font-medium">Did the user complete the hands-on task?</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => applyStatus(item, "taught")}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Yes — Mark as Taught
                  </Button>
                  <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => applyStatus(item, "needs_practice")}>
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Needs More Time
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setVerifyingItemId(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {guide ? (
              <>
                {/* Demo steps */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Demo Steps
                  </p>
                  <ol className="space-y-1.5">
                    {guide.demo.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Separator />

                {/* User task */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" /> Hands-on Task for the User
                  </p>
                  <p className="text-sm text-amber-900">{guide.userTask}</p>
                </div>

                {/* Watch for */}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" /> Watch For
                  </p>
                  <p className="text-sm text-muted-foreground">{guide.watchFor}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No teaching guide available for this feature.</p>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trainer observations</label>
                <Textarea
                  placeholder="What was covered, how the user responded..."
                  value={n.trainer_notes}
                  onChange={(e) => debounceNoteSave(item.id, "trainer_notes", e.target.value)}
                  disabled={readOnly}
                  className="text-xs resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-amber-700 mb-1 block">Improvement suggestions</label>
                <Textarea
                  placeholder="Areas to focus on, topics to revisit..."
                  value={n.improvement_notes}
                  onChange={(e) => debounceNoteSave(item.id, "improvement_notes", e.target.value)}
                  disabled={readOnly}
                  className="text-xs resize-none"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={focusModeIndex === 0}
            onClick={() => { setFocusModeIndex(focusModeIndex - 1); setVerifyingItemId(null); }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {pendingItems.length} features still pending
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={focusModeIndex === flatItems.length - 1}
            onClick={() => { setFocusModeIndex(focusModeIndex + 1); setVerifyingItemId(null); }}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Action buttons */}
        {!readOnly && session.status === "in_progress" && (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={saveSession} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save & Continue
            </Button>
            <Button size="sm" onClick={completeSession} disabled={completing} className="bg-green-600 hover:bg-green-700 text-white">
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trophy className="h-4 w-4 mr-1" />}
              Complete Session
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST MODE ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Trainer Tips */}
      {!readOnly && (
        <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
          <Card className="border-primary/20 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 pt-3 px-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm text-primary">Trainer Tips</CardTitle>
                  </div>
                  {tipsOpen ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-3">
                <ul className="space-y-1.5">
                  {TRAINER_TIPS.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-primary/80">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {taughtCount} of {totalCount} features taught
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{pct}%</span>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => {
                    const firstPending = items.findIndex((i) => i.status === "pending" || i.status === "needs_practice");
                    setFocusModeIndex(firstPending >= 0 ? firstPending : 0);
                    setVerifyingItemId(null);
                  }}
                >
                  <Maximize2 className="h-3 w-3" /> Focus Mode
                </Button>
              )}
            </div>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" /> {items.filter(i => i.status === "taught").length} Taught</span>
            <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> {items.filter(i => i.status === "needs_practice").length} Needs Practice</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {items.filter(i => i.status === "pending").length} Pending</span>
            <span className="flex items-center gap-1"><SkipForward className="h-3 w-3" /> {items.filter(i => i.status === "skipped").length} Skipped</span>
          </div>
        </CardContent>
      </Card>

      {/* Overall notes */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Overall Session Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea
            placeholder="General observations, session context, follow-up actions..."
            value={overallNotes}
            onChange={(e) => debounceOverallSave(e.target.value)}
            disabled={readOnly}
            className="text-sm resize-none"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Checklist */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="h-[480px] pr-1">
          <div className="space-y-4">
            {Object.entries(groups).map(([group, groupItems]) => (
              <Card key={group}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">{group}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {groupItems.map((item) => {
                      const cfg = STATUS_CONFIG[item.status];
                      const isOpen = expandedItems.has(item.id);
                      const n = localNotes[item.id] || { trainer_notes: "", improvement_notes: "" };
                      const guide = featureGuides[item.feature_key];
                      const isVerifying = verifyingItemId === item.id;
                      const flatIdx = flatItems.findIndex((fi) => fi.id === item.id);

                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`flex items-center gap-1.5 text-xs font-medium h-7 px-2 ${cfg.colour} border-transparent hover:opacity-80`}
                              onClick={() => requestStatusChange(item)}
                              disabled={readOnly}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </Button>
                            <span className="text-sm font-medium flex-1">{item.feature_label}</span>
                            <div className="flex items-center gap-1">
                              {!readOnly && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                  title="Open in Focus Mode"
                                  onClick={() => { setFocusModeIndex(flatIdx); setVerifyingItemId(null); }}
                                >
                                  <Maximize2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleExpand(item.id)}
                              >
                                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>

                          {/* Verification prompt */}
                          {isVerifying && !readOnly && (
                            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                              <p className="text-xs font-medium">Did the user complete the hands-on task?</p>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => applyStatus(item, "taught")}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Taught
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => applyStatus(item, "needs_practice")}>
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Needs More Time
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setVerifyingItemId(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}

                          {isOpen && (
                            <div className="mt-3 space-y-3 pl-1">
                              {/* Teaching guide */}
                              {guide && (
                                <div className="space-y-3 rounded-lg bg-muted/30 border border-border p-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                                      <Eye className="h-3 w-3" /> Demo Steps
                                    </p>
                                    <ol className="space-y-1">
                                      {guide.demo.map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs">
                                          <span className="flex-shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                          <span className="text-foreground">{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                  <div className="rounded bg-amber-50 border border-amber-200 p-2.5">
                                    <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                                      <ListChecks className="h-3 w-3" /> User Task
                                    </p>
                                    <p className="text-xs text-amber-900">{guide.userTask}</p>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <Lightbulb className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground italic">{guide.watchFor}</p>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trainer observations</label>
                                <Textarea
                                  placeholder="What was covered, how the user responded..."
                                  value={n.trainer_notes}
                                  onChange={(e) => debounceNoteSave(item.id, "trainer_notes", e.target.value)}
                                  disabled={readOnly}
                                  className="text-xs resize-none"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-amber-700 mb-1 block">Improvement suggestions</label>
                                <Textarea
                                  placeholder="Areas to focus on, topics to revisit..."
                                  value={n.improvement_notes}
                                  onChange={(e) => debounceNoteSave(item.id, "improvement_notes", e.target.value)}
                                  disabled={readOnly}
                                  className="text-xs resize-none border-border focus-visible:ring-ring"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Action buttons */}
      {!readOnly && session.status === "in_progress" && (
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={saveSession} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save & Continue
          </Button>
          <Button size="sm" onClick={completeSession} disabled={completing} className="bg-green-600 hover:bg-green-700 text-white">
            {completing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trophy className="h-4 w-4 mr-1" />}
            Complete Session
          </Button>
          <Button variant="ghost" size="sm" onClick={exportSummary}>
            <FileText className="h-4 w-4 mr-1" />
            Export Summary
          </Button>
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2 pt-2">
          <Badge variant="secondary">Read-only — completed session</Badge>
          <Button variant="ghost" size="sm" onClick={exportSummary}>
            <FileText className="h-4 w-4 mr-1" />
            Export Summary
          </Button>
        </div>
      )}
    </div>
  );
}
