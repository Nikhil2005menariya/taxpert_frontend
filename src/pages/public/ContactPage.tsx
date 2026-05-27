import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

export default function ContactPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Contact Us | TheTaxpert</title>
        <meta name="description" content="Get in touch with TheTaxpert team for your tax and compliance needs." />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="contact-page" style={{ padding: "4rem 0", background: "#f8fafc", minHeight: "80vh" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1 style={{ fontSize: "3rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>Contact Us</h1>
            <p style={{ fontSize: "1.25rem", color: "#475569" }}>We're here to help. Reach out to us through any of the channels below.</p>
          </div>
          
          <div className="card" style={{ padding: "3rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>Email Support</h3>
                <p style={{ color: "#64748b", marginBottom: "1rem" }}>For general queries and support:</p>
                <a href="mailto:info@thetaxpert.com" style={{ color: "#2563eb", fontWeight: 600 }}>info@thetaxpert.com</a>
              </div>
              
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>Phone / WhatsApp</h3>
                <p style={{ color: "#64748b", marginBottom: "1rem" }}>Mon-Fri, 10am to 6pm IST</p>
                <a href="https://wa.me/919999999999" style={{ color: "#25d366", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  Message us
                </a>
              </div>
              
              <div style={{ gridColumn: "1 / -1", marginTop: "1rem", paddingTop: "2rem", borderTop: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>Office Address</h3>
                <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                  TheTaxpert HQ<br/>
                  New Delhi, India 110001
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
