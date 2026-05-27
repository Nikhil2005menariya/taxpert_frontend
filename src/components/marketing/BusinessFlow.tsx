"use client";

import { useState } from "react";
import { Link } from "react-router-dom";

const TABS = [
  {
    id: "start",
    label: "Start your business",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6"/>
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
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
      "DPT-3",
    ],
  },
];

export default function BusinessFlow() {
  const [active, setActive] = useState(2);
  const tab = TABS[active];

  return (
    <section id="services" className="section">
      <div className="container">
        {/* Header row */}
        <div className="bflow-header">
          <div>
            <span className="section-kicker">Services</span>
            <h2 className="bflow-heading">
              Everything your business needs,{" "}
              <em>in one structured platform.</em>
            </h2>
            <p className="bflow-sub">
              From registration to annual filings — handled by experienced Taxperts,
              tracked in a clear workflow, stored in a lifetime vault.
            </p>
          </div>
          <Link to="/services" className="bflow-browse-link">
            Browse all services →
          </Link>
        </div>

        {/* Tabs */}
        <div className="bflow-tabs">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className={`bflow-tab${active === i ? " bflow-tab-active" : ""}`}
            >
              <span className="bflow-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bflow-content">
          {/* Left dark card */}
          <div className="bflow-left-card">
            <span className="bflow-group-label">{tab.group}</span>
            <h3 className="bflow-card-title">{tab.label}</h3>
            <p className="bflow-card-desc">{tab.desc}</p>
            <div className="bflow-card-meta">
              <span>{tab.services.length} services</span>
              <span className="bflow-meta-dot" />
              <span>Dedicated Taxpert</span>
            </div>
          </div>

          {/* Right service list */}
          <div className="bflow-service-list">
            {tab.services.map((svc, i) => (
              <div key={svc} className="bflow-service-row">
                <span className="bflow-service-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="bflow-service-name">{svc}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="bflow-service-arrow">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
