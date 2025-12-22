import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DonateSection } from "@/components/DonateSection";
import { PageTransition } from "@/components/PageTransition";

const Donate = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <DonateSection />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Donate;
