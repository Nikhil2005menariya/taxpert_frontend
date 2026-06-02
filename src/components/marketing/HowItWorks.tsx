const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    desc: "Pick a service or book a free consultation. We'll confirm scope, documents and a fixed price upfront.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
  },
  {
    number: "02",
    title: "Get a dedicated Taxpert",
    desc: "A qualified specialist is assigned to your account — your single point of contact for everything.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    ),
  },
  {
    number: "03",
    title: "Share documents securely",
    desc: "Upload once to your encrypted lifetime vault. No more email chains or lost attachments.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 0 4 4m-4-4L8 7" /><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /></svg>
    ),
  },
  {
    number: "04",
    title: "We file — you track",
    desc: "Your Taxpert prepares, reviews and files. You watch real-time status until it's marked done.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-section">
      <div className="lp-container">
        <div className="lp-intro" data-reveal>
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">Simple for you. Structured behind the scenes.</h2>
          <p className="lp-lead">
            Move from scattered emails and last-minute follow-ups to a guided
            workflow with full visibility — in four steps.
          </p>
        </div>

        <div className="lp-hiw-grid">
          <span className="lp-hiw-line" aria-hidden="true" />
          {steps.map((step) => (
            <article key={step.number} className="lp-hiw-step" data-reveal>
              <div className="lp-hiw-node">
                <span className="lp-hiw-icon">{step.icon}</span>
                <span className="lp-hiw-num">{step.number}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
