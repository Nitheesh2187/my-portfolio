import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import SkillsSection from "@/components/SkillsSection";
import ProjectsSection from "@/components/ProjectsSection";
import AIAgentSection from "@/components/AIAgentSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { useActiveSection } from "@/hooks/use-active-section";

const SECTION_IDS = [
  "home",
  "about",
  "experience",
  "skills",
  "projects",
  "ai-agent",
  "contact",
];

const Index = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useActiveSection(SECTION_IDS);

  return (
  <div className="relative min-h-screen bg-background neural-bg">
    <ParticleBackground />
    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <ExperienceSection />
      <SkillsSection />
      <ProjectsSection />
      <AIAgentSection />
      {/* Contact + Footer share a single viewport. min-h-[100dvh] uses the
          dynamic viewport (accounts for mobile browser chrome) so the
          copyright line is visible without needing to scroll past the form. */}
      <div className="min-h-[100dvh] flex flex-col">
        <ContactSection />
        <Footer />
      </div>
    </div>
  </div>
  );
};

export default Index;
