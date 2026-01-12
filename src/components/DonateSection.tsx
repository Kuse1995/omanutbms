import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Users, MapPin, AlertTriangle, ArrowRight, CheckCircle, Package, Truck, Award, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { DonationModal } from "@/components/DonationModal";
import { CommunityContactModal } from "@/components/CommunityContactModal";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface WashForum {
  id: string;
  name: string;
  province: string;
  community_size: number;
  description: string;
  products_needed: string;
  priority: string;
  status: string;
}

const priorityConfig = {
  urgent: { label: "Urgent", color: "bg-destructive text-destructive-foreground" },
  high: { label: "High Priority", color: "bg-amber-500 text-white" },
  medium: { label: "Medium", color: "bg-primary text-primary-foreground" },
};

export function DonateSection() {
  const [forums, setForums] = useState<WashForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForum, setSelectedForum] = useState<WashForum | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [contactForum, setContactForum] = useState<WashForum | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { companyName } = useBusinessConfig();

  const steps = [
    { icon: Heart, title: "Choose a Community", description: "Select a community forum from the list below" },
    { icon: Package, title: "Confirm Your Donation", description: "Provide your details and message" },
    { icon: Truck, title: "We Handle Delivery", description: `${companyName || "We"} coordinates logistics` },
    { icon: Award, title: "Receive Impact Certificate", description: "Get proof of your contribution" },
  ];

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    const { data, error } = await supabase
      .from("wash_forums")
      .select("*")
      .in("status", ["seeking_donation", "partially_funded"])
      .order("priority", { ascending: true });

    if (!error && data) {
      setForums(data);
    }
    setLoading(false);
  };

  const handleDonateClick = (forum: WashForum) => {
    setSelectedForum(forum);
    setModalOpen(true);
  };

  const handleContactClick = (forum: WashForum) => {
    setContactForum(forum);
    setContactModalOpen(true);
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary">
            Call to Action
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Donate to Communities
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Connect directly with community forums across the region. 
            {companyName || "We"} bridges the gap between generous donors and communities in need.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-semibold text-center mb-8 text-foreground">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bridge Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-16 text-center"
        >
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Direct Connection. Guaranteed Impact.
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {companyName || "We"} acts as your direct link to community forums. We handle logistics, delivery, 
            and training—ensuring 100% of your product donation reaches the community in need.
          </p>
        </motion.div>

        {/* Forums Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            Communities Seeking Support
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-24 bg-muted rounded-t-lg" />
                  <CardContent className="space-y-3 pt-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : forums.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No communities currently seeking donations.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forums.map((forum, index) => (
                <motion.div
                  key={forum.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg text-foreground leading-tight">
                          {forum.name}
                        </h3>
                        <Badge className={priorityConfig[forum.priority as keyof typeof priorityConfig]?.color || "bg-muted"}>
                          {priorityConfig[forum.priority as keyof typeof priorityConfig]?.label || forum.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {forum.province} Province
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {forum.community_size.toLocaleString()} people
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground mb-4">
                        {forum.description}
                      </p>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Products Needed:</p>
                        <p className="text-sm font-medium text-foreground">{forum.products_needed}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex gap-2">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        onClick={() => handleDonateClick(forum)}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Donate
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline"
                              className="flex-1 border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                              onClick={() => handleContactClick(forum)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                              <span>Contact</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send a direct message to this community</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-16 p-8 bg-secondary/30 rounded-2xl"
        >
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Want to make a larger impact?
          </h3>
          <p className="text-muted-foreground mb-4">
            Contact us for corporate partnerships, bulk donations, or to sponsor an entire community.
          </p>
          <Button variant="outline" asChild>
            <a href="/contact">Get in Touch</a>
          </Button>
        </motion.div>
      </div>

      {/* Donation Modal */}
      <DonationModal 
        forum={selectedForum}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Community Contact Modal */}
      <CommunityContactModal
        forum={contactForum}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
    </section>
  );
}
