import Navbar from "../../../components/marketing/Navbar";
import Footer from "../../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../contexts/AuthContext";

export default function RefundPolicyPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Refund & Cancellation Policy | TheTaxpert</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="legal-page" style={{ padding: "4rem 0", background: "white" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "2rem" }}>Refund & Cancellation Policy</h1>
          <div className="prose prose-lg" style={{ color: "#334155", lineHeight: 1.8 }}>
            <p>Last updated: June 1, 2025</p>
            <p>Thank you for choosing TheTaxpert. We want to ensure that you have a rewarding experience while exploring, evaluating, and purchasing our services.</p>
            
            <h2>1. Cancellation Policy</h2>
            <p>You can cancel a service request within 24 hours of payment, provided that our team has not yet commenced work on your assignment. Once work has begun (e.g., documents reviewed, portal login verified), cancellation is no longer possible.</p>

            <h2>2. Refund Policy</h2>
            <p>Refunds will be provided under the following circumstances:</p>
            <ul>
              <li>If you cancel within the 24-hour window and work has not commenced.</li>
              <li>If TheTaxpert is unable to deliver the service due to internal reasons.</li>
              <li>If double payment is accidentally made for the same service.</li>
            </ul>

            <h2>3. Non-Refundable Scenarios</h2>
            <p>Refunds will NOT be provided if:</p>
            <ul>
              <li>You fail to provide the necessary documents required to complete the service.</li>
              <li>You change your mind after work has commenced.</li>
              <li>A delay occurs due to government portals or third-party dependencies outside our control.</li>
            </ul>

            <h2>4. Process for Refunds</h2>
            <p>To request a refund, please contact us at <strong>billing@thetaxpert.com</strong> with your Invoice Number. Approved refunds will be processed to the original method of payment within 5-7 business days.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
