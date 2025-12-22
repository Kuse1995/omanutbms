import { Navbar } from "@/components/Navbar";
import { AboutSection } from "@/components/AboutSection";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

const About = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-20">
          <AboutSection />
        </div>
        <Footer />
      </main>
    </PageTransition>
  );
};

export default About;
