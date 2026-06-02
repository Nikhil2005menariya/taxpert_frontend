import { Link } from "react-router-dom";

const serviceLinks = [
  { label: "Incorporations", href: "/services#incorporations" },
  { label: "Registrations", href: "/services#registrations" },
  { label: "Accounting & Bookkeeping", href: "/services#accounting-bookkeeping" },
  { label: "GST Filings", href: "/services#gst-filings" },
  { label: "Income Tax Filings", href: "/services#income-tax-filings" },
  { label: "TDS Compliance", href: "/services#tds-compliance" },
  { label: "ROC Compliance", href: "/services#roc-compliance-companies" },
  { label: "Other Services", href: "/services#other-services" },
];

const quickLinks = [
  { label: "All Services", href: "/services" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
  { label: "Login", href: "/login" },
  { label: "Sign Up", href: "/register" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Disclaimer", href: "/disclaimer" },
];

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <Link to="/" className="lp-brand lp-footer-brand-mark">
              <span className="lp-brand-mark"><span>T</span></span>
              TheTaxpert
            </Link>
            <p className="lp-footer-tag">
              Your personal Taxpert plus a smart compliance platform — built for
              individuals and businesses across India.
            </p>
            <a href="mailto:info@thetaxpert.com" className="lp-footer-email">
              info@thetaxpert.com
            </a>
            <div className="lp-footer-legal">
              {legalLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="lp-footer-heading">Services</h4>
            <ul className="lp-footer-list">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="lp-footer-heading">Quick Links</h4>
            <ul className="lp-footer-list">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p className="lp-footer-disclaimer">
            Services are provided by qualified professionals in compliance with
            applicable regulations. TheTaxpert is a compliance management
            platform — not a law firm or accounting firm.
          </p>
          <p className="lp-footer-copy">© 2026 TheTaxpert. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
