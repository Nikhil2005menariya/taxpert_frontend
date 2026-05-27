import Navbar from "../../../components/marketing/Navbar";
import Footer from "../../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../../contexts/AuthContext";

export default function DisclaimerPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Disclaimer | TheTaxpert</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="legal-page" style={{ padding: "4rem 0", background: "white" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "2rem" }}>Disclaimer</h1>
          <div className="prose prose-lg" style={{ color: "#334155", lineHeight: 1.8 }}>
            <p>Last updated: June 1, 2025</p>
            <p>The information contained on TheTaxpert website is for general information purposes only.</p>
            
            <h2>1. No Professional Advice</h2>
            <p>The information provided on this website does not, and is not intended to, constitute legal, tax, or accounting advice. All information, content, and materials available on this site are for general informational purposes only. You should consult with a professional advisor before making any decisions based on information on this site.</p>

            <h2>2. Accuracy of Information</h2>
            <p>While we strive to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose.</p>

            <h2>3. External Links</h2>
            <p>Through this website, you are able to link to other websites which are not under the control of TheTaxpert. We have no control over the nature, content, and availability of those sites. The inclusion of any links does not necessarily imply a recommendation or endorse the views expressed within them.</p>

            <h2>4. Limitation of Liability</h2>
            <p>In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this website.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
