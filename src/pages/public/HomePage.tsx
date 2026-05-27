import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/marketing/Navbar";
import Hero from "../../components/marketing/Hero";
import DeadlinesBanner from "../../components/marketing/DeadlinesBanner";
import LogoSection from "../../components/marketing/LogoSection";
import BusinessFlow from "../../components/marketing/BusinessFlow";
import HowItWorks from "../../components/marketing/HowItWorks";
import PlatformFeatures from "../../components/marketing/PlatformFeatures";
import WhyChooseUs from "../../components/marketing/WhyChooseUs";
import FAQSection from "../../components/marketing/FAQSection";
import TrustSection from "../../components/marketing/TrustSection";
import CTABanner from "../../components/marketing/CTABanner";
import Footer from "../../components/marketing/Footer";
import TrustMarquee from "../../components/marketing/TrustMarquee";
import { Helmet } from "react-helmet-async";

export default function HomePage() {
  const { profile } = useAuth();
  const isLoggedIn = !!profile;

  return (
    <>
      <Helmet>
        <title>TheTaxpert — Professional Tax & Compliance Services</title>
        <meta name="description" content="Tax filing, ROC compliance, and professional accounting services in India. Join TheTaxpert today." />
      </Helmet>
      <main className="marketing-shell">
        <Navbar isLoggedIn={isLoggedIn} />
        <DeadlinesBanner />
        <Hero isLoggedIn={isLoggedIn} />
        <TrustMarquee />
        <LogoSection />
        <BusinessFlow />
        <HowItWorks />
        <PlatformFeatures />
        <WhyChooseUs />
        <FAQSection />
        <TrustSection />
        <CTABanner isLoggedIn={isLoggedIn} />
        <Footer />
      </main>
    </>
  );
}
