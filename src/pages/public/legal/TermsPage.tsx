import Navbar from "../../../components/marketing/Navbar";
import Footer from "../../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../contexts/AuthContext";

export default function TermsPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Terms of Service | TheTaxpert</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="legal-page" style={{ padding: "4rem 0", background: "white" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "2rem" }}>Terms of Service</h1>
          <div className="prose prose-lg" style={{ color: "#334155", lineHeight: 1.8 }}>
            <p>Last updated: June 1, 2025</p>
            <p>Please read these Terms of Service ("Terms") carefully before using the TheTaxpert website and services.</p>
            
            <h2>1. Agreement to Terms</h2>
            <p>By accessing our website and using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.</p>

            <h2>2. Professional Services</h2>
            <p>TheTaxpert provides tax consulting, filing, accounting, and compliance services. While we strive for accuracy, the final responsibility for the data submitted in returns and compliance documents rests with the client. You must provide accurate and complete information.</p>

            <h2>3. User Accounts</h2>
            <p>When you create an account with us, you guarantee that you are above the age of 18, and that the information you provide is accurate. You are responsible for safeguarding the password that you use to access the service.</p>

            <h2>4. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of TheTaxpert and its licensors.</p>

            <h2>5. Limitation of Liability</h2>
            <p>In no event shall TheTaxpert, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>

            <h2>6. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
