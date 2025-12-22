import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Search, Phone, Building2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Agent {
  id: string;
  business_name: string;
  province: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
}

const AgentsDirectory = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from("agent_applications")
          .select("id, business_name, province, contact_person, phone_number, business_type")
          .eq("status", "approved")
          .order("province", { ascending: true });

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const filteredAgents = agents.filter(
    (agent) =>
      agent.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const provinceCount = agents.reduce((acc, agent) => {
    acc[agent.province] = (acc[agent.province] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          {/* Hero Section */}
          <section className="relative py-16 bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-3xl mx-auto"
              >
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                  Find a <span className="text-primary">LifeStraw Agent</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Locate an authorized LifeStraw distributor near you. Our agents are trained 
                  to provide genuine products and expert guidance on water purification solutions.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Stats Cards */}
          <section className="py-8 border-b border-border">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold text-foreground">{agents.length}</div>
                    <div className="text-xs text-muted-foreground">Authorized Agents</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <MapPin className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold text-foreground">{Object.keys(provinceCount).length}</div>
                    <div className="text-xs text-muted-foreground">Provinces Covered</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Building2 className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {agents.filter(a => a.business_type === "Retail").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Retail Partners</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Phone className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold text-foreground">24/7</div>
                    <div className="text-xs text-muted-foreground">Support Available</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Search and Table */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="text-xl font-bold text-foreground">
                      Agent Directory
                    </CardTitle>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, province..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-background border-border"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {searchQuery ? "No agents found matching your search" : "No agents available yet"}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-medium">Business Name</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Contact Person</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Phone</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Province</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAgents.map((agent) => (
                            <TableRow key={agent.id} className="border-border hover:bg-muted/50">
                              <TableCell className="font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-primary" />
                                  {agent.business_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-foreground">{agent.contact_person}</TableCell>
                              <TableCell className="text-muted-foreground">
                                <a 
                                  href={`tel:${agent.phone_number}`} 
                                  className="hover:text-primary transition-colors flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {agent.phone_number}
                                </a>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-primary/30 text-primary">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {agent.province}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{agent.business_type}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Want to become a LifeStraw Agent?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Join our network of authorized distributors and help bring clean water to communities across Zambia.
              </p>
              <a 
                href="/agents" 
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Apply to Become an Agent
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default AgentsDirectory;
