const rows = [
  {
    aspect: "Filing Process",
    traditional: "Manual data entry, error-prone",
    taxpert: "Automated extraction + Taxpert review",
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
    <section id="why-us" className="section section-alt">
      <div className="container">
        <div className="section-heading">
          <span className="section-kicker">Why Choose Us</span>
          <h2>Modern platform efficiency. Real Taxpert oversight.</h2>
          <p>Compare the traditional approach to what TheTaxpert delivers.</p>
        </div>
        <div className="cmp-overflow">
          <div className="cmp-table">
            <div className="cmp-header">
              <div className="cmp-aspect">What matters</div>
              <div className="cmp-col cmp-old">Traditional Approach</div>
              <div className="cmp-col cmp-new">TheTaxpert</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="cmp-row">
                <div className="cmp-aspect">{row.aspect}</div>
                <div className="cmp-col cmp-old">
                  <span className="cmp-cross">✗</span> {row.traditional}
                </div>
                <div className="cmp-col cmp-new">
                  <span className="cmp-check">✓</span> {row.taxpert}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
