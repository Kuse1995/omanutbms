import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Store, GraduationCap, Heart, Briefcase } from "lucide-react";

const audiences = [
  {
    icon: Store,
    title: "Retail & Trade",
    description: "Streamline inventory, sales tracking, and supplier management for shops, wholesalers, and distributors.",
  },
  {
    icon: GraduationCap,
    title: "Schools & Institutions",
    description: "Manage fees, staff payroll, procurement, and reporting with education-specific workflows.",
  },
  {
    icon: Heart,
    title: "NGOs & Foundations",
    description: "Track donations, impact metrics, community programs, and generate donor reports effortlessly.",
  },
  {
    icon: Briefcase,
    title: "Service Businesses",
    description: "Handle client invoicing, project billing, employee management, and financial reporting.",
  },
];

export function WhoItsFor() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built For Businesses Like Yours
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tailored workflows, terminology, and reports — without custom builds.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <audience.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{audience.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {audience.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
