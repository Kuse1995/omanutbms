import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Droplets, Home, Users, Zap, Phone, MessageCircle, 
  ChevronDown, ShieldCheck, Award, BadgeCheck, Leaf, Beaker, Timer, Ruler, Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CertificationType = "who-2" | "who-3" | "nsf" | "bpa-free" | "epa" | "eco";

interface Certification {
  type: CertificationType;
  label: string;
}

interface ProductSize {
  label: string;
  capacity: string;
}

interface ColorVariant {
  name: string;
  color: string;
  image?: string;
}

interface TechnicalSpec {
  label: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  highlight?: string;
  features: string[];
  image: string;
  category: "personal" | "community";
  sizes?: ProductSize[];
  colorVariants?: ColorVariant[];
  certifications?: Certification[];
  salePrice: number;
  originalPrice: number;
  resources: {
    dataSheet: string;
    userManual: string;
  };
  technicalSpecs?: TechnicalSpec[];
}

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const certificationConfig: Record<CertificationType, { icon: typeof ShieldCheck; color: string; bgColor: string }> = {
  "who-2": { icon: Award, color: "text-blue-700", bgColor: "bg-blue-100" },
  "who-3": { icon: Award, color: "text-indigo-700", bgColor: "bg-indigo-100" },
  "nsf": { icon: BadgeCheck, color: "text-amber-700", bgColor: "bg-amber-100" },
  "bpa-free": { icon: ShieldCheck, color: "text-green-700", bgColor: "bg-green-100" },
  "epa": { icon: ShieldCheck, color: "text-teal-700", bgColor: "bg-teal-100" },
  "eco": { icon: Leaf, color: "text-emerald-700", bgColor: "bg-emerald-100" },
};

// Technical specifications for LifeStraw products
const technicalSpecs: Record<string, { icon: typeof Beaker; label: string; value: string }[]> = {
  default: [
    { icon: Beaker, label: "Pore Size", value: "0.2 microns" },
    { icon: Timer, label: "Filter Life", value: "4,000 liters" },
    { icon: Shield, label: "Removes", value: "99.99% bacteria & parasites" },
    { icon: Ruler, label: "Flow Rate", value: "Fast & consistent" },
  ],
  community: [
    { icon: Beaker, label: "Pore Size", value: "0.2 microns" },
    { icon: Timer, label: "Filter Life", value: "100,000 liters" },
    { icon: Shield, label: "Removes", value: "99.9999% bacteria, 99.99% parasites" },
    { icon: Users, label: "Serves", value: "100+ people daily" },
  ],
  personal: [
    { icon: Beaker, label: "Pore Size", value: "0.2 microns" },
    { icon: Timer, label: "Filter Life", value: "1,000 liters" },
    { icon: Shield, label: "Removes", value: "99.99% bacteria & parasites" },
    { icon: Ruler, label: "Weight", value: "Ultra-lightweight" },
  ],
};

export function ProductQuickViewModal({ product, isOpen, onClose }: ProductQuickViewModalProps) {
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0]?.capacity || null);
  const [selectedColor, setSelectedColor] = useState(product?.colorVariants?.[0]?.name || null);
  const [activeTab, setActiveTab] = useState("specs");
  const [imageKey, setImageKey] = useState(0);

  if (!product) return null;

  // Get current image based on selected color variant
  const getCurrentImage = () => {
    if (product.colorVariants && selectedColor) {
      const variant = product.colorVariants.find(v => v.name === selectedColor);
      if (variant?.image) {
        return variant.image;
      }
    }
    return product.image;
  };

  const handleColorSelect = (colorName: string) => {
    if (colorName !== selectedColor) {
      setSelectedColor(colorName);
      setImageKey(prev => prev + 1);
    }
  };

  // Get appropriate specs - use product-specific specs from DB if available, otherwise fallback to defaults
  const getProductSpecs = () => {
    // First check if product has its own technical specs from the database
    if (product.technicalSpecs && product.technicalSpecs.length > 0) {
      // Map the database specs to include icons based on label patterns
      return product.technicalSpecs.map(spec => {
        const labelLower = spec.label.toLowerCase();
        let icon = Beaker;
        if (labelLower.includes("pore") || labelLower.includes("size")) icon = Beaker;
        else if (labelLower.includes("life") || labelLower.includes("filter")) icon = Timer;
        else if (labelLower.includes("remove") || labelLower.includes("protect")) icon = Shield;
        else if (labelLower.includes("flow") || labelLower.includes("rate") || labelLower.includes("weight")) icon = Ruler;
        else if (labelLower.includes("serve") || labelLower.includes("people")) icon = Users;
        return { icon, label: spec.label, value: spec.value };
      });
    }
    
    // Fallback to hardcoded defaults based on product name
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes("community")) return technicalSpecs.community;
    if (nameLower.includes("personal")) return technicalSpecs.personal;
    return technicalSpecs.default;
  };

  const specs = getProductSpecs();

  const getCategoryIcon = () => {
    if (product.category === "personal") {
      return <Droplets className="w-4 h-4" />;
    }
    if (product.id === "family") {
      return <Home className="w-4 h-4" />;
    }
    return <Users className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Image Section */}
          <div className="relative bg-cream p-8 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
            {/* Category badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground">
              {getCategoryIcon()}
              <span className="capitalize">{product.category === "personal" ? "Personal" : "Community"}</span>
            </div>

            {/* Highlight badge */}
            {product.highlight && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-lifestraw text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                <Zap className="w-3 h-3" />
                {product.highlight}
              </div>
            )}

            {/* Color swatches at bottom of image */}
            {product.colorVariants && product.colorVariants.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-md">
                {product.colorVariants.map((variant) => (
                  <button
                    key={variant.name}
                    onClick={() => handleColorSelect(variant.name)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      selectedColor === variant.name
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: variant.color }}
                    title={variant.name}
                  />
                ))}
              </div>
            )}

            {/* Product Image with slide animation */}
            <AnimatePresence mode="wait">
              <motion.img
                key={imageKey}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                src={getCurrentImage()}
                alt={`${product.name}${selectedColor ? ` - ${selectedColor}` : ""}`}
                className="max-h-[280px] md:max-h-[350px] w-auto object-contain drop-shadow-lg"
              />
            </AnimatePresence>
          </div>

          {/* Product Details Section */}
          <div className="p-6 md:p-8 flex flex-col">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              {product.name}
            </h2>
            
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {product.description}
            </p>

            {/* Pricing Display */}
            {product.salePrice > 0 && (
              <div className="flex items-center gap-3 mb-4">
                {product.originalPrice > product.salePrice ? (
                  <>
                    <span className="text-muted-foreground line-through text-lg">
                      K{product.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      K{product.salePrice.toLocaleString()}
                    </span>
                    <span className="bg-destructive text-destructive-foreground text-sm px-2.5 py-1 rounded-full font-semibold">
                      Save K{(product.originalPrice - product.salePrice).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    K{product.salePrice.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {specs.map((spec) => {
                const IconComponent = spec.icon;
                return (
                  <div
                    key={spec.label}
                    className="bg-muted/50 rounded-lg p-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">{spec.label}</span>
                      <span className="text-sm font-semibold text-foreground">{spec.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Certifications badges */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {product.certifications.map((cert) => {
                  const config = certificationConfig[cert.type];
                  const IconComponent = config.icon;
                  return (
                    <div
                      key={cert.type}
                      className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.color} px-2.5 py-1 rounded-full text-xs font-semibold`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {cert.label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Size selector */}
            {product.sizes && (
              <div className="mb-4">
                <span className="text-sm font-medium text-foreground mb-2 block">Select Size:</span>
                <div className="flex gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size.capacity}
                      onClick={() => setSelectedSize(size.capacity)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedSize === size.capacity
                          ? "bg-lifestraw text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector */}
            {product.colorVariants && (
              <div className="mb-4">
                <span className="text-sm font-medium text-foreground mb-2 block">Select Color:</span>
                <div className="flex gap-2 items-center">
                  {product.colorVariants.map((variant) => (
                    <button
                      key={variant.name}
                      onClick={() => handleColorSelect(variant.name)}
                      title={variant.name}
                      className={`w-9 h-9 rounded-full transition-all border-2 ${
                        selectedColor === variant.name
                          ? "ring-2 ring-offset-2 ring-lifestraw border-lifestraw"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      style={{ backgroundColor: variant.color }}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">{selectedColor}</span>
                </div>
              </div>
            )}

            {/* Tabs for Features and Resources */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-2">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="specs">Features</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="specs" className="flex-1 mt-0">
                <ul className="space-y-2.5">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="resources" className="flex-1 mt-0">
                <div className="space-y-3">
                  {product.resources.dataSheet && (
                    <a
                      href={product.resources.dataSheet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group/link"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground block">Performance Data Sheet</span>
                        <span className="text-xs text-muted-foreground">Technical specifications</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                    </a>
                  )}

                  {product.resources.userManual && (
                    <a
                      href={product.resources.userManual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group/link"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground block">User Manual</span>
                        <span className="text-xs text-muted-foreground">Setup & usage guide</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                    </a>
                  )}

                  {!product.resources.dataSheet && !product.resources.userManual && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No downloadable resources available for this product.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* CTA Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full mt-5 bg-[#00AEEF] hover:bg-[#0099D6] text-white font-semibold shadow-md hover:shadow-lg transition-all py-6 text-base">
                  Inquire Now
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 z-50 bg-popover border border-border shadow-lg">
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <a href="tel:+260956905652" className="flex items-center gap-2 w-full">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span>Call Now</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <a 
                    href="https://wa.me/260956905652" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full"
                  >
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span>WhatsApp Us</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <a href="/contact" className="flex items-center gap-2 w-full">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Submit Form</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
