const rows = [
  {
    aspect: "Filing Process",
    traditional: "Manual, error-prone, last-minute",
    taxpert: "Expert-prepared and reviewed before filing",
  },
  {
    aspect: "Speed",
    traditional: "Slow, dependent on availability",
    taxpert: "Faster turnaround with structured workflow",
  },
  {
    aspect: "Visibility",
    traditional: "No tracking — follow-up by call/WhatsApp",
    taxpert: "Real-time status on every task",
  },
  {
    aspect: "Documents",
    traditional: "Scattered across email and chat",
    taxpert: "Organized in a Lifetime Vault",
  },
  {
    aspect: "Support",
    traditional: "Ad-hoc, inconsistent",
    taxpert: "Dedicated Taxpert specialist assigned to you",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="lp-section lp-section--alt">
      <div className="lp-container">
        <div className="lp-intro" data-reveal>
          <span className="lp-eyebrow">Why choose us</span>
          <h2 className="lp-h2">Modern platform efficiency. Real Taxpert oversight.</h2>
          <p className="lp-lead">Compare the traditional approach to what TheTaxpert delivers.</p>
        </div>

        <div className="lp-cmp" data-reveal>
          <div className="lp-cmp-row lp-cmp-head">
            <div className="lp-cmp-cell lp-cmp-aspect">What matters</div>
            <div className="lp-cmp-cell lp-cmp-old">Traditional approach</div>
            <div className="lp-cmp-cell lp-cmp-new">TheTaxpert</div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="lp-cmp-row">
              <div className="lp-cmp-cell lp-cmp-aspect">{row.aspect}</div>
              <div className="lp-cmp-cell lp-cmp-old">
                <span className="lp-cmp-ico lp-cmp-ico--x">✕</span>
                {row.traditional}
              </div>
              <div className="lp-cmp-cell lp-cmp-new">
                <span className="lp-cmp-ico lp-cmp-ico--c">✓</span>
                {row.taxpert}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
