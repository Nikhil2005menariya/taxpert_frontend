"use client";

import { useEffect, useState } from "react";

const STAGES = ["Upload", "Extract", "Review", "Filed"] as const;

const FIELDS = [
  { label: "Gross Salary",    val: "₹12,40,000" },
  { label: "TDS Deducted",    val: "₹1,86,000" },
  { label: "Taxable Income",  val: "₹11,20,000" },
  { label: "Refund Due",      val: "₹24,500" },
];

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export default function HeroVisual() {
  const [stage, setStage] = useState(0);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 2800);
    return () => clearInterval(stageTimer);
  }, []);

  useEffect(() => {
    if (stage === 1) {
      setRevealed(0);
      let i = 0;
      const t = setInterval(() => {
        i++;
        setRevealed(i);
        if (i >= FIELDS.length) clearInterval(t);
      }, 350);
      return () => clearInterval(t);
    }
    if (stage >= 2) setRevealed(FIELDS.length);
  }, [stage]);

  return (
    <div className="hero-visual">
      {/* Header */}
      <div className="hero-visual-header">
        <span className="hero-visual-title">Form 16 · Auto-extraction</span>
        <span className="hero-visual-stage">{STAGES[stage]}</span>
      </div>

      {/* Progress bar — 4 segments */}
      <div className="hero-steps">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`hero-step ${i < stage ? "done" : i === stage ? "active" : "pending"}`}
          >
            <div className="hero-step-fill" />
          </div>
        ))}
      </div>

      {/* Document card */}
      <div className="hero-doc-card">
        <div className="hero-doc-row">
          <div className="hero-doc-icon"><PdfIcon /></div>
          <div>
            <div className="hero-doc-name">Form16_FY2024-25.pdf</div>
            <div className="hero-doc-sub">Uploaded · 342 KB</div>
          </div>
        </div>

        <div className="hero-doc-fields">
          {FIELDS.map((f, i) => (
            <div
              key={f.label}
              className="hero-doc-field"
              style={{
                opacity: i < revealed ? 1 : 0.18,
                transition: "opacity 0.4s ease",
              }}
            >
              <span className="hero-doc-field-label">{f.label}</span>
              <span className="hero-doc-field-val">{f.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="hero-stats-bar">
        <div className="hero-stat-item">
          <span className="hero-stat-num">14+</span>
          <span className="hero-stat-label">Years Expertise</span>
        </div>
        <div className="hero-stat-item">
          <span className="hero-stat-num">₹0</span>
          <span className="hero-stat-label">Penalties</span>
        </div>
        <div className="hero-stat-item">
          <span className="hero-stat-num">98%</span>
          <span className="hero-stat-label">Acceptance</span>
        </div>
      </div>
    </div>
  );
}
