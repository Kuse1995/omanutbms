import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Droplets, Users, FileText, Loader2, Download, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ImpactMetric {
  id: string;
  metric_type: string;
  value: number;
}

interface Certificate {
  certificate_id: string;
  client_name: string;
  liters_provided: number;
  lives_impacted: number;
  generated_at: string;
}

export function ImpactReporting() {
  const [metrics, setMetrics] = useState<ImpactMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<Certificate | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("impact_metrics")
        .select("*");

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast({
        title: "Error",
        description: "Failed to load impact metrics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('impact-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'impact_metrics',
        },
        (payload) => {
          console.log('Impact metric change:', payload);
          if (payload.eventType === 'INSERT') {
            setMetrics((prev) => [...prev, payload.new as ImpactMetric]);
          } else if (payload.eventType === 'UPDATE') {
            setMetrics((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as ImpactMetric) : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMetrics((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMetricValue = (type: string) => {
    const metric = metrics.find((m) => m.metric_type === type);
    return metric?.value || 0;
  };

  const handleGenerateCertificate = async () => {
    if (!user) return;

    setIsGenerating(true);
    
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const certificateId = `FINCH-IMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
      const litersProvided = Math.floor(getMetricValue("liters_filtered") * 0.4);
      const livesImpacted = Math.floor(getMetricValue("children_served") * 0.4);

      const { data, error } = await supabase
        .from("impact_certificates")
        .insert({
          certificate_id: certificateId,
          client_name: "Ministry of Health - Zambia",
          liters_provided: litersProvided,
          lives_impacted: livesImpacted,
          generated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedCertificate({
        certificate_id: data.certificate_id,
        client_name: data.client_name,
        liters_provided: data.liters_provided,
        lives_impacted: data.lives_impacted,
        generated_at: data.generated_at,
      });
      setShowCertificate(true);

      toast({
        title: "Certificate Generated",
        description: `Certificate ${certificateId} created successfully`,
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast({
        title: "Error",
        description: "Failed to generate certificate",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const impactStats = [
    {
      type: "liters_filtered",
      icon: Droplets,
      label: "Liters Filtered",
      subtext: "Since Jan 2024",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      type: "children_served",
      icon: Users,
      label: "Children Served",
      subtext: "Lives impacted",
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-500/10",
    },
    {
      type: "schools_equipped",
      icon: School,
      label: "Schools Equipped",
      subtext: "Across Zambia",
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#004B8D] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Impact Stats */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Impact Reporting</h2>
            <p className="text-sm text-slate-400">The USP • Real-time impact metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {impactStats.map((stat, index) => (
            <motion.div
              key={stat.type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl border border-slate-600 ${stat.bgColor} p-6 overflow-hidden`}
            >
              {/* Animated background pulse */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}
                animate={{ opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                <motion.p
                  className="text-4xl font-bold text-white mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {getMetricValue(stat.type).toLocaleString()}
                </motion.p>
                <p className="text-sm text-slate-500">{stat.subtext}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Certificate Generator */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Impact Certificate Generator</h3>
            <p className="text-sm text-slate-400">
              Generate verified impact certificates for NGO clients and donors
            </p>
          </div>
          <Button
            onClick={handleGenerateCertificate}
            disabled={isGenerating}
            className="bg-[#004B8D] hover:bg-[#003d73] text-white px-6"
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center"
                >
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI Agent parsing data...
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Impact Certificate
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Impact Certificate Generated</DialogTitle>
          </DialogHeader>
          
          {generatedCertificate && (
            <div className="mt-4">
              <div className="bg-white rounded-lg p-8 text-slate-900">
                <div className="text-center border-b-2 border-[#004B8D] pb-6 mb-6">
                  <h2 className="text-2xl font-bold text-[#004B8D] mb-2">
                    Certificate of Impact
                  </h2>
                  <p className="text-sm text-slate-600">Finch Investments Limited • LifeStraw Partner</p>
                </div>

                <div className="text-center mb-6">
                  <p className="text-lg mb-4">This certifies that</p>
                  <p className="text-2xl font-bold text-[#004B8D] mb-4">
                    {generatedCertificate.client_name}
                  </p>
                  <p className="text-lg">has contributed to providing</p>
                </div>

                <div className="grid grid-cols-2 gap-6 my-8">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-[#004B8D]">
                      {generatedCertificate.liters_provided.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">Liters of Safe Water</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-[#004B8D]">
                      {generatedCertificate.lives_impacted.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">Lives Impacted</p>
                  </div>
                </div>

                <div className="text-center text-sm text-slate-600 mt-6 pt-6 border-t">
                  <p>Certificate ID: {generatedCertificate.certificate_id}</p>
                  <p>Generated: {new Date(generatedCertificate.generated_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCertificate(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </Button>
                <Button className="bg-[#004B8D] hover:bg-[#003d73] text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
