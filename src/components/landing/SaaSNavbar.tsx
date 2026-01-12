import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    label: "Features",
    href: "/#features",
  },
  {
    label: "Modules",
    href: "/#modules",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
];

export function SaaSNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

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
  }, [location.pathname]);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border" 
          : "bg-transparent"
      }`}
    >
      <nav className="container-custom flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">O</span>
          </div>
          <span className={`font-bold text-lg ${isScrolled ? "text-foreground" : "text-white"}`}>
            Omanut BMS
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isScrolled ? "text-foreground" : "text-white/90 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Button 
            asChild 
            variant="ghost" 
            size="sm"
            className={isScrolled ? "" : "text-white hover:bg-white/10"}
          >
            <Link to="/auth">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/bms">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`lg:hidden p-2 transition-colors ${
            isScrolled ? "text-foreground" : "text-white"
          }`}
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
            className="lg:hidden bg-background border-t border-border"
          >
            <div className="container-custom py-4 space-y-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="block text-sm font-medium text-foreground py-2 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-border flex flex-col gap-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/bms">Get Started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
