"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import LottieIcon from "./LottieIcon";
import checkCircle from "../../assets/lottie/check-circle.json";

const FEED = [
  { name: "GSTR-3B", period: "March", status: "Filed", tone: "done" },
  { name: "TDS Return", period: "Q4 · FY24-25", status: "Filed", tone: "done" },
  { name: "Income Tax", period: "FY 2024-25", status: "In review", tone: "review" },
  { name: "AOC-4", period: "Annual · ROC", status: "Scheduled", tone: "queued" },
];

const R = 52;
const CIRC = 2 * Math.PI * R;

export default function HeroVisual() {
  const cardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const card = cardRef.current;
    const ring = ringRef.current;
    const num = numRef.current;
    const rows = card ? gsap.utils.toArray<HTMLElement>(card.querySelectorAll(".lp-hv2-row")) : [];

    if (ring) gsap.set(ring, { strokeDasharray: CIRC, strokeDashoffset: reduce ? 0 : CIRC });
    if (num) num.textContent = reduce ? "100" : "0";

    if (reduce) return;

    if (card) gsap.set(card, { opacity: 0, y: 26, rotateX: 7, rotateY: -9 });
    gsap.set(rows, { opacity: 0, x: 16 });

    const tweens: gsap.core.Tween[] = [];
    const raf = requestAnimationFrame(() => {
      if (card) {
        tweens.push(
          gsap.to(card, {
            opacity: 1, y: 0, rotateX: 0, rotateY: 0,
            duration: 1.0, ease: "power3.out", clearProps: "transform,opacity",
          })
        );
      }
      if (ring) {
        tweens.push(gsap.to(ring, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", delay: 0.3 }));
      }
      if (num) {
        const o = { v: 0 };
        tweens.push(
          gsap.to(o, {
            v: 100, duration: 1.6, delay: 0.3, ease: "power2.inOut",
            onUpdate: () => { num.textContent = String(Math.round(o.v)); },
            onComplete: () => { num.textContent = "100"; },
          })
        );
      }
      tweens.push(gsap.to(rows, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.13, delay: 0.5 }));
    });

    return () => {
      cancelAnimationFrame(raf);
      tweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="lp-hv2-wrap">
      <div className="lp-hv2-blob" aria-hidden="true" />

      <div className="lp-hv2" ref={cardRef} role="img" aria-label="Compliance health dashboard: all filings on track, reviewed by a dedicated Taxpert">
        <div className="lp-hv2-head">
          <span className="lp-hv2-title">
            <span className="lp-dot lp-dot--green" />
            Compliance health
          </span>
          <span className="lp-hv2-badge">All on track</span>
        </div>

        <div className="lp-hv2-body">
          <div className="lp-hv2-ring">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="lp-hv2-ring-track" cx="60" cy="60" r={R} />
              <circle
                className="lp-hv2-ring-prog" cx="60" cy="60" r={R}
                ref={ringRef} transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="lp-hv2-ring-center">
              <strong><span ref={numRef}>0</span>%</strong>
              <span>compliant</span>
            </div>
          </div>

          <div className="lp-hv2-feed">
            {FEED.map((f) => (
              <div className="lp-hv2-row" key={f.name}>
                <div className="lp-hv2-row-main">
                  <span className="lp-hv2-row-name">{f.name}</span>
                  <span className="lp-hv2-row-period">{f.period}</span>
                </div>
                <span className={`lp-hv2-pill lp-hv2-pill--${f.tone}`}>
                  {f.tone === "done" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-hv2-foot">
          <span className="lp-hv2-avatar">A</span>
          <span className="lp-hv2-foot-text">
            Reviewed by <strong>Anjali</strong> — your dedicated Taxpert
          </span>
        </div>
      </div>

      <LottieIcon data={checkCircle} className="lp-hv2-stamp" />
      <span className="lp-hv2-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
        Next due · 20 Jun
      </span>
    </div>
  );
}
