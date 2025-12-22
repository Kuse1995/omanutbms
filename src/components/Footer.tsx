import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import finchLogo from "@/assets/finch-logo.png";
import bcorpCertified from "@/assets/bcorp-certified.png";
import climateLabelCertified from "@/assets/climate-label-certified.png";
const footerLinks = [
  {
    title: "Quick Links",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Products", href: "/products" },
      { label: "Technology", href: "/technology" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Klapton Business Park, Lusaka, Zambia", href: "#", isText: true },
      { label: "Tel: 0211 252 546", href: "tel:0211252546", isText: true },
      { label: "info.finchinvestments@gmail.com", href: "mailto:info.finchinvestments@gmail.com", isText: true },
    ],
  },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <footer ref={footerRef} className="bg-foreground text-primary-foreground">
      <div className="container-custom py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-4 gap-6"
        >
          {/* Brand */}
          <motion.div variants={itemVariants}>
            <img
              src={finchLogo}
              alt="Finch Investments"
              className="h-16 w-auto mb-3 rounded-lg"
            />
            <p className="text-primary-foreground/70 text-sm mb-3 max-w-xs leading-relaxed">
              Exclusive distributor of LifeStraw water filtration products in Zambia.
            </p>
            <p className="text-primary-foreground/50 text-xs">
              © {new Date().getFullYear()} Finch Investments Limited
            </p>
          </motion.div>

          {/* Links */}
          {footerLinks.map((group) => (
            <motion.div key={group.title} variants={itemVariants}>
              <h4 className="font-display font-semibold text-sm mb-3">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.isText ? (
                      <span className="text-primary-foreground/70 text-sm">
                        {link.label}
                      </span>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Certifications */}
          <motion.div variants={itemVariants}>
            <h4 className="font-display font-semibold text-sm mb-3">
              LifeStraw Certifications
            </h4>
            <TooltipProvider>
              <div className="flex gap-4">
                {/* B Corp Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img 
                      src={bcorpCertified} 
                      alt="Certified B Corporation" 
                      className="h-14 w-auto object-contain cursor-help hover:scale-110 transition-transform invert"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3">
                    <p className="text-sm">
                      <strong>Certified B Corp</strong> – We meet the highest standards of social 
                      and environmental performance, balancing profit with purpose.
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Climate Label Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img 
                      src={climateLabelCertified} 
                      alt="The Climate Label Certified" 
                      className="h-14 w-auto object-contain cursor-help hover:scale-110 transition-transform"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3">
                    <p className="text-sm">
                      <strong>The Climate Label Certified</strong> – We offset all carbon emissions. 
                      Every product ships carbon-free.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <p className="text-primary-foreground/50 text-xs mt-3">
              Committed to social & environmental impact
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="border-t border-primary-foreground/10"
      >
        <div className="container-custom py-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-primary-foreground/50 text-xs">
            Exclusive Distributors of LifeStraw® by Vestergaard in Zambia
          </p>
          <p className="text-primary-foreground/40 text-[10px]">
            Developed by Omanut Technologies Limited
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
