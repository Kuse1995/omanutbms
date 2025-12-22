import { Navbar } from "@/components/Navbar";
import { TechnologySection } from "@/components/TechnologySection";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

const Technology = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-20">
          <TechnologySection />
        </div>
        <Footer />
      </main>
    </PageTransition>
  );
};

export default Technology;
