import { useParams, Navigate, Link } from "react-router-dom";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { blogPosts } from "../../shared/blog-content";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/AuthContext";

export default function BlogPostPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <Helmet>
        <title>{post.title} | TheTaxpert Blog</title>
        <meta name="description" content={post.description} />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="blog-post-page">
        <article style={{ background: "white", padding: "4rem 0" }}>
          <div className="container" style={{ maxWidth: "768px" }}>
            <div style={{ marginBottom: "2rem" }}>
              <Link to="/blog" style={{ color: "#64748b", fontWeight: 600, fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                ← Back to Blog
              </Link>
            </div>
            
            <header style={{ marginBottom: "3rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#c49a3a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{post.category}</span>
                <span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>{new Date(post.publishedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.2, marginBottom: "1.5rem" }}>
                {post.title}
              </h1>
              <p style={{ fontSize: "1.25rem", color: "#475569", lineHeight: 1.6 }}>
                {post.description}
              </p>
            </header>

            <div className="prose prose-lg max-w-none" style={{ color: "#334155", lineHeight: 1.8, fontSize: "1.1rem" }}>
              {post.sections.map((sec, idx) => {
                if (sec.type === 'h2') return <h2 key={idx}>{sec.content}</h2>;
                if (sec.type === 'h3') return <h3 key={idx}>{sec.content}</h3>;
                if (sec.type === 'p') return <p key={idx}>{sec.content}</p>;
                if (sec.type === 'callout') return <div key={idx} className="bg-blue-50 p-4 border-l-4 border-blue-500 rounded my-4">{sec.content}</div>;
                if (sec.type === 'ul') return <ul key={idx}>{sec.content.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>;
                if (sec.type === 'table') return <table key={idx} className="w-full text-left my-4"><thead><tr>{sec.headers?.map((h: string, i: number) => <th key={i}>{h}</th>)}</tr></thead><tbody>{sec.rows?.map((r: string[], i: number) => <tr key={i}>{r.map((c: string, j: number) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>;
                return null;
              })}
            </div>
            
            <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>By TheTaxpert Editorial Team</div>
              <Link to="/services" className="btn btn-secondary">Explore our services</Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
