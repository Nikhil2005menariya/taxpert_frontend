const features = [
  {
    icon: "🗄️",
    title: "Lifetime Document Vault",
    desc: "Store returns, challans, filings, and records permanently — always accessible, always organized.",
  },
  {
    icon: "👤",
    title: "Dedicated Taxpert",
    desc: "A dedicated Taxpert specialist assigned to your account, providing real human oversight on every task.",
  },
  {
    icon: "⚡",
    title: "Smart Form 16 Extraction",
    desc: "Automated data extraction from Form 16 — salary, TDS, and employer details pulled instantly.",
  },
  {
    icon: "📍",
    title: "Real-time Status Tracking",
    desc: "Track every filing and compliance task with clear status updates at each stage of the process.",
  },
  {
    icon: "🔒",
    title: "Secure Document Storage",
    desc: "Bank-grade encryption for all your financial documents. Only you and your Taxpert can access them.",
  },
];

export default function PlatformFeatures() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="section-kicker">Platform Features</span>
          <h2>Built for faster, smarter compliance.</h2>
          <p>
            TheTaxpert is not a service directory — it is a structured operating
            layer for tax and compliance work.
          </p>
        </div>
        <div className="feat-grid">
          {features.map((f) => (
            <article key={f.title} className="feat-card">
              <span className="feat-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
