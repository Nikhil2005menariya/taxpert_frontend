import { useState } from "react";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import BrandMark from "../../components/ui/BrandMark";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";

const SERVICES = [
  "Income Tax Filing",
  "GST Registration / Filing",
  "Company / LLP Registration",
  "ROC Compliance",
  "TDS Compliance",
  "Accounting & Bookkeeping",
  "Other",
];

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

const ADDRESS_LINES = [
  "TheTaxpert Fintech Private Limited",
  "SBI Road, Santoshnagar Colony,",
  "Saidabad, Hyderabad,",
  "Telangana – 500059, India",
];
const MAPS_QUERY = encodeURIComponent("Santoshnagar Colony, Saidabad, Hyderabad, Telangana 500059");

export default function ContactPage() {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiClient.post("/marketing/consultations", {
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        service_needed: fd.get("service"),
        message: fd.get("message") || undefined,
      });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact Us | TheTaxpert</title>
        <meta name="description" content="Get in touch with TheTaxpert — book a free consultation or reach our Hyderabad office for any tax and compliance need." />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />

      <main className="lp cnt-page">
        {/* ── Hero ── */}
        <section className="cnt-hero">
          <div className="cnt-hero-glow" />
          <div className="lp-container cnt-hero-inner">
            <span className="lp-eyebrow cnt-eyebrow">Contact</span>
            <h1 className="cnt-title">
              Let&apos;s get your compliance <span className="cnt-title-accent">handled.</span>
            </h1>
            <p className="cnt-lead">
              Questions about a filing, a deadline, or where to start? Send us a note and a
              qualified Taxpert will get back to you — usually within one business day.
            </p>
          </div>
        </section>

        {/* ── Body ── */}
        <section className="lp-section cnt-body">
          <div className="lp-container cnt-grid">
            {/* Info rail */}
            <aside className="cnt-rail">
              <div className="cnt-card cnt-card--info">
                <div className="cnt-card-brand">
                  <BrandMark size={40} framed />
                  <div>
                    <div className="cnt-card-brand-name">TheTaxpert</div>
                    <div className="cnt-card-brand-sub">Fintech Private Limited</div>
                  </div>
                </div>

                <ul className="cnt-info-list">
                  <li className="cnt-info-item">
                    <span className="cnt-info-ico"><IconMail /></span>
                    <div>
                      <div className="cnt-info-label">Email</div>
                      <a href="mailto:info@thetaxpert.com" className="cnt-info-link">info@thetaxpert.com</a>
                    </div>
                  </li>

                  <li className="cnt-info-item">
                    <span className="cnt-info-ico"><IconPin /></span>
                    <div>
                      <div className="cnt-info-label">Office</div>
                      <address className="cnt-info-address">
                        {ADDRESS_LINES.map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}
                      </address>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cnt-info-maplink"
                      >
                        Get directions
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
                      </a>
                    </div>
                  </li>

                  <li className="cnt-info-item">
                    <span className="cnt-info-ico"><IconClock /></span>
                    <div>
                      <div className="cnt-info-label">Working hours</div>
                      <div className="cnt-info-text">Mon – Sat · 10:00 AM – 7:00 PM IST</div>
                    </div>
                  </li>
                </ul>

                <a
                  href="https://wa.me/?text=Hi%20TheTaxpert%2C%20I%27d%20like%20help%20with%20a%20compliance%20query."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cnt-whatsapp"
                >
                  <IconWhatsApp />
                  Chat on WhatsApp
                </a>
              </div>

              {/* Map */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cnt-map"
                aria-label="Open office location in Google Maps"
              >
                <iframe
                  title="TheTaxpert office location"
                  className="cnt-map-frame"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${MAPS_QUERY}&z=15&output=embed`}
                />
                <span className="cnt-map-pin"><IconPin /></span>
              </a>
            </aside>

            {/* Form */}
            <div className="cnt-form-wrap">
              {sent ? (
                <div className="cnt-success">
                  <span className="cnt-success-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                  </span>
                  <h2 className="cnt-success-title">Message received</h2>
                  <p className="cnt-success-text">
                    Thanks for reaching out. A Taxpert will get back to you within one
                    business day at the email you provided.
                  </p>
                  <button className="lp-btn lp-btn--ghost" onClick={() => setSent(false)}>
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="cnt-form" onSubmit={handleSubmit}>
                  <div className="cnt-form-head">
                    <h2 className="cnt-form-title">Send us a message</h2>
                    <p className="cnt-form-sub">It&apos;s free — tell us what you need and we&apos;ll take it from there.</p>
                  </div>

                  <div className="cnt-field">
                    <label className="cnt-label" htmlFor="cnt-name">Full name</label>
                    <input id="cnt-name" className="cnt-input" name="name" placeholder="Rajesh Kumar" required />
                  </div>

                  <div className="cnt-row">
                    <div className="cnt-field">
                      <label className="cnt-label" htmlFor="cnt-phone">Phone</label>
                      <input id="cnt-phone" className="cnt-input" name="phone" type="tel" placeholder="+91 98765 43210" required />
                    </div>
                    <div className="cnt-field">
                      <label className="cnt-label" htmlFor="cnt-email">Email</label>
                      <input id="cnt-email" className="cnt-input" name="email" type="email" placeholder="you@company.com" required />
                    </div>
                  </div>

                  <div className="cnt-field">
                    <label className="cnt-label" htmlFor="cnt-service">Service needed</label>
                    <div className="cnt-select-wrap">
                      <select id="cnt-service" className="cnt-input cnt-select" name="service" required defaultValue="">
                        <option value="" disabled>Select a service…</option>
                        {SERVICES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <svg className="cnt-select-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>

                  <div className="cnt-field">
                    <label className="cnt-label" htmlFor="cnt-msg">
                      Message <span className="cnt-optional">(optional)</span>
                    </label>
                    <textarea id="cnt-msg" className="cnt-input cnt-textarea" name="message" rows={4} placeholder="Any specific questions or context…" />
                  </div>

                  {err && <p className="cnt-error">{err}</p>}

                  <button type="submit" className="lp-btn lp-btn--accent cnt-submit" disabled={loading}>
                    {loading ? "Sending…" : "Send message"}
                    {!loading && (
                      <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    )}
                  </button>

                  <p className="cnt-form-foot">
                    By submitting, you agree to be contacted about your enquiry. We never share your details.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
