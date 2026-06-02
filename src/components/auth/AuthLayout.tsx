import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import RotatingText from "../marketing/RotatingText";

/**
 * Split-screen auth chrome: animated dark brand panel (left) + form area
 * (right). Used by Login, Register and Reset Password. Lives inside `.lp` so
 * it inherits the editorial design tokens.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lp lp-auth">
      {/* ── Brand showcase ── */}
      <aside className="lp-auth-aside">
        <div className="lp-auth-aside-grid" />
        <div className="lp-auth-aside-glow" />

        <div className="lp-auth-aside-inner">
          <Link to="/" className="lp-auth-brand">
            <span className="lp-auth-brand-the">The</span>
            <span className="lp-auth-brand-name">Taxpert</span>
          </Link>

          <div className="lp-auth-aside-mid">
            <h2 className="lp-auth-headline">
              Compliance,
              <br />
              <span className="lp-auth-headline-accent">handled.</span>
            </h2>
            <p className="lp-auth-rotate">
              One platform for{" "}
              <RotatingText words={["GST returns", "income tax", "TDS filings", "ROC compliance", "payroll", "registrations"]} />
            </p>
          </div>
        </div>
      </aside>

      {/* ── Form area ── */}
      <main className="lp-auth-main">
        <div className="lp-auth-topbar">
          <Link to="/" className="lp-auth-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Back to home
          </Link>
          {/* compact brand — only shows when the aside is hidden (mobile) */}
          <Link to="/" className="lp-auth-brand lp-auth-brand--compact">
            <span className="lp-auth-brand-the">The</span>
            <span className="lp-auth-brand-name">Taxpert</span>
          </Link>
        </div>

        <div className="lp-auth-form-wrap">{children}</div>

        <div className="lp-auth-foot">
          <span>© {new Date().getFullYear()} TheTaxpert</span>
          <a href="mailto:info@thetaxpert.com">Need help?</a>
        </div>
      </main>
    </div>
  );
}
