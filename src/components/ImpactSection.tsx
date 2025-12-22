import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Award, Globe, Users, Droplets, Baby, School, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import bcorpCertified from "@/assets/bcorp-certified.png";
import climateLabelCertified from "@/assets/climate-label-certified.png";
const impacts = [
  {
    icon: Heart,
    stat: "1 Purchase",
    description: "= 1 Year of Safe Water for 1 Child",
  },
  {
    icon: Globe,
    stat: "Climate Neutral",
    description: "Certified Carbon Offset",
  },
  {
    icon: Award,
    stat: "Best Invention",
    description: "TIME Magazine 2005",
  },
  {
    icon: Users,
    stat: "Nationwide",
    description: "Coverage Across Zambia",
  },
];

const awards = [
  "2008 Saatchi & Saatchi Award for World Changing Ideas",
  "WHO 3 Star Rating for Comprehensive Protection",
  "Index 2005 Design Award",
  "Best Invention of 2005 by TIME Magazine",
];

const giveBackSteps = [
  {
    icon: Droplets,
    title: "You Purchase",
    description: "Buy any LifeStraw product from Finch Investments",
  },
  {
    icon: School,
    title: "We Donate",
    description: "We provide LifeStraw Community filters to schools in need",
  },
  {
    icon: Baby,
    title: "Children Drink Safe",
    description: "One child receives safe water for an entire school year",
  },
];

export function ImpactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="impact" className="section-padding bg-secondary/30">
      <div className="container-custom">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold tracking-wider uppercase text-sm">
            Our Impact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-4 mb-6">
            Your Purchase Has Impact
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every LifeStraw product purchased contributes to providing safe drinking water 
            to communities in need around the world.
          </p>
        </motion.div>

        {/* Give Back Program - Expanded Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-br from-[#00AEEF]/10 via-primary/5 to-accent/10 rounded-3xl p-8 md:p-12 border border-primary/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00AEEF]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-[#00AEEF] text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <Heart className="w-4 h-4" />
                  Give Back Program
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                  1 Purchase = 1 Year of Safe Water
                </h3>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Through our partnership with LifeStraw and local WASH forums, every product you buy 
                  directly funds safe water access for Zambian schoolchildren.
                </p>
              </div>

              {/* Visual Counter */}
              <div className="grid md:grid-cols-3 gap-6 mb-10">
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                  <Droplets className="w-10 h-10 text-[#00AEEF] mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                    4,000L
                  </div>
                  <p className="text-muted-foreground text-sm">Safe water per filter</p>
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                  <Baby className="w-10 h-10 text-accent mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                    365 days
                  </div>
                  <p className="text-muted-foreground text-sm">Of safe water for 1 child</p>
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                  <School className="w-10 h-10 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                    100+
                  </div>
                  <p className="text-muted-foreground text-sm">Schools supported</p>
                </div>
              </div>

              {/* How It Works Steps */}
              <div className="grid md:grid-cols-3 gap-4">
                {giveBackSteps.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-4 bg-card/60 backdrop-blur-sm rounded-xl p-5 border border-border/30">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00AEEF]/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-[#00AEEF]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#00AEEF]">STEP {index + 1}</span>
                        {index < giveBackSteps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground hidden md:block" />
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center mt-8">
                <Link
                  to="/donate"
                  className="inline-flex items-center gap-2 bg-[#00AEEF] hover:bg-[#0099D6] text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Support a Community
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Impact Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {impacts.map((impact, index) => (
            <motion.div
              key={impact.stat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center p-6 bg-card rounded-xl border border-border/50 shadow-soft"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <impact.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
                {impact.stat}
              </h3>
              <p className="text-muted-foreground text-sm">
                {impact.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Certifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <div className="bg-card rounded-2xl p-8 md:p-10 border border-border/50 text-center">
          <h3 className="text-2xl font-display font-bold text-foreground mb-4">
            LifeStraw Certifications
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            LifeStraw is committed to the highest standards of social and environmental performance, 
            accountability, and transparency. As their exclusive Zambian distributor, we share these values.
          </p>
            
            <TooltipProvider>
              <div className="flex flex-wrap justify-center gap-8">
                {/* B Corp Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-3 p-6 bg-secondary/50 rounded-xl hover:bg-secondary/70 transition-colors cursor-help">
                      <img 
                        src={bcorpCertified} 
                        alt="Certified B Corporation" 
                        className="h-24 w-auto object-contain"
                      />
                      <div>
                        <p className="font-semibold text-foreground">Certified B Corp</p>
                        <p className="text-xs text-muted-foreground">Business as a Force for Good</p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4">
                    <p className="text-sm">
                      <strong>Certified B Corporations</strong> meet the highest verified standards of social 
                      and environmental performance, transparency, and accountability. We balance profit with purpose.
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Climate Label Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-3 p-6 bg-secondary/50 rounded-xl hover:bg-secondary/70 transition-colors cursor-help">
                      <img 
                        src={climateLabelCertified} 
                        alt="The Climate Label Certified" 
                        className="h-24 w-auto object-contain"
                      />
                      <div>
                        <p className="font-semibold text-foreground">Climate Label Certified</p>
                        <p className="text-xs text-muted-foreground">Certified Carbon Offset</p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4">
                    <p className="text-sm">
                      <strong>The Climate Label Certified</strong> means we measure our entire carbon footprint, 
                      offset all emissions, and implement reduction strategies. Every product ships carbon-free.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* Awards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-card rounded-2xl p-8 md:p-12 border border-border/50"
        >
          <h3 className="text-2xl font-display font-bold text-foreground text-center mb-8">
            Awards & Recognition
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {awards.map((award) => (
              <div
                key={award}
                className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg"
              >
                <Award className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground font-medium">{award}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
