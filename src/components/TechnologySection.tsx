import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Droplets, Leaf, Zap } from "lucide-react";

const technologies = [
  {
    icon: Shield,
    title: "Membrane Microfilter",
    description: "Microscopic holes (0.2 micron) that prevent bacteria, parasites, and microplastics from passing through.",
    stats: "99.999999% bacteria removal",
  },
  {
    icon: Droplets,
    title: "Ultrafiltration",
    description: "Advanced 0.02 micron pore size in community units also removes viruses from contaminated water.",
    stats: "99.999% virus removal",
  },
  {
    icon: Leaf,
    title: "Activated Carbon",
    description: "Reduces chlorine, improves taste, and removes organic chemicals including pesticides.",
    stats: "Improves taste & odor",
  },
  {
    icon: Zap,
    title: "No Power Required",
    description: "All LifeStraw products work without electricity, batteries, or chemicals – purely mechanical filtration.",
    stats: "Zero running costs",
  },
];

const certifications = [
  "US EPA Standards",
  "NSF/ANSI P231",
  "WHO 3-Star Rating",
  "Climate Neutral Certified",
];

export function TechnologySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="technology" className="section-padding bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-water opacity-50" />
      
      <div className="container-custom relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold tracking-wider uppercase text-sm">
            The Technology
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-4 mb-6">
            Why Choose LifeStraw?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Advanced microfiber membrane technology that makes contaminated water safe to drink, 
            meeting the highest international standards.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex gap-5 p-6 bg-card rounded-xl border border-border/50 shadow-soft card-hover"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <tech.icon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  {tech.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  {tech.description}
                </p>
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {tech.stats}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-hero rounded-2xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-3">
              LifeStraw Certifications
            </h3>
            <p className="text-primary-foreground/80">
              LifeStraw products are rigorously tested by independent labs and LifeStraw's own ISO certified lab
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {certifications.map((cert) => (
              <span
                key={cert}
                className="px-6 py-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full text-primary-foreground font-medium"
              >
                {cert}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
