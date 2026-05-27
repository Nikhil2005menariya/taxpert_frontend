const placeholders = [
  "Startup Co.", "RetailCo.", "Tech Firm", "Legal LLP",
  "Consultants", "Exports Ltd", "Infra Pvt.", "Media Co.",
];

export default function LogoSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="logo-sec-head">
          <span className="section-kicker">Trusted By</span>
          <p className="logo-sec-sub">
            Trusted by 100+ businesses across India — from early-stage startups
            to established companies managing multi-entity compliance.
          </p>
        </div>
        <div className="logo-grid">
          {placeholders.map((name) => (
            <div key={name} className="logo-placeholder">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
