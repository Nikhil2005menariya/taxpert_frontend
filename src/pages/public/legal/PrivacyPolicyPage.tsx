import Navbar from "../../../components/marketing/Navbar";
import Footer from "../../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../contexts/AuthContext";

export default function PrivacyPolicyPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Privacy Policy | TheTaxpert</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="legal-page" style={{ padding: "4rem 0", background: "white" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "2rem" }}>Privacy Policy</h1>
          <div className="prose prose-lg" style={{ color: "#334155", lineHeight: 1.8 }}>
            <p>Last updated: June 1, 2025</p>
            <p>At TheTaxpert, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
            
            <h2>1. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when registering at the Services, expressing an interest in obtaining information about us or our products and services.</p>
            <ul>
              <li><strong>Personal Data:</strong> Name, email address, phone number, PAN, GST number, and other identification details.</li>
              <li><strong>Financial Data:</strong> Bank account details and payment information required for tax filing or service payments.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect or receive:</p>
            <ul>
              <li>To facilitate account creation and logon process.</li>
              <li>To perform our professional services (tax filing, compliance, etc.).</li>
              <li>To send you marketing and promotional communications (you can opt-out at any time).</li>
              <li>To fulfill and manage your orders and payments.</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We DO NOT sell your personal data to third parties.</p>

            <h2>4. Security of Your Information</h2>
            <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

            <h2>5. Contact Us</h2>
            <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
            <p>Email: privacy@thetaxpert.com</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
