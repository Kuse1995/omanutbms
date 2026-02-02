import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Droplets, Home, Users, Zap, Phone, MessageCircle, ChevronDown, Search, ShieldCheck, Award, BadgeCheck, Leaf, Loader2, Eye } from "lucide-react";
import { ProductQuickViewModal } from "@/components/ProductQuickViewModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

// Generic placeholder for products without database images
const PLACEHOLDER_IMAGE = "/placeholder.svg";

interface ProductSize {
  label: string;
  capacity: string;
}

interface ColorVariant {
  name: string;
  color: string;
  image?: string;
}

type CertificationType = "who-2" | "who-3" | "nsf" | "bpa-free" | "epa" | "eco";

interface Certification {
  type: CertificationType;
  label: string;
}

const certificationConfig: Record<CertificationType, { icon: typeof ShieldCheck; color: string; bgColor: string }> = {
  "who-2": { icon: Award, color: "text-blue-700", bgColor: "bg-blue-100" },
  "who-3": { icon: Award, color: "text-indigo-700", bgColor: "bg-indigo-100" },
  "nsf": { icon: BadgeCheck, color: "text-amber-700", bgColor: "bg-amber-100" },
  "bpa-free": { icon: ShieldCheck, color: "text-green-700", bgColor: "bg-green-100" },
  "epa": { icon: ShieldCheck, color: "text-teal-700", bgColor: "bg-teal-100" },
  "eco": { icon: Leaf, color: "text-emerald-700", bgColor: "bg-emerald-100" },
};

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
  bpaFree?: boolean;
  certifications?: Certification[];
  salePrice: number;
  originalPrice: number;
  resources: {
    dataSheet: string;
    userManual: string;
  };
  technicalSpecs?: TechnicalSpec[];
}

// Helper to get fallback image based on product name/sku
function getFallbackImage(): string {
  return PLACEHOLDER_IMAGE;
}

// Hook to fetch products from database
function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Fetch inventory items
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("*")
          .gt("current_stock", 0)
          .order("name");

        if (inventoryError) throw inventoryError;

        // Fetch all variants
        const { data: variantsData, error: variantsError } = await supabase
          .from("product_variants")
          .select("*")
          .eq("is_active", true);

        if (variantsError) throw variantsError;

        // Map database products to component format
        const mappedProducts: Product[] = (inventoryData || []).map((item) => {
          const productVariants = variantsData?.filter(v => v.product_id === item.id) || [];
          
          // Extract size variants
          const sizeVariants = productVariants.filter(v => v.variant_type === "size");
          const sizes: ProductSize[] | undefined = sizeVariants.length > 0 
            ? sizeVariants.map(v => ({
                label: v.variant_display || v.variant_value,
                capacity: v.variant_value,
              }))
            : undefined;

          // Extract color variants with images
          const colorVariants = productVariants.filter(v => v.variant_type === "color");
          const colors: ColorVariant[] | undefined = colorVariants.length > 0
            ? colorVariants.map(v => ({
                name: v.variant_display || v.variant_value,
                color: v.hex_code || "#888888",
                image: undefined, // Images can be added per variant in database later
              }))
            : undefined;

          // Use database category or determine from name
          const dbCategory = item.category as "personal" | "community" | null;
          const isPersonal = dbCategory === "personal" || 
            (!dbCategory && (
              item.name.toLowerCase().includes("personal") ||
              item.name.toLowerCase().includes("go")));
          
          // Use database features or generate generic defaults
          const features: string[] = item.features && item.features.length > 0 
            ? item.features 
            : ["Quality assured", "Easy to use", "Durable design"];

          // Use database certifications or default
          const dbCerts = item.certifications as string[] | null;
          const certifications: Certification[] = (dbCerts && dbCerts.length > 0)
            ? dbCerts.map(type => ({
                type: type as CertificationType,
                label: type === "bpa-free" ? "BPA Free" :
                       type === "who-2" ? "WHO 2-Star" :
                       type === "who-3" ? "WHO 3-Star" :
                       type === "nsf" ? "NSF 42 & 53" :
                       type === "epa" ? "EPA Registered" :
                       type === "eco" ? "Eco-Friendly" : type,
              }))
            : [{ type: "bpa-free", label: "BPA Free" }];

          // Get image - use uploaded image or fallback
          const image = item.image_url || getFallbackImage();

          // Use database description or generate default
          const description = item.description || `Premium product. SKU: ${item.sku}`;

          // Parse technical specs from database
          const dbTechnicalSpecs = item.technical_specs as unknown as TechnicalSpec[] | null;
          const technicalSpecs: TechnicalSpec[] | undefined = (dbTechnicalSpecs && Array.isArray(dbTechnicalSpecs) && dbTechnicalSpecs.length > 0)
            ? dbTechnicalSpecs
            : undefined;

          return {
            id: item.id,
            name: item.name,
            description,
            highlight: item.highlight || undefined,
            features,
            image,
            category: isPersonal ? "personal" : "community",
            sizes,
            colorVariants: colors,
            certifications,
            salePrice: item.unit_price || 0,
            originalPrice: item.original_price || 0,
            resources: {
              dataSheet: item.datasheet_url || "",
              userManual: item.manual_url || "",
            },
            technicalSpecs,
          };
        });

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading };
}

function ProductCard({ product, index, isInView, onQuickView }: { product: Product; index: number; isInView: boolean; onQuickView: (product: Product) => void }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0]?.capacity || null);
  const [selectedColor, setSelectedColor] = useState(product.colorVariants?.[0]?.name || null);
  const [activeTab, setActiveTab] = useState("details");
  const [imageKey, setImageKey] = useState(0);

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
      setImageKey(prev => prev + 1); // Trigger animation
    }
  };

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
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-card rounded-2xl overflow-hidden shadow-soft card-hover border border-border/50 flex flex-col"
    >
      <div 
        className="relative h-56 bg-cream flex items-center justify-center p-6 overflow-hidden cursor-pointer group/image"
        onClick={() => onQuickView(product)}
      >
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Quick View hint overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors duration-300 z-15 flex items-center justify-center">
          <div className="opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="w-4 h-4" />
            Quick View
          </div>
        </div>
        
        {/* Category badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground">
          {getCategoryIcon()}
          <span className="capitalize">{product.category === "personal" ? "Personal" : "Community"}</span>
        </div>

        {/* Highlight badge */}
        {product.highlight && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
            <Zap className="w-3 h-3" />
            {product.highlight}
          </div>
        )}

        {/* Color indicator dots at bottom of image */}
        {product.colorVariants && product.colorVariants.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
            {product.colorVariants.map((variant) => (
              <button
                key={variant.name}
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorSelect(variant.name);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  selectedColor === variant.name
                    ? "ring-2 ring-offset-1 ring-primary scale-125"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: variant.color }}
                title={variant.name}
              />
            ))}
          </div>
        )}

        {/* Product Image with slide animation */}
        <motion.img
          key={imageKey}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          src={getCurrentImage()}
          alt={`${product.name}${selectedColor ? ` - ${selectedColor}` : ""}`}
          className="relative z-10 max-h-full w-auto object-contain transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.2)]"
        />
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-display font-bold text-foreground mb-2">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
          {product.description}
        </p>
        
        {/* Pricing Display */}
        {product.salePrice > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {product.originalPrice > product.salePrice ? (
              <>
                <span className="text-muted-foreground line-through text-sm">
                  K{product.originalPrice.toLocaleString()}
                </span>
                <span className="text-lg font-bold text-primary">
                  K{product.salePrice.toLocaleString()}
                </span>
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-semibold">
                  Save K{(product.originalPrice - product.salePrice).toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-foreground">
                K{product.salePrice.toLocaleString()}
              </span>
            )}
          </div>
        )}
        
        {/* Certifications badges */}
        {product.certifications && product.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.certifications.map((cert) => {
              const config = certificationConfig[cert.type];
              const IconComponent = config.icon;
              return (
                <div
                  key={cert.type}
                  className={`inline-flex items-center gap-1 ${config.bgColor} ${config.color} px-2 py-0.5 rounded-full text-[10px] font-semibold`}
                >
                  <IconComponent className="w-3 h-3" />
                  {cert.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Size selector for Go bottles */}
        {product.sizes && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Select Size:</span>
            <div className="flex gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size.capacity}
                  onClick={() => setSelectedSize(size.capacity)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedSize === size.capacity
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color selector for stainless steel bottles */}
        {product.colorVariants && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Select Color:</span>
            <div className="flex gap-2">
              {product.colorVariants.map((variant) => (
                <button
                  key={variant.name}
                  onClick={() => handleColorSelect(variant.name)}
                  title={variant.name}
                  className={`w-8 h-8 rounded-full transition-all border-2 ${
                    selectedColor === variant.name
                      ? "ring-2 ring-offset-2 ring-primary border-primary"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  style={{ backgroundColor: variant.color }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground mt-1.5 block">{selectedColor}</span>
          </div>
        )}

        {/* Tabs for Details and Resources */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 mt-0">
            <ul className="space-y-2">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="resources" className="flex-1 mt-0">
            <div className="space-y-3">
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
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA Button - Multi-Action Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full mt-4 bg-[#00AEEF] hover:bg-[#0099D6] text-white font-semibold shadow-md hover:shadow-lg transition-all">
              Inquire Now
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48 z-50 bg-popover border border-border shadow-lg">
            <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent focus:bg-accent">
              <a href="tel:+260972064502" className="flex items-center gap-2 w-full">
                <Phone className="w-4 h-4 text-green-600" />
                <span>Call Now</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent focus:bg-accent">
              <a 
                href="https://wa.me/260972064502" 
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
    </motion.div>
  );
}

export function ProductsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { products, loading } = useProducts();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const { companyName, terminology } = useBusinessConfig();

  const personalProducts = products.filter(p => p.category === "personal");
  const communityProducts = products.filter(p => p.category === "community");

  return (
    <section id="products" className="section-padding bg-secondary/30">
      <div className="container-custom">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold tracking-wider uppercase text-sm">
            Our {terminology.products}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-4 mb-6">
            Premium Water Filters
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Award-winning water filtration products that employ sustainable, effective, 
            and state-of-the-art technology.
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading products...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No products available at the moment.</p>
          </div>
        )}

        {/* Personal Filters Section */}
        {!loading && personalProducts.length > 0 && (
        <div id="personal" className="mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-foreground">Personal Filters</h3>
              <p className="text-sm text-muted-foreground">Portable solutions for individuals and families on the go</p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {personalProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} isInView={isInView} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        </div>
        )}

        {/* Community Dispensers Section */}
        {!loading && communityProducts.length > 0 && (
        <div id="community">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-foreground">Community Dispensers</h3>
              <p className="text-sm text-muted-foreground">High-capacity solutions for homes, schools, and communities</p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {communityProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index + personalProducts.length} isInView={isInView} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Quick View Modal */}
      <ProductQuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  );
}
