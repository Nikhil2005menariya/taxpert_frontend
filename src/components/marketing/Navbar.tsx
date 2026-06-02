"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ConsultationButton from "./ConsultationButton";

interface NavbarProps {
  isLoggedIn?: boolean;
}

const NAV_LINKS = [
  { label: "Services", to: "/#services" },
  { label: "How it works", to: "/#how-it-works" },
  { label: "FAQ", to: "/#faq" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar({ isLoggedIn = false }: NavbarProps) {
  const ctaHref = isLoggedIn ? "/dashboard" : "/register";
  const loginHref = isLoggedIn ? "/dashboard" : "/login";
  const loginLabel = isLoggedIn ? "Dashboard" : "Login";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sliding hover indicator ("glider")
  const listRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function movePill(i: number) {
    const el = itemRefs.current[i];
    if (!el) return;
    setPill({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
  }
  function hidePill() {
    setPill((p) => ({ ...p, opacity: 0 }));
  }

  return (
    <header className={`lp-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="lp-container lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label="TheTaxpert — home">
          <span className="lp-brand-the">The</span>
          <span className="lp-brand-name">Taxpert</span>
        </Link>

        <nav className="lp-nav-links" ref={listRef} onMouseLeave={hidePill}>
          <span
            className="lp-nav-glider"
            aria-hidden="true"
            style={{ left: pill.left, width: pill.width, opacity: pill.opacity }}
          />
          {NAV_LINKS.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              ref={(el) => { itemRefs.current[i] = el; }}
              onMouseEnter={() => movePill(i)}
              className="lp-nav-link"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="lp-nav-cta">
          <Link to={loginHref} className="lp-nav-login">
            {loginLabel}
          </Link>
          <ConsultationButton />
          <Link to={ctaHref} className="lp-btn lp-btn--primary lp-btn--sm">
            Get started
            <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button
            className="lp-nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lp-nav-mobile">
          <div className="lp-container">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}>
                {l.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            ))}
            <Link to={loginHref} onClick={() => setMenuOpen(false)}>
              {loginLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
