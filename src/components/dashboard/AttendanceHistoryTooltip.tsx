import { format } from "date-fns";
import { History } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChangeLogEntry {
  old_clock_in?: string;
  old_clock_out?: string;
  new_clock_in?: string;
  new_clock_out?: string;
  changed_by?: string;
  changed_by_name?: string;
  approved_by_name?: string;
  rejected_by_name?: string;
  timestamp?: string;
  action?: string;
  is_admin_change?: boolean;
}

interface AttendanceHistoryTooltipProps {
  changeLog: ChangeLogEntry[] | null | undefined;
}

export const AttendanceHistoryTooltip = ({ changeLog }: AttendanceHistoryTooltipProps) => {
  if (!changeLog || !Array.isArray(changeLog) || changeLog.length === 0) {
    return null;
  }

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return "-";
    try {
      return format(new Date(isoString), "HH:mm");
    } catch {
      return "-";
    }
  };

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    try {
      return format(new Date(isoString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors">
          <History className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-semibold">Adjustment History</h4>
            <Badge variant="outline" className="ml-auto text-xs">
              {changeLog.length} change{changeLog.length > 1 ? "s" : ""}
            </Badge>
          </div>
          
          <ScrollArea className="max-h-48">
            <div className="space-y-3">
              {changeLog.slice().reverse().map((entry, index) => (
                <div key={index} className="text-xs border-l-2 border-amber-300 pl-2 py-1">
                  {entry.action === "rejected" ? (
                    <div className="text-red-600">
                      <div className="font-medium">Request Rejected</div>
                      <div>By {entry.rejected_by_name}</div>
                      <div className="text-muted-foreground">{formatDate(entry.timestamp)}</div>
                    </div>
                  ) : entry.action === "approved" ? (
                    <div className="text-green-600">
                      <div className="font-medium">Request Approved</div>
                      <div>
                        {formatTime(entry.old_clock_in)} → {formatTime(entry.new_clock_in)} (In)
                      </div>
                      <div>
                        {formatTime(entry.old_clock_out)} → {formatTime(entry.new_clock_out)} (Out)
                      </div>
                      <div className="text-muted-foreground">
                        Approved by {entry.approved_by_name}
                      </div>
                      <div className="text-muted-foreground">{formatDate(entry.timestamp)}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">
                        {entry.is_admin_change ? "Admin Adjustment" : "Time Changed"}
                      </div>
                      <div>
                        {formatTime(entry.old_clock_in)} → {formatTime(entry.new_clock_in)} (In)
                      </div>
                      <div>
                        {formatTime(entry.old_clock_out)} → {formatTime(entry.new_clock_out)} (Out)
                      </div>
                      <div className="text-muted-foreground">
                        By {entry.changed_by_name || "Unknown"}
                      </div>
                      <div className="text-muted-foreground">{formatDate(entry.timestamp)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};