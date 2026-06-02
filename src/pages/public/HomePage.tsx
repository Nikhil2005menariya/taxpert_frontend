import { useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import Navbar from "../../components/marketing/Navbar";
import Hero from "../../components/marketing/Hero";
import DeadlinesBanner from "../../components/marketing/DeadlinesBanner";
import TrustMarquee from "../../components/marketing/TrustMarquee";
import ProblemSection from "../../components/marketing/ProblemSection";
import SolutionPillars from "../../components/marketing/SolutionPillars";
import LifecycleJourney from "../../components/marketing/LifecycleJourney";
import ServicesGrid from "../../components/marketing/ServicesGrid";
import HowItWorks from "../../components/marketing/HowItWorks";
import PlatformFeatures from "../../components/marketing/PlatformFeatures";
import WhyChooseUs from "../../components/marketing/WhyChooseUs";
import FAQSection from "../../components/marketing/FAQSection";
import TrustSection from "../../components/marketing/TrustSection";
import CTABanner from "../../components/marketing/CTABanner";
import Footer from "../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";

export default function HomePage() {
  const { profile } = useAuth();
  const isLoggedIn = !!profile;
  const shellRef = useRef<HTMLElement>(null);

  useScrollReveal(shellRef);

  return (
    <>
      <Helmet>
        <title>TheTaxpert — India's all-in-one compliance platform</title>
        <meta
          name="description"
          content="GST, income tax, TDS, ROC, payroll and company & LLP registration — every compliance need handled by qualified experts and tracked in one place. Upload once, stay compliant always."
        />
      </Helmet>
      <main className="marketing-shell lp" ref={shellRef}>
        <DeadlinesBanner />
        <Navbar isLoggedIn={isLoggedIn} />
        <Hero isLoggedIn={isLoggedIn} />
        <TrustMarquee />
        <ProblemSection />
        <SolutionPillars />
        <LifecycleJourney />
        <ServicesGrid />
        <HowItWorks />
        <PlatformFeatures />
        <WhyChooseUs />
        <TrustSection />
        <FAQSection />
        <CTABanner isLoggedIn={isLoggedIn} />
        <Footer />
      </main>
    </>
  );
}
