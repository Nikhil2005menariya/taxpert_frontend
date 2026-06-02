import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { apiClient } from "../../api/client";
import { serviceCategories as staticCategories } from "../../shared/site-content";
import { CategoryIcon } from "../../shared/category-icons";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";

interface CatItem {
  name: string;
  slug: string;
  summary?: string;
  price?: string | null;
}
interface Cat {
  title: string;
  slug: string;
  description: string;
  items?: CatItem[];
  itemCount?: number;
}

/** Cheapest price across a category's items, formatted as "6,999" (or null). */
function cheapest(items: CatItem[] = []): string | null {
  const nums = items
    .map((i) => i.price?.replace(/[^\d]/g, ""))
    .filter(Boolean)
    .map(Number);
  if (nums.length === 0) return null;
  return Math.min(...nums).toLocaleString("en-IN");
}

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function ServicesCatalogPage() {
  const { profile } = useAuth();
  const isLoggedIn = !!profile;
  const shellRef = useRef<HTMLElement>(null);
  useScrollReveal(shellRef);

  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/services");
      return res.data.data as Cat[];
    },
  });

  const categories: Cat[] = data || (staticCategories as unknown as Cat[]);

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const totalServices = categories.reduce(
    (n, c) => n + (c.items?.length ?? c.itemCount ?? 0),
    0,
  );

  const matches = useMemo(() => {
    if (!isSearching) return [];
    const out: (CatItem & { categoryTitle: string; categorySlug: string })[] = [];
    for (const cat of categories) {
      for (const it of cat.items ?? []) {
        const hay = `${it.name} ${it.summary ?? ""} ${cat.title}`.toLowerCase();
        if (hay.includes(q)) out.push({ ...it, categoryTitle: cat.title, categorySlug: cat.slug });
      }
    }
    return out;
  }, [categories, q, isSearching]);

  return (
    <>
      <Helmet>
        <title>Service Catalogue | TheTaxpert</title>
        <meta
          name="description"
          content="Browse every TheTaxpert service — incorporation, GST, income tax, TDS, ROC, payroll and registrations — with transparent fixed pricing."
        />
      </Helmet>

      <main className="lp" ref={shellRef}>
        <Navbar isLoggedIn={isLoggedIn} />

        {/* ── Hero ── */}
        <section className="lp-cat-hero">
          <div className="lp-hero-glow" />
          <div className="lp-hero-grid" />
          <div className="lp-container lp-cat-hero-inner">
            <span className="lp-eyebrow" data-reveal>Service catalogue</span>
            <h1 className="lp-cat-h1" data-reveal>
              Every compliance need, <em>one catalogue.</em>
            </h1>
            <p className="lp-cat-sub" data-reveal>
              From your first registration to recurring filings and annual compliance —
              find the right service, see what it covers, and start in minutes.
            </p>

            <div className="lp-cat-search" data-reveal>
              <svg className="lp-cat-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services — GST, ITR, ROC, payroll…"
                aria-label="Search services"
              />
              {query && (
                <button className="lp-cat-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="lp-cat-stats" data-reveal>
              <span className="lp-cat-stat"><strong>{categories.length}</strong> categories</span>
              <span className="lp-cat-stat"><strong>{totalServices}+</strong> services</span>
              <span className="lp-cat-stat"><strong>Fixed</strong> transparent pricing</span>
            </div>
          </div>
        </section>

        {/* ── Body ── */}
        <section className="lp-section lp-section--alt" style={{ paddingTop: "clamp(32px, 5vw, 56px)" }}>
          <div className="lp-container">
            {isLoading ? (
              <div className="lp-svccat-grid">
                {Array.from({ length: 6 }).map((_, i) => <div className="lp-cat-skel" key={i} />)}
              </div>
            ) : isSearching ? (
              matches.length > 0 ? (
                <>
                  <p className="lp-cat-resulthead">
                    <b>{matches.length}</b> {matches.length === 1 ? "service" : "services"} matching “{query}”
                  </p>
                  <div className="lp-cat-results">
                    {matches.map((svc) => (
                      <Link
                        key={`${svc.categorySlug}-${svc.slug}`}
                        to={`/services/${svc.categorySlug}?svc=${svc.slug}`}
                        className="lp-cat-result"
                        data-reveal
                      >
                        <span className="lp-cat-result-ico"><CategoryIcon slug={svc.categorySlug} /></span>
                        <span className="lp-cat-result-body">
                          <span className="lp-cat-result-cat">{svc.categoryTitle}</span>
                          <span className="lp-cat-result-name">{svc.name}</span>
                          {svc.summary && <span className="lp-cat-result-sum">{svc.summary}</span>}
                        </span>
                        {svc.price && <span className="lp-cat-result-price">{svc.price}</span>}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="lp-cat-empty">
                  No services match “{query}”. <button onClick={() => setQuery("")}>Clear search</button>
                </div>
              )
            ) : (
              <div className="lp-svccat-grid">
                {categories.map((cat) => {
                  const from = cheapest(cat.items);
                  const count = cat.items?.length ?? cat.itemCount ?? 0;
                  return (
                    <Link to={`/services/${cat.slug}`} className="lp-svccat" data-reveal key={cat.slug}>
                      <div className="lp-svccat-top">
                        <span className="lp-svccat-icon"><CategoryIcon slug={cat.slug} /></span>
                        <span className="lp-svccat-count">{count} {count === 1 ? "service" : "services"}</span>
                      </div>
                      <h3 className="lp-svccat-title">{cat.title}</h3>
                      <p className="lp-svccat-desc">{cat.description}</p>
                      {cat.items && cat.items.length > 0 && (
                        <div className="lp-svccat-tags">
                          {cat.items.slice(0, 3).map((it) => (
                            <span className="lp-svccat-tag" key={it.slug}>{it.name}</span>
                          ))}
                          {cat.items.length > 3 && (
                            <span className="lp-svccat-tag lp-svccat-tag--more">+{cat.items.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="lp-svccat-foot">
                        {from ? <span className="lp-svccat-from">from ₹{from}</span> : <span />}
                        <span className="lp-svccat-link">View<ArrowIcon /></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lp-cta-wrap">
          <div className="lp-container">
            <div className="lp-cta">
              <div className="lp-cta-inner">
                <span className="lp-eyebrow">Not sure where to start?</span>
                <h2>Tell us your goal. We’ll map the compliance.</h2>
                <p>
                  Talk to a qualified Taxpert and we’ll point you to exactly the services your
                  business needs — nothing more.
                </p>
                <div className="lp-cta-row">
                  <Link to={isLoggedIn ? "/dashboard" : "/register"} className="lp-btn lp-btn--accent">
                    Get started
                  </Link>
                  <a href="mailto:info@thetaxpert.com" className="lp-btn lp-btn--ghost">
                    Talk to a Taxpert
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
