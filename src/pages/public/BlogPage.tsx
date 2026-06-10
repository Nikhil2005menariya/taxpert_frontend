import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { blogPosts } from "../../shared/blog-content";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* Per-category line icon for the cover emblem. */
function CategoryIcon({ category }: { category: string }) {
  const c = category.toLowerCase();
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (c.includes("gst"))
    return (
      <svg {...common}>
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z" />
        <path d="M9 14.5 15 8.5M9.5 9h.01M14.5 14h.01" />
      </svg>
    );
  if (c.includes("income") || c.includes("tax"))
    return (
      <svg {...common}>
        <path d="M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5" />
        <path d="M14.5 11.5H9.5a1.75 1.75 0 0 0 0 3.5h2.5a1.75 1.75 0 0 1 0 3.5H9M12 10v1M12 18.5v1" />
      </svg>
    );
  if (c.includes("startup"))
    return (
      <svg {...common}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
        <path d="M12 15 9 12a14 14 0 0 1 3-7c1.65-1.65 4.5-2.5 7-2.5.5 2.5-.35 5.35-2 7a14 14 0 0 1-7 3Z" />
        <path d="M15 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 5a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export default function BlogPage() {
  const { profile } = useAuth();
  const [active, setActive] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(blogPosts.map((p) => p.category)))],
    []
  );

  const sorted = useMemo(
    () => [...blogPosts].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)),
    []
  );

  const filtered = active === "All" ? sorted : sorted.filter((p) => p.category === active);
  const [featured, ...rest] = filtered;

  return (
    <>
      <Helmet>
        <title>Blog | TheTaxpert</title>
        <meta name="description" content="Insights and updates on Indian tax laws, compliance, and business strategies." />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />

      <main className="lp blg-page">
        {/* ── Hero ── */}
        <section className="blg-hero">
          <div className="blg-hero-glow" />
          <div className="lp-container blg-hero-inner">
            <span className="lp-eyebrow blg-eyebrow">Resources</span>
            <h1 className="blg-title">
              The compliance <span className="blg-title-accent">field notes.</span>
            </h1>
            <p className="blg-lead">
              Plain-English guides on GST, income tax, and running a compliant business in India —
              written by the experts who file them every day.
            </p>
          </div>
        </section>

        {/* ── Body ── */}
        <section className="lp-section blg-body">
          <div className="lp-container">
            {/* Filter */}
            <div className="blg-filter" role="tablist" aria-label="Filter posts by category">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={active === c}
                  className={`blg-chip${active === c ? " blg-chip--on" : ""}`}
                  onClick={() => setActive(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Featured */}
            {featured && (
              <Link to={`/blog/${featured.slug}`} className="blg-feature">
                <div className="blg-feature-art" aria-hidden="true">
                  <span className="blg-feature-rings" />
                  <span className="blg-feature-watermark">{featured.category.charAt(0)}</span>
                  <span className="blg-feature-tag"><span className="blg-feature-tag-dot" />Featured read</span>
                  <span className="blg-feature-emblem">
                    <CategoryIcon category={featured.category} />
                  </span>
                  <span className="blg-feature-mono">{featured.category}</span>
                </div>
                <div className="blg-feature-body">
                  <div className="blg-meta">
                    <span className="blg-cat">{featured.category}</span>
                    <span className="blg-dot" />
                    <span>{fmtDate(featured.publishedAt)}</span>
                    <span className="blg-dot" />
                    <span>{featured.readTime}</span>
                  </div>
                  <h2 className="blg-feature-title">{featured.title}</h2>
                  <p className="blg-feature-desc">{featured.description}</p>
                  <span className="blg-readmore">
                    Read article <ArrowIcon />
                  </span>
                </div>
              </Link>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="blg-grid">
                {rest.map((post) => (
                  <Link key={post.slug} to={`/blog/${post.slug}`} className="blg-card">
                    <div className="blg-card-art" aria-hidden="true">
                      <span className="blg-card-watermark">{post.category.charAt(0)}</span>
                      <span className="blg-card-emblem">
                        <CategoryIcon category={post.category} />
                      </span>
                    </div>
                    <div className="blg-card-body">
                      <div className="blg-meta">
                        <span className="blg-cat">{post.category}</span>
                        <span className="blg-dot" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="blg-card-title">{post.title}</h3>
                      <p className="blg-card-desc">{post.description}</p>
                      <div className="blg-card-foot">
                        <span className="blg-card-date">{fmtDate(post.publishedAt)}</span>
                        <span className="blg-readmore blg-readmore--sm">
                          Read <ArrowIcon />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <p className="blg-empty">No posts in this category yet — check back soon.</p>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
