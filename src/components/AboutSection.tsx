import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, Users, Target, Award } from "lucide-react";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { companyName, tagline } = useBusinessConfig();

  const features = [
    {
      icon: Building2,
      title: "Locally Owned",
      description: "Proudly established and 100% locally owned, serving our community with dedication.",
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Led by experienced professionals who understand the market and client needs.",
    },
    {
      icon: Target,
      title: "Our Mission",
      description: "To strive for excellence in service and build lasting, mutually beneficial relationships.",
    },
    {
      icon: Award,
      title: "Authorized Dealer",
      description: "Partnered with leading manufacturers to bring you quality, certified products.",
    },
  ];

  return (
    <section id="about" className="section-padding bg-background">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent font-semibold tracking-wider uppercase text-sm">
              About Us
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-4 mb-6">
              Bringing Quality Products
              <span className="text-primary block">to Our Community</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              {companyName || "Our company"} is a service-focused business dedicated to delivering 
              quality products and exceptional customer service to our valued clients.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {tagline || "We are committed to excellence in everything we do, partnering with trusted suppliers to bring you the best products available."}
            </p>

            {/* Decorative line */}
            <div className="flex items-center gap-2 mt-8">
              <div className="h-1 w-12 bg-primary rounded-full" />
              <div className="h-1 w-6 bg-accent rounded-full" />
              <div className="h-1 w-3 bg-primary/50 rounded-full" />
            </div>
          </motion.div>

          {/* Right content - Feature cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-soft card-hover border border-border/50"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
