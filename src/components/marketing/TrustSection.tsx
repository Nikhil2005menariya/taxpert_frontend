const badges = [
  "Handled by TheTaxpert team",
  "Secure handling of financial data",
  "Designed for individuals & businesses",
  "Year-round access to records",
];

const testimonials = [
  {
    quote:
      "I uploaded my Form 16 and proofs once, and the whole process felt far more structured than email and WhatsApp.",
    name: "Priya S.",
    role: "Salaried Professional",
  },
  {
    quote:
      "We now handle GST, TDS, and annual compliance in one place. Much easier than coordinating with different people.",
    name: "Arjun Mehta",
    role: "Small Business Owner",
  },
  {
    quote:
      "As a startup, we wanted speed and clarity. TheTaxpert gave us both — software plus real Taxpert support.",
    name: "Rohan K.",
    role: "Founder",
  },
];

export default function TrustSection() {
  return (
    <section id="trust" className="section">
      <div className="container">
        <div className="section-heading">
          <span className="section-kicker">Trust</span>
          <h2>Built for trust, not just transactions.</h2>
        </div>

        <div className="trust-badges">
          {badges.map((badge) => (
            <div key={badge} className="trust-badge">
              <span className="trust-check">✓</span>
              {badge}
            </div>
          ))}
        </div>

        <div className="content-grid three-up" style={{ marginTop: "2rem" }}>
          {testimonials.map((t, i) => (
            <article key={i} className="surface-card tml-card">
              <p className="tml-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="tml-author">
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
