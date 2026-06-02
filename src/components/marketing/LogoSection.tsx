const placeholders = [
  "Startup Co.", "RetailCo.", "Tech Firm", "Legal LLP",
  "Consultants", "Exports Ltd", "Infra Pvt.", "Media Co.",
];

export default function LogoSection() {
  return (
    <section className="lp-section lp-section--tight">
      <div className="lp-container">
        <div className="lp-logos-head" data-reveal>
          <span className="lp-eyebrow">Trusted by</span>
          <p className="lp-logos-sub">
            Trusted by 100+ businesses across India — from early-stage startups
            to established companies managing multi-entity compliance.
          </p>
        </div>
        <div className="lp-logos-grid" data-reveal>
          {placeholders.map((name) => (
            <div key={name} className="lp-logo-tile">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
