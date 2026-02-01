import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Plus, Search, Car, Wrench, Clock, CheckCircle, AlertTriangle,
  Phone, FileText
} from "lucide-react";
import { JobCardModal } from "./JobCardModal";

interface JobCard {
  id: string;
  job_number: string;
  customer_id: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_reg: string | null;
  vehicle_vin: string | null;
  odometer_reading: number | null;
  customer_complaint: string | null;
  diagnosis: string | null;
  status: string;
  estimated_labor_hours: number | null;
  labor_rate: number | null;
  parts_total: number | null;
  labor_total: number | null;
  quoted_total: number | null;
  intake_date: string | null;
  promised_date: string | null;
  assigned_technician_id: string | null;
  notes: string | null;
  created_at: string;
  customers?: { name: string; phone: string | null } | null;
  employees?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  received: { label: 'Received', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Car },
  diagnosing: { label: 'Diagnosing', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Search },
  quoted: { label: 'Quoted', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: FileText },
  approved: { label: 'Approved', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Wrench },
  waiting_parts: { label: 'Waiting Parts', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  collected: { label: 'Collected', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Car },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
};

export function JobCardsManager() {
  const { tenantId, businessProfile } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currencySymbol = businessProfile?.currency_symbol || 'K';
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);

  const { data: jobCards, isLoading } = useQuery({
    queryKey: ['job-cards', tenantId, statusFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('job_cards')
        .select(`
          *,
          customers:customer_id(name, phone),
          employees:assigned_technician_id(full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JobCard[];
    },
    enabled: !!tenantId,
  });

  const filteredJobCards = jobCards?.filter(card => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      card.job_number?.toLowerCase().includes(searchLower) ||
      card.vehicle_reg?.toLowerCase().includes(searchLower) ||
      card.vehicle_make?.toLowerCase().includes(searchLower) ||
      card.vehicle_model?.toLowerCase().includes(searchLower) ||
      card.customers?.name?.toLowerCase().includes(searchLower)
    );
  }) ?? [];

  const statusCounts = jobCards?.reduce((acc, card) => {
    acc[card.status] = (acc[card.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const activeJobsCount = jobCards?.filter(c => 
    !['collected', 'cancelled'].includes(c.status)
  ).length ?? 0;

  const handleEditJobCard = (card: JobCard) => {
    setSelectedJobCard(card);
    setIsModalOpen(true);
  };

  const handleNewJobCard = () => {
    setSelectedJobCard(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedJobCard(null);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    handleModalClose();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            Job Cards
          </h1>
          <p className="text-muted-foreground">Manage vehicle repair and service jobs</p>
        </div>
        <Button onClick={handleNewJobCard} className="gap-2">
          <Plus className="w-4 h-4" />
          New Job Card
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{activeJobsCount}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{statusCounts.in_progress || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waiting Parts</p>
                <p className="text-2xl font-bold">{statusCounts.waiting_parts || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready for Collection</p>
                <p className="text-2xl font-bold">{statusCounts.ready || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by job number, vehicle, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job Cards Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Intake Date</TableHead>
                <TableHead className="text-right">Quote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? 'No job cards match your search' : 'No job cards yet. Create your first job card!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobCards.map((card) => {
                  const statusConfig = STATUS_CONFIG[card.status] || STATUS_CONFIG.received;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow
                      key={card.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditJobCard(card)}
                    >
                      <TableCell className="font-medium">{card.job_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {card.vehicle_make} {card.vehicle_model}
                            </div>
                            {card.vehicle_reg && (
                              <div className="text-xs text-muted-foreground">{card.vehicle_reg}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {card.customers ? (
                          <div>
                            <div>{card.customers.name}</div>
                            {card.customers.phone && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {card.customers.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusConfig.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {card.employees?.full_name || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {card.intake_date ? format(new Date(card.intake_date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {card.quoted_total ? (
                          `${currencySymbol}${card.quoted_total.toLocaleString()}`
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Job Card Modal */}
      <JobCardModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        jobCard={selectedJobCard}
      />
    </div>
  );
}
