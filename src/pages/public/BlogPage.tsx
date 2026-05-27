import { Link } from "react-router-dom";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { blogPosts } from "../../shared/blog-content";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

export default function BlogPage() {
  const { profile } = useAuth();
  
  return (
    <>
      <Helmet>
        <title>Blog | TheTaxpert</title>
        <meta name="description" content="Insights and updates on Indian tax laws, compliance, and business strategies." />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="blog-page">
        <section className="section section-alt">
          <div className="container" style={{ maxWidth: "800px" }}>
            <div className="section-heading" style={{ textAlign: "left", marginBottom: "3rem" }}>
              <span className="section-kicker">Resources</span>
              <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>TheTaxpert Blog</h1>
              <p style={{ fontSize: "1.25rem", color: "#475569" }}>
                Expert insights on taxation, corporate compliance, and business strategy in India.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              {blogPosts.map((post) => (
                <article key={post.slug} className="card" style={{ padding: "2rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#c49a3a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{post.category}</span>
                    <span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>{new Date(post.publishedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1rem" }}>
                    <Link to={`/blog/${post.slug}`} style={{ color: "#0f172a", textDecoration: "none" }}>{post.title}</Link>
                  </h2>
                  <p style={{ color: "#475569", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>{post.description}</p>
                  <Link to={`/blog/${post.slug}`} style={{ fontWeight: 600, color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    Read article <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
