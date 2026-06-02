"use client";

import { useState } from "react";
import { Link } from "react-router-dom";

const TABS = [
  {
    id: "start",
    label: "Start your business",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" />
      </svg>
    ),
    group: "GROUP · 01",
    desc: "Set up the right legal structure and get every registration handled from day one.",
    services: [
      "Private Limited Company", "LLP", "Partnership Firm", "Section 8 Company",
      "GST Registration", "MSME Registration", "Trade License", "Labour License",
    ],
  },
  {
    id: "manage",
    label: "Manage your business",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    group: "GROUP · 02",
    desc: "Keep books accurate, payroll on time, and statutory obligations handled every month.",
    services: [
      "Monthly Accounting", "Annual Finalization",
      "Payroll Processing", "PF, ESI, PT Compliance",
    ],
  },
  {
    id: "comply",
    label: "Stay compliant",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    group: "GROUP · 03",
    desc: "GST, TDS, income-tax and ROC handled in one structured workflow.",
    services: [
      "GST Monthly/Quarterly Returns", "GST Annual Returns",
      "GST Advisory", "TDS Returns Filing",
      "TDS Advisory", "Income Tax — Individuals",
      "Income Tax — Companies", "Income Tax — LLPs",
      "AOC-4", "MGT-7 / MGT-7A",
      "DIR-3 KYC", "DSC Services",
      "ROC LLP Form 8", "ROC LLP Form 11",
      "DPT-3", "Notice Handling",
    ],
  },
];

export default function BusinessFlow() {
  const [active, setActive] = useState(2);
  const tab = TABS[active];

  return (
    <section id="services" className="lp-section">
      <div className="lp-container">
        <div className="lp-svc-head">
          <div data-reveal>
            <span className="lp-eyebrow">Services</span>
            <h2 className="lp-h2">
              Everything your business needs,<br />
              in one structured platform.
            </h2>
          </div>
          <Link to="/services" className="lp-svc-browse" data-reveal>
            Browse all services
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>

        <div className="lp-svc-tabs" data-reveal>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className={`lp-svc-tab${active === i ? " is-active" : ""}`}
            >
              <span className="lp-svc-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="lp-svc-content" data-reveal>
          <div className="lp-svc-feature" key={tab.id}>
            <span className="lp-svc-group">{tab.group}</span>
            <h3 className="lp-svc-feature-title">{tab.label}</h3>
            <p className="lp-svc-feature-desc">{tab.desc}</p>
            <div className="lp-svc-feature-meta">
              <span>{tab.services.length} services</span>
              <span className="lp-svc-meta-dot" />
              <span>Dedicated Taxpert</span>
            </div>
          </div>

          <div className="lp-svc-list" key={`${tab.id}-list`}>
            {tab.services.map((svc, i) => (
              <div key={svc} className="lp-svc-row">
                <span className="lp-svc-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lp-svc-name">{svc}</span>
                <svg className="lp-svc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
