"use client";

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import RotatingText from "./RotatingText";

interface HeroProps {
  isLoggedIn?: boolean;
}

const LINE_A = ["Your", "personal"];
const LINE_C = ["built", "into", "a", "platform."];

const SERVICES = [
  "GST returns",
  "income tax",
  "TDS filings",
  "ROC compliance",
  "payroll",
  "company registration",
];

export default function Hero({ isLoggedIn = false }: HeroProps) {
  const primaryHref = isLoggedIn ? "/dashboard" : "/register";
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const words = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".lp-kw-inner"));
    const fades = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-hero-fade]"));
    const underline = root.querySelector<HTMLElement>(".lp-kw-underline");

    if (reduce) {
      gsap.set([...words, ...fades], { clearProps: "all" });
      if (underline) gsap.set(underline, { scaleX: 1 });
      return;
    }

    gsap.set(words, { yPercent: 115, opacity: 0 });
    gsap.set(fades, { y: 22, opacity: 0 });
    if (underline) gsap.set(underline, { scaleX: 0, transformOrigin: "left center" });

    const tweens: gsap.core.Tween[] = [];
    const raf = requestAnimationFrame(() => {
      tweens.push(
        gsap.to(words, { yPercent: 0, opacity: 1, duration: 0.95, ease: "power4.out", stagger: 0.07, delay: 0.1 })
      );
      if (underline) tweens.push(gsap.to(underline, { scaleX: 1, duration: 0.7, ease: "power2.inOut", delay: 0.75 }));
      tweens.push(
        gsap.to(fades, { y: 0, opacity: 1, duration: 0.85, ease: "power3.out", stagger: 0.14, delay: 0.55 })
      );
    });

    return () => {
      cancelAnimationFrame(raf);
      tweens.forEach((t) => t.kill());
    };
  }, []);

  const word = (w: string) => (
    <span className="lp-kw" key={w}>
      <span className="lp-kw-inner">{w}</span>
    </span>
  );

  return (
    <section className="lp-hero lp-hero--center" ref={rootRef}>
      <div className="lp-hero-glow" aria-hidden="true" />
      <div className="lp-hero-grid" aria-hidden="true" />
      <div className="lp-container lp-hero-inner">
        <h1 className="lp-hero-title">
          <span className="lp-kw-line">
            {LINE_A.map(word)}
            <span className="lp-kw lp-kw--accent">
              <span className="lp-kw-inner lp-hero-accent">
                Taxpert,
                <span className="lp-kw-underline" aria-hidden="true" />
              </span>
            </span>
          </span>
          <span className="lp-kw-line">{LINE_C.map(word)}</span>
        </h1>

        <p className="lp-hero-rot" data-hero-fade>
          <span className="lp-hero-rot-label">Now handling</span>
          <RotatingText words={SERVICES} className="lp-hero-rot-word" />
        </p>

        <p className="lp-hero-lead" data-hero-fade>
          Every compliance need — handled by qualified experts and tracked in one place.
        </p>

        <div className="lp-hero-cta" data-hero-fade>
          <Link to={primaryHref} className="lp-btn lp-btn--primary">
            Get started free
            <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <Link to="/services" className="lp-btn lp-btn--ghost">
            Explore services
          </Link>
        </div>
      </div>
    </section>
  );
}
