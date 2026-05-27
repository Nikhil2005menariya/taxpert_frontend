import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { serviceCategories as staticCategories } from "../../shared/site-content";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORY_ICONS: Record<string, string> = {
  "incorporations":             "🏢",
  "registrations":              "📋",
  "accounting-bookkeeping":     "📊",
  "tds-compliance":             "🧾",
  "gst-filings":                "🧮",
  "income-tax-filings":         "💼",
  "roc-compliance-companies":   "🏛️",
  "roc-compliance-llps":        "📂",
  "other-services":             "⚙️",
};

export default function ServicesCatalogPage() {
  const { profile } = useAuth();
  const isLoggedIn = !!profile;

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/services");
      return res.data.data;
    },
  });

  const categories = data || staticCategories;

  return (
    <>
      <Helmet>
        <title>Services | TheTaxpert</title>
        <meta name="description" content="Browse our professional tax, compliance, and registration services." />
      </Helmet>
      <Navbar isLoggedIn={isLoggedIn} />
      <main className="services-page" style={{ minHeight: "80vh" }}>
        <section className="section section-alt">
          <div className="container">
            <div className="section-heading">
              <span className="section-kicker">Services</span>
              <h1>Choose the right service for your need</h1>
              <p>
                Browse by category to see all available services, required
                documents, and pricing — then add the ones that match your need.
              </p>
            </div>

            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div style={{ width: "2rem", height: "2rem", border: "2px solid #c49a3a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : (
              <div className="svc-cat-grid">
                {categories.map((cat: any) => (
                  <Link
                    key={cat.slug}
                    to={`/services/${cat.slug}`}
                    className="svc-cat-card"
                  >
                    <span className="svc-cat-icon">{CATEGORY_ICONS[cat.slug] ?? "📌"}</span>
                    <div className="svc-cat-body">
                      <div className="svc-cat-title">{cat.title}</div>
                      <div className="svc-cat-desc">{cat.description}</div>
                      <div className="svc-cat-count">{cat.itemCount} service{cat.itemCount !== 1 ? "s" : ""}</div>
                    </div>
                    <svg className="svc-cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="svc-pg-cta">
              <div>
                <h2>Not sure which service you need?</h2>
                <p>Talk to TheTaxpert — we will guide you to the right option.</p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
                <a href="mailto:info@thetaxpert.com" className="btn btn-secondary btn-large">Talk to a Taxpert</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
