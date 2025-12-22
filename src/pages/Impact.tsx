import { Navbar } from "@/components/Navbar";
import { ImpactSection } from "@/components/ImpactSection";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

const Impact = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-20">
          <ImpactSection />
        </div>
        <Footer />
      </main>
    </PageTransition>
  );
};

export default Impact;
