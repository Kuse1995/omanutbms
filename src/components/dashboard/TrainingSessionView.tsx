import { useState, useEffect, useCallback } from "react";
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
  Save, Trophy, FileText, Loader2
} from "lucide-react";
import { format } from "date-fns";

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
  onSessionUpdated: () => void;
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.ReactNode; colour: string; next: ItemStatus }> = {
  pending: { label: "Pending", icon: <Clock className="h-4 w-4" />, colour: "text-muted-foreground bg-muted", next: "taught" },
  taught: { label: "Taught", icon: <CheckCircle2 className="h-4 w-4" />, colour: "text-green-700 bg-green-100", next: "needs_practice" },
  needs_practice: { label: "Needs Practice", icon: <AlertTriangle className="h-4 w-4" />, colour: "text-amber-700 bg-amber-100", next: "skipped" },
  skipped: { label: "Skipped", icon: <SkipForward className="h-4 w-4" />, colour: "text-muted-foreground bg-muted/60", next: "pending" },
};

export function TrainingSessionView({ session, tenantName, userName, userEmail, readOnly = false, onSessionUpdated }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [overallNotes, setOverallNotes] = useState(session.overall_notes || "");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [localNotes, setLocalNotes] = useState<Record<string, { trainer_notes: string; improvement_notes: string }>>({});
  const [saveTimers, setSaveTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});

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

  async function cycleStatus(item: ChecklistItem) {
    if (readOnly) return;
    const next = STATUS_CONFIG[item.status].next;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: next } : i));
    await supabase.from("training_checklist_items").update({ status: next }).eq("id", item.id);
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

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {taughtCount} of {totalCount} features taught
            </span>
            <span className="text-sm font-bold text-primary">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-chart-2"><CheckCircle2 className="h-3 w-3" /> {items.filter(i => i.status === "taught").length} Taught</span>
            <span className="flex items-center gap-1 text-chart-4"><AlertTriangle className="h-3 w-3" /> {items.filter(i => i.status === "needs_practice").length} Needs Practice</span>
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
                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`flex items-center gap-1.5 text-xs font-medium h-7 px-2 ${cfg.colour} border-transparent hover:opacity-80`}
                              onClick={() => cycleStatus(item)}
                              disabled={readOnly}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </Button>
                            <span className="text-sm font-medium flex-1">{item.feature_label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>

                          {isOpen && (
                            <div className="mt-3 space-y-2 pl-1">
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
                                <label className="text-xs font-medium text-warning mb-1 block">Improvement suggestions</label>
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
          <Button size="sm" onClick={completeSession} disabled={completing} className="bg-success hover:bg-success/90 text-success-foreground">
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
