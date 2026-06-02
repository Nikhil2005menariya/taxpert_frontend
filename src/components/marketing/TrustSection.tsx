import Counter from "./Counter";
import LottieIcon from "./LottieIcon";
import growthBars from "../../assets/lottie/growth-bars.json";

const badges = [
  "Handled by TheTaxpert team",
  "Secure handling of financial data",
  "Designed for individuals & businesses",
  "Year-round access to records",
];

const STATS = [
  { to: 500, suffix: "+", label: "Businesses served" },
  { to: 14, suffix: "+", label: "Years of expertise" },
  { to: 98, suffix: "%", label: "Filing acceptance" },
  { prefix: "₹", to: 0, label: "Penalties on our filings" },
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

function Stars() {
  return (
    <div className="lp-tml-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>
      ))}
    </div>
  );
}

export default function TrustSection() {
  return (
    <section id="trust" className="lp-section lp-section--alt">
      <div className="lp-container">
        <div className="lp-proof" data-reveal>
          <div className="lp-proof-copy">
            <span className="lp-eyebrow">The proof</span>
            <h2 className="lp-h2">Built for trust, not just transactions.</h2>
            <div className="lp-proof-stats">
              {STATS.map((s) => (
                <div className="lp-proof-stat" key={s.label}>
                  <span className="lp-proof-num">
                    <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />
                  </span>
                  <span className="lp-proof-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <LottieIcon data={growthBars} className="lp-proof-lottie" />
        </div>

        <div className="lp-trust-badges" data-reveal>
          {badges.map((badge) => (
            <div key={badge} className="lp-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              {badge}
            </div>
          ))}
        </div>

        <div className="lp-tml-grid">
          {testimonials.map((t, i) => (
            <article key={i} className="lp-tml-card" data-reveal>
              <Stars />
              <p className="lp-tml-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="lp-tml-author">
                <span className="lp-tml-avatar">{t.name.charAt(0)}</span>
                <div>
                  <div className="lp-tml-name">{t.name}</div>
                  <div className="lp-tml-role">{t.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
