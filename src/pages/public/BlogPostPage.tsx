import { useParams, Navigate, Link } from "react-router-dom";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { blogPosts } from "../../shared/blog-content";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" });

export default function BlogPostPage() {
  const { slug } = useParams();
  const { profile } = useAuth();

  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return <Navigate to="/blog" replace />;

  const initials = post.author
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      <Helmet>
        <title>{post.title} | TheTaxpert Blog</title>
        <meta name="description" content={post.description} />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />

      <main className="lp bpost-page">
        {/* ── Hero ── */}
        <section className="bpost-hero">
          <div className="bpost-hero-glow" />
          <div className="lp-container bpost-hero-inner">
            <Link to="/blog" className="bpost-back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
              All articles
            </Link>
            <div className="bpost-hero-meta">
              <span className="bpost-cat">{post.category}</span>
              <span className="bpost-dot" />
              <span>{fmtDate(post.publishedAt)}</span>
              <span className="bpost-dot" />
              <span>{post.readTime}</span>
            </div>
            <h1 className="bpost-title">{post.title}</h1>
            <p className="bpost-desc">{post.description}</p>
            <div className="bpost-byline">
              <span className="bpost-avatar">{initials}</span>
              <span className="bpost-author">{post.author}</span>
            </div>
          </div>
        </section>

        {/* ── Article body ── */}
        <article className="bpost-article">
          <div className="bpost-prose">
            {post.sections.map((sec, idx) => {
              if (sec.type === "h2") return <h2 key={idx}>{sec.content}</h2>;
              if (sec.type === "h3") return <h3 key={idx}>{sec.content}</h3>;
              if (sec.type === "p") return <p key={idx}>{sec.content}</p>;
              if (sec.type === "callout")
                return (
                  <div key={idx} className="bpost-callout">
                    <svg className="bpost-callout-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
                    <p>{sec.content}</p>
                  </div>
                );
              if (sec.type === "ul")
                return (
                  <ul key={idx}>
                    {sec.content.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                );
              if (sec.type === "table")
                return (
                  <div key={idx} className="bpost-table-wrap">
                    <table className="bpost-table">
                      <thead>
                        <tr>{sec.headers?.map((h: string, i: number) => <th key={i}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {sec.rows?.map((r: string[], i: number) => (
                          <tr key={i}>{r.map((c: string, j: number) => <td key={j}>{c}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              return null;
            })}
          </div>

          {/* CTA */}
          <div className="bpost-cta">
            <div>
              <h3 className="bpost-cta-title">Need this handled for you?</h3>
              <p className="bpost-cta-sub">Let a qualified Taxpert take compliance off your plate.</p>
            </div>
            <Link to="/services" className="lp-btn lp-btn--accent">
              Explore our services
              <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="bpost-related">
              <h4 className="bpost-related-head">Keep reading</h4>
              <div className="bpost-related-grid">
                {related.map((p) => (
                  <Link key={p.slug} to={`/blog/${p.slug}`} className="bpost-related-card">
                    <span className="bpost-related-cat">{p.category}</span>
                    <span className="bpost-related-title">{p.title}</span>
                    <span className="bpost-related-meta">{p.readTime}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </>
  );
}
