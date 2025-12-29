import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Award, Globe, Users, Droplets, Baby, School, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

const impacts = [
  {
    icon: Heart,
    stat: "1 Purchase",
    description: "= Making a Difference",
  },
  {
    icon: Globe,
    stat: "Climate Conscious",
    description: "Sustainable Practices",
  },
  {
    icon: Award,
    stat: "Quality Assured",
    description: "Certified Products",
  },
  {
    icon: Users,
    stat: "Nationwide",
    description: "Coverage Across the Region",
  },
];

const awards = [
  "Quality Excellence Award",
  "Industry Standard Certification",
  "Customer Satisfaction Recognition",
  "Environmental Responsibility Award",
];

export function ImpactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { companyName } = useBusinessConfig();

  const giveBackSteps = [
    {
      icon: Droplets,
      title: "You Purchase",
      description: `Buy a product from ${companyName || "us"}`,
    },
    {
      icon: School,
      title: "We Give Back",
      description: "We contribute to communities in need",
    },
    {
      icon: Baby,
      title: "Lives Improved",
      description: "Communities receive support and resources",
    },
  ];

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
            Every product purchased contributes to making a positive difference 
            in communities around the world.
          </p>
        </motion.div>

        {/* Give Back Program - Expanded Section */}
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
          >
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-3xl p-8 md:p-12 border border-primary/20 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                    <Heart className="w-4 h-4" />
                    Give Back Program
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                    1 Purchase = Community Impact
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Through our partnerships with local organizations, every product you buy 
                    directly supports communities in need.
                  </p>
                </div>

                {/* Visual Counter */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                    <Droplets className="w-10 h-10 text-primary mx-auto mb-3" />
                    <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                      Quality
                    </div>
                    <p className="text-muted-foreground text-sm">Products you can trust</p>
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                    <Baby className="w-10 h-10 text-accent mx-auto mb-3" />
                    <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                      Impact
                    </div>
                    <p className="text-muted-foreground text-sm">Making a difference daily</p>
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/50">
                    <School className="w-10 h-10 text-green-600 mx-auto mb-3" />
                    <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">
                      100+
                    </div>
                    <p className="text-muted-foreground text-sm">Communities supported</p>
                  </div>
                </div>

                {/* How It Works Steps */}
                <div className="grid md:grid-cols-3 gap-4">
                  {giveBackSteps.map((step, index) => (
                    <div key={step.title} className="flex items-start gap-4 bg-card/60 backdrop-blur-sm rounded-xl p-5 border border-border/30">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">STEP {index + 1}</span>
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
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
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
