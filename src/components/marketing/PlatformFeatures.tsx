import type { ReactNode } from "react";

const I = {
  vault: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="4" /><path d="M12 8v0M12 12l2 2" /><path d="M3 9h2M3 15h2" /></svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /><path d="M9 15l2 2 4-4" /></svg>
  ),
  track: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
  ),
};

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  wide?: boolean;
}

const features: Feature[] = [
  {
    icon: I.vault,
    title: "Lifetime Document Vault",
    desc: "Store returns, challans, filings, and records permanently — always accessible, always organized, securely held year after year.",
    wide: true,
  },
  {
    icon: I.user,
    title: "Dedicated Taxpert",
    desc: "A specialist assigned to your account, providing real human oversight on every task.",
  },
  {
    icon: I.calendar,
    title: "Deadline Tracking & Reminders",
    desc: "Every GST, TDS, income-tax and ROC due date tracked automatically — with reminders so nothing slips.",
  },
  {
    icon: I.track,
    title: "Real-time Status Tracking",
    desc: "Track every filing and compliance task with clear status updates at each stage.",
  },
  {
    icon: I.lock,
    title: "Secure Document Storage",
    desc: "Bank-grade encryption for all your financial documents. Only you and your Taxpert can access them.",
  },
];

function onMove(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function PlatformFeatures() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-intro" data-reveal>
          <span className="lp-eyebrow">Platform features</span>
          <h2 className="lp-h2">Built for faster, smarter compliance.</h2>
          <p className="lp-lead">
            TheTaxpert is not a service directory — it is a structured operating
            layer for tax and compliance work.
          </p>
        </div>
        <div className="lp-feat-grid">
          {features.map((f) => (
            <article
              key={f.title}
              className={`lp-feat-card${f.wide ? " lp-feat-card--wide" : ""}`}
              data-reveal
              onMouseMove={onMove}
            >
              <span className="lp-feat-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
