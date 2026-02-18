import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface TrainingSession {
  id: string;
  session_date: string;
  status: string;
  overall_notes: string | null;
  trainer_id: string;
  created_at: string;
  completion_pct?: number;
}

interface Props {
  userId: string;
  tenantId: string;
  currentSessionId?: string;
  onSelectSession: (session: TrainingSession) => void;
}

export function TrainingSessionHistory({ userId, tenantId, currentSessionId, onSelectSession }: Props) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId, tenantId]);

  async function fetchHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_sessions")
      .select("id, session_date, status, overall_notes, trainer_id, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) { setLoading(false); return; }

    // Fetch completion % for each session
    const enriched = await Promise.all(
      (data || []).map(async (s) => {
        const { data: items } = await supabase
          .from("training_checklist_items")
          .select("status")
          .eq("session_id", s.id);
        const total = items?.length ?? 0;
        const taught = items?.filter((i) => i.status === "taught").length ?? 0;
        return { ...s, completion_pct: total > 0 ? Math.round((taught / total) * 100) : 0 };
      })
    );

    setSessions(enriched);
    setLoading(false);
  }

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const statusBadge = (status: string) => (
    <Badge variant={status === "completed" ? "default" : "secondary"} className={status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
      {status === "completed" ? "Completed" : "In Progress"}
    </Badge>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Session History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No past sessions yet
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <Button
                  key={session.id}
                  variant="ghost"
                  className={`w-full justify-between h-auto py-3 px-4 rounded-none text-left ${currentSessionId === session.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                  onClick={() => onSelectSession(session)}
                >
                  <div className="flex flex-col gap-1 items-start min-w-0">
                    <div className="flex items-center gap-2 w-full">
                      {statusIcon(session.status)}
                      <span className="text-xs font-medium truncate">
                        {format(new Date(session.session_date || session.created_at), "d MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(session.status)}
                      <span className="text-xs text-muted-foreground">{session.completion_pct}% taught</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
