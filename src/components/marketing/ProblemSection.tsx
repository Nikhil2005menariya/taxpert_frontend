import Counter from "./Counter";

const STATS = [
  { to: 30, suffix: "+", label: "statutory deadlines a business juggles every year" },
  { prefix: "₹", to: 10000, suffix: "+", label: "in late fees & interest from a single missed return" },
  { to: 6, suffix: "", label: "different portals — GSTN, MCA, TRACES, EPFO and more" },
];

export default function ProblemSection() {
  return (
    <section id="reality" className="lp-section lp-section--dark lp-problem">
      <div className="lp-container">
        <div className="lp-intro" data-reveal>
          <span className="lp-eyebrow">The reality</span>
          <h2 className="lp-h2">
            Compliance in India never stops.
          </h2>
          <p className="lp-lead">
            New deadlines every month. Forms across half a dozen portals. One slip —
            a late GST return, a missed ROC filing, an overlooked TDS due date — and
            the penalties, notices and interest start stacking up.
          </p>
        </div>

        <div className="lp-problem-stats">
          {STATS.map((s, i) => (
            <div className="lp-problem-stat" data-reveal key={i}>
              <span className="lp-problem-num">
                <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />
              </span>
              <span className="lp-problem-label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="lp-problem-foot" data-reveal>
          Most businesses manage this with spreadsheets, WhatsApp threads and a CA
          who&apos;s hard to reach. <strong>There&apos;s a calmer way.</strong>
        </p>
      </div>
    </section>
  );
}
