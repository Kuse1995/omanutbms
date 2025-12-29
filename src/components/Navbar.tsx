import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

const navigationItems = [
  {
    label: "Shop",
    href: "/products",
    children: [
      { label: "Personal Filters", href: "/products#personal" },
      { label: "Community Dispensers", href: "/products#community" },
    ],
  },
  {
    label: "Our Impact",
    children: [
      { label: "Responsibility to Earth", href: "/sustainability" },
      { label: "Donate Water", href: "/donate" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    label: "Agents",
    children: [
      { label: "Become an Agent", href: "/agents" },
      { label: "Find an Agent", href: "/agents/directory" },
    ],
  },
  {
    label: "Support",
    children: [
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [expandedMobileItem, setExpandedMobileItem] = useState<string | null>(null);
  const location = useLocation();
  const { companyName, logoUrl } = useBusinessConfig();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMobileItem(null);
  }, [location.pathname]);

  const handleMouseEnter = (label: string) => {
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  const toggleMobileItem = (label: string) => {
    setExpandedMobileItem(expandedMobileItem === label ? null : label);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand/80 to-brand-dark/80 backdrop-blur-sm transition-shadow duration-300 ${
        isScrolled ? "shadow-lg" : ""
      }`}
    >
      
      <nav className="container-custom flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName || "Company Logo"}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-white font-bold text-xl">{companyName || "BMS"}</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navigationItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Parent Link */}
              {item.href ? (
                <Link
                  to={item.href}
                  className="font-nav text-sm font-medium uppercase tracking-wide text-white/90 hover:text-white px-4 py-2 transition-colors relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-white after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  className="font-nav text-sm font-medium uppercase tracking-wide text-white/90 hover:text-white px-4 py-2 transition-colors flex items-center gap-1 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-white after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* Dropdown Menu */}
              <AnimatePresence>
                {activeDropdown === item.label && item.children && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-0 pt-2"
                  >
                    <div className="bg-white border border-border rounded-sm shadow-elevated min-w-[200px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`block font-nav text-sm px-6 py-3 text-gray-700 hover:bg-muted hover:text-brand transition-colors ${
                            location.pathname === child.href ? 'text-brand bg-muted' : ''
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-white hover:text-white/80 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-border"
          >
            <div className="container-custom py-4">
              {navigationItems.map((item) => (
                <div key={item.label} className="border-b border-border last:border-b-0">
                  {/* Parent Item */}
                  <button
                    onClick={() => toggleMobileItem(item.label)}
                    className="w-full flex items-center justify-between font-nav text-sm font-medium uppercase tracking-wide text-gray-700 py-4"
                  >
                    {item.label}
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        expandedMobileItem === item.label ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Child Items */}
                  <AnimatePresence>
                    {expandedMobileItem === item.label && item.children && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 pl-4 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              to={child.href}
                              className={`block font-nav text-sm py-2 px-3 rounded-sm text-gray-600 hover:text-brand hover:bg-muted transition-colors ${
                                location.pathname === child.href ? 'text-brand bg-muted' : ''
                              }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
