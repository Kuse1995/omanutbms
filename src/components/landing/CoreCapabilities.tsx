import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Receipt, 
  Package, 
  Calculator, 
  Users, 
  Network, 
  HeartHandshake,
  Brain
} from "lucide-react";

const capabilities = [
  {
    icon: Receipt,
    title: "Sales & Invoicing",
    description: "Create quotes, invoices, and receipts. Track payments and manage client relationships.",
  },
  {
    icon: Package,
    title: "Inventory & Stock Control",
    description: "Real-time stock levels, low-stock alerts, and automated reorder notifications.",
  },
  {
    icon: Calculator,
    title: "Accounting & Reports",
    description: "Profit & loss, balance sheets, trial balance, and automated financial summaries.",
  },
  {
    icon: Users,
    title: "HR, Payroll & Attendance",
    description: "Employee records, salary calculations, PAYE/NAPSA deductions, and attendance tracking.",
  },
  {
    icon: Network,
    title: "Agents & Distribution",
    description: "Manage agent networks, track consignment inventory, and monitor field sales.",
  },
  {
    icon: HeartHandshake,
    title: "Impact & Community Tracking",
    description: "Measure social impact, generate certificates, and report on community programs.",
  },
  {
    icon: Brain,
    title: "AI Financial Insights",
    description: "Automated report generation, trend analysis, and actionable business recommendations.",
  },
];

export function CoreCapabilities() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete toolkit designed for modern operations.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group relative bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <capability.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{capability.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {capability.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center text-muted-foreground mt-10 italic"
        >
          Enable only what your business needs.
        </motion.p>
      </div>
    </section>
  );
}
