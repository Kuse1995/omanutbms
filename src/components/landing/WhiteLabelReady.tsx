import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Palette, Building2, Languages, Eye } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Multi-tenant",
    description: "Each business gets its own isolated data space and configuration.",
  },
  {
    icon: Palette,
    title: "White-label Mode",
    description: "Replace all platform branding with your own logo and colors.",
  },
  {
    icon: Languages,
    title: "Custom Terminology",
    description: "Rename modules and fields to match your industry language.",
  },
  {
    icon: Eye,
    title: "Client-owned Appearance",
    description: "Invoices, receipts, and reports reflect your brand identity.",
  },
];

export function WhiteLabelReady() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-slate-900 text-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            White-Label Ready
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Brand the system as your own — logo, colors, reports, and certificates.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
