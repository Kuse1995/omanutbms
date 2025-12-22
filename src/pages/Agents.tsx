import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import AgentsSection from "@/components/AgentsSection";
import { PageTransition } from "@/components/PageTransition";

const Agents = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <AgentsSection />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Agents;
