import { Navbar } from "@/components/Navbar";
import { ProductsSection } from "@/components/ProductsSection";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

const Products = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-20">
          <ProductsSection />
        </div>
        <Footer />
      </main>
    </PageTransition>
  );
};

export default Products;
