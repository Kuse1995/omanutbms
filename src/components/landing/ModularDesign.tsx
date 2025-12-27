import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Puzzle, Plus, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Puzzle,
    title: "Core Modules",
    description: "Essential tools for sales, inventory, and basic accounting included by default.",
  },
  {
    icon: Plus,
    title: "Optional Add-ons",
    description: "Enable HR, payroll, agents, impact tracking, and advanced features as needed.",
  },
  {
    icon: TrendingUp,
    title: "Upgrade As You Grow",
    description: "Start simple and expand capabilities as your business scales.",
  },
  {
    icon: Lock,
    title: "No Forced Bundles",
    description: "Pay only for what you use. No unnecessary features cluttering your workspace.",
  },
];

export function ModularDesign() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Modular by Design
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Build your perfect system. Enable features when you need them, 
              not because they come bundled.
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button asChild>
              <Link to="/bms">
                Explore Modules
              </Link>
            </Button>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative"
          >
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Sales", active: true },
                { name: "Inventory", active: true },
                { name: "Invoicing", active: true },
                { name: "HR", active: false },
                { name: "Payroll", active: false },
                { name: "Agents", active: false },
                { name: "Impact", active: false },
                { name: "Reports", active: true },
                { name: "AI Insights", active: false },
              ].map((module, i) => (
                <motion.div
                  key={module.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                  className={`aspect-square rounded-xl border-2 flex items-center justify-center p-4 text-center transition-all ${
                    module.active 
                      ? "bg-primary/10 border-primary text-foreground" 
                      : "bg-muted/50 border-dashed border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{module.name}</span>
                </motion.div>
              ))}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 bg-primary/20 border-2 border-primary rounded" /> Active
              </span>
              <span className="mx-4">|</span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 bg-muted/50 border-2 border-dashed border-muted-foreground/30 rounded" /> Available
              </span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
