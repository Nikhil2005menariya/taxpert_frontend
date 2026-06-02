"use client";

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  {
    no: "01",
    tag: "Start",
    title: "Incorporate your business",
    desc: "Pick the right legal structure and get registered with the right governance from day one.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
    ),
    services: [
      { name: "Private Limited", price: "₹6,999" },
      { name: "LLP", price: "₹5,499" },
      { name: "Partnership Firm", price: "₹2,999" },
      { name: "Section 8 Company", price: "₹7,999" },
    ],
  },
  {
    no: "02",
    tag: "Register",
    title: "Get filing-ready",
    desc: "All the registrations and licenses that make your business compliant and ready to invoice.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><rect x="3" y="4" width="18" height="16" rx="2" /></svg>
    ),
    services: [
      { name: "GST Registration", price: "₹1,499" },
      { name: "MSME / Udyam", price: "₹999" },
      { name: "Trade License", price: "₹1,999" },
      { name: "Labour License", price: "₹2,499" },
    ],
  },
  {
    no: "03",
    tag: "Run",
    title: "Keep the books & payroll clean",
    desc: "Accurate accounting and on-time payroll, handled every month so nothing piles up.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg>
    ),
    services: [
      { name: "Monthly Accounting", price: "₹2,999/mo" },
      { name: "Payroll Processing", price: "₹1,999/mo" },
      { name: "PF, ESI, PT", price: "₹1,499/mo" },
      { name: "Annual Finalization", price: "₹4,999" },
    ],
  },
  {
    no: "04",
    tag: "File",
    title: "Stay on top of every return",
    desc: "GST, TDS and income-tax returns prepared, reviewed by your Taxpert and filed on time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>
    ),
    services: [
      { name: "GST Returns", price: "₹1,999/mo" },
      { name: "TDS Returns", price: "₹1,499/qtr" },
      { name: "ITR — Individuals", price: "₹999" },
      { name: "ITR — Companies", price: "₹4,999" },
    ],
  },
  {
    no: "05",
    tag: "Comply",
    title: "Annual & ROC compliance",
    desc: "Year-end statutory filings with MCA — done accurately, well before the deadline.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
    ),
    services: [
      { name: "AOC-4", price: "₹2,999" },
      { name: "MGT-7 / 7A", price: "₹2,499" },
      { name: "LLP Form 11", price: "₹1,499" },
      { name: "DIR-3 KYC", price: "₹999" },
    ],
  },
];

export default function LifecycleJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const fill = root.querySelector<HTMLElement>(".lp-journey-progress");
      if (fill) fill.style.transform = "scaleY(1)";
      return;
    }

    let st: ScrollTrigger | undefined;
    const raf = requestAnimationFrame(() => {
      const fill = root.querySelector<HTMLElement>(".lp-journey-progress");
      const track = root.querySelector<HTMLElement>(".lp-journey-rail");
      if (!fill || !track) return;
      gsap.set(fill, { scaleY: 0, transformOrigin: "top center" });
      st = ScrollTrigger.create({
        trigger: track,
        start: "top 70%",
        end: "bottom 75%",
        scrub: 0.6,
        onUpdate: (self) => gsap.set(fill, { scaleY: self.progress }),
      });
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(raf);
      st?.kill();
    };
  }, []);

  return (
    <section id="services" className="lp-section lp-journey" ref={rootRef}>
      <div className="lp-container">
        <div className="lp-svc-head">
          <div className="lp-intro" data-reveal>
            <span className="lp-eyebrow">Your compliance lifecycle</span>
            <h2 className="lp-h2">
              We&apos;re with you at every stage —<br />
              from incorporation to every annual filing.
            </h2>
          </div>
          <Link to="/services" className="lp-svc-browse" data-reveal>
            Browse all services
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>

        <div className="lp-journey-rail">
          <span className="lp-journey-track" aria-hidden="true">
            <span className="lp-journey-progress" />
          </span>

          {STAGES.map((s) => (
            <div className="lp-journey-step" data-reveal key={s.no}>
              <div className="lp-journey-marker">
                <span className="lp-journey-icon">{s.icon}</span>
              </div>
              <div className="lp-journey-card">
                <div className="lp-journey-card-head">
                  <span className="lp-journey-no">{s.no}</span>
                  <span className="lp-journey-tag">{s.tag}</span>
                </div>
                <h3 className="lp-journey-title">{s.title}</h3>
                <p className="lp-journey-desc">{s.desc}</p>
                <div className="lp-journey-services">
                  {s.services.map((svc) => (
                    <span className="lp-journey-chip" key={svc.name}>
                      {svc.name}
                      <span className="lp-journey-price">from {svc.price}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
