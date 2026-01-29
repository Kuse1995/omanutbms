import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { 
  Users, TrendingUp, Activity, Crown, Star, UserCheck, Calendar
} from "lucide-react";
import { format, subDays } from "date-fns";

interface TopUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  total_actions: number;
  last_active_at: string | null;
  engagement_score: number;
}

interface DailyActiveUsers {
  activity_date: string;
  active_users: number;
}

interface UserActivityTabProps {
  dateRange: string;
}

/**
 * Determines engagement level badge based on score
 */
function getEngagementBadge(score: number): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (score >= 500) return { label: "Power User", variant: "default" };
  if (score >= 200) return { label: "Active", variant: "secondary" };
  if (score >= 50) return { label: "Regular", variant: "outline" };
  return { label: "Low", variant: "destructive" };
}

/**
 * Get initials from name or email
 */
function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export function UserActivityTab({ dateRange }: UserActivityTabProps) {
  // Fetch top active users using the database function
  const { data: topUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["top-active-users", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      // Call the database function
      const { data, error } = await supabase.rpc("get_top_active_users", {
        p_limit: 20,
        p_start_date: startDate,
      });

      if (error) {
        console.error("Error fetching top users:", error);
        // Fallback to direct query if function fails (e.g., permissions)
        return fetchTopUsersFallback(startDate);
      }

      return data as TopUser[];
    },
  });

  // Fetch daily active users for the chart
  const { data: dailyActiveUsers, isLoading: dauLoading } = useQuery({
    queryKey: ["daily-active-users", dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      
      const { data, error } = await supabase.rpc("get_daily_active_users", {
        p_days: days,
      });

      if (error) {
        console.error("Error fetching DAU:", error);
        return fetchDAUFallback(days);
      }

      return (data as DailyActiveUsers[]).map(d => ({
        date: format(new Date(d.activity_date), "MMM dd"),
        activeUsers: Number(d.active_users),
      }));
    },
  });

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!topUsers?.length) return null;

    const totalActions = topUsers.reduce((sum, u) => sum + (Number(u.total_actions) || 0), 0);
    const avgScore = Math.round(topUsers.reduce((sum, u) => sum + (u.engagement_score || 0), 0) / topUsers.length);
    const powerUsers = topUsers.filter(u => u.engagement_score >= 500).length;
    const activeUsers = topUsers.filter(u => u.engagement_score >= 200).length;

    return { totalActions, avgScore, powerUsers, activeUsers };
  }, [topUsers]);

  const isLoading = usersLoading || dauLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.totalActions?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.powerUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Power Users (500+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.activeUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Active Users (200+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.avgScore || 0}</p>
                <p className="text-sm text-muted-foreground">Avg Engagement Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Active Users Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Active Users
          </CardTitle>
          <CardDescription>
            Number of unique users performing actions each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyActiveUsers || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="activeUsers" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                name="Active Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Active Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Active Users
          </CardTitle>
          <CardDescription>
            Users ranked by engagement score and total actions in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!topUsers || topUsers.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No user activity data available for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  topUsers.map((user, index) => {
                    const badge = getEngagementBadge(user.engagement_score || 0);
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {index === 0 && <Crown className="h-4 w-4 text-amber-500 inline" />}
                          {index > 0 && index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.full_name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.tenant_name || "—"}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(user.total_actions || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {user.engagement_score || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.last_active_at 
                            ? format(new Date(user.last_active_at), "MMM dd, HH:mm")
                            : "Never"
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Fallback functions if RPC fails
async function fetchTopUsersFallback(startDate: string): Promise<TopUser[]> {
  // Direct query fallback - less efficient but works without the function
  const { data: auditData, error } = await supabase
    .from("audit_log")
    .select("changed_by, changed_at")
    .gte("changed_at", startDate)
    .not("changed_by", "is", null)
    .limit(5000);

  if (error || !auditData) return [];

  // Group by user
  const userMap = new Map<string, { count: number; lastActive: string }>();
  auditData.forEach(row => {
    if (!row.changed_by) return;
    const existing = userMap.get(row.changed_by);
    if (existing) {
      existing.count++;
      if (row.changed_at > existing.lastActive) {
        existing.lastActive = row.changed_at;
      }
    } else {
      userMap.set(row.changed_by, { count: 1, lastActive: row.changed_at });
    }
  });

  // Convert to array and sort
  const users = Array.from(userMap.entries())
    .map(([userId, data]) => ({
      user_id: userId,
      email: null,
      full_name: null,
      tenant_id: null,
      tenant_name: null,
      total_actions: data.count,
      last_active_at: data.lastActive,
      engagement_score: Math.round(data.count * 2), // Simplified score
    }))
    .sort((a, b) => b.total_actions - a.total_actions)
    .slice(0, 20);

  return users;
}

async function fetchDAUFallback(days: number): Promise<{ date: string; activeUsers: number }[]> {
  const startDate = subDays(new Date(), days).toISOString();
  
  const { data, error } = await supabase
    .from("audit_log")
    .select("changed_by, changed_at")
    .gte("changed_at", startDate)
    .not("changed_by", "is", null)
    .limit(10000);

  if (error || !data) return [];

  // Group by date
  const dateMap = new Map<string, Set<string>>();
  data.forEach(row => {
    if (!row.changed_by) return;
    const date = format(new Date(row.changed_at), "yyyy-MM-dd");
    if (!dateMap.has(date)) {
      dateMap.set(date, new Set());
    }
    dateMap.get(date)!.add(row.changed_by);
  });

  return Array.from(dateMap.entries())
    .map(([date, users]) => ({
      date: format(new Date(date), "MMM dd"),
      activeUsers: users.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
