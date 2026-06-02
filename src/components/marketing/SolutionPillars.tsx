const PILLARS = [
  {
    no: "01",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    ),
    title: "Everything in one platform",
    desc: "Registration, GST, TDS, income tax, ROC, accounting and payroll — every filing your business needs, under one roof instead of five.",
  },
  {
    no: "02",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    ),
    title: "A dedicated human Taxpert",
    desc: "Not a chatbot. A qualified specialist assigned to your account who reviews every filing and is one message away when you need them.",
  },
  {
    no: "03",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /><path d="M9 15l2 2 4-4" /></svg>
    ),
    title: "Never miss a deadline",
    desc: "Automatic deadline tracking, reminders and status updates — with a lifetime vault that keeps every return, challan and certificate in one place.",
  },
];

export default function SolutionPillars() {
  return (
    <section id="platform" className="lp-section lp-solution">
      <div className="lp-container">
        <div className="lp-intro is-center" data-reveal>
          <span className="lp-eyebrow">The platform</span>
          <h2 className="lp-h2">One platform. Every filing. A real expert.</h2>
          <p className="lp-lead">
            TheTaxpert turns scattered, stressful compliance into a single, calm,
            guided workflow — software speed with genuine human oversight.
          </p>
        </div>

        <div className="lp-deck-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7 4 12l4 5M16 7l4 5-4 5" /></svg>
          Hover to spread
        </div>
        <div className="lp-deck" data-reveal>
          {PILLARS.map((p) => (
            <article className="lp-pillar" key={p.title}>
              <span className="lp-pillar-no">{p.no}</span>
              <div className="lp-pillar-media">
                <div className="lp-pillar-flip">
                  <span className="lp-pillar-face lp-pillar-face--front">{p.icon}</span>
                  <span className="lp-pillar-face lp-pillar-face--back">{p.icon}</span>
                </div>
              </div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
