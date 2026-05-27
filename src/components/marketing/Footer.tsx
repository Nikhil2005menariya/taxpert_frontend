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
    <footer className="mkt-footer">
      <div className="container mkt-footer-grid">
        <div className="mkt-footer-brand">
          <div className="mkt-footer-logo">TheTaxpert</div>
          <p>Your Personal Taxpert + Smart Compliance Platform</p>
          <a href="mailto:info@thetaxpert.com" className="mkt-footer-email">
            info@thetaxpert.com
          </a>
          <div className="mkt-footer-legal-links">
            {legalLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mkt-footer-heading">Services</h4>
          <ul className="mkt-footer-list">
            {serviceLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mkt-footer-heading">Quick Links</h4>
          <ul className="mkt-footer-list">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container mkt-footer-bottom">
        <p className="mkt-disclaimer">
          Services are provided by qualified professionals in compliance with
          applicable regulations. TheTaxpert is a compliance management
          platform — not a law firm or accounting firm.
        </p>
        <p className="mkt-copyright">
          &copy; 2026 TheTaxpert. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
