import { Link } from "react-router-dom";

interface CTABannerProps {
  isLoggedIn?: boolean;
}

export default function CTABanner({ isLoggedIn = false }: CTABannerProps) {
  const primaryHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <section className="section section-alt">
      <div className="container">
        <div className="mkt-cta-banner">
          <div className="mkt-cta-copy">
            <span className="section-kicker mkt-cta-kicker">
              Get Started Today
            </span>
            <h2>Start Filing Today</h2>
            <p>Upload your documents in minutes and move your tax work onto a smarter platform.</p>
          </div>
          <div className="hero-cta-row">
            <Link to={primaryHref} className="btn mkt-cta-btn-primary btn-large">
              Get Started Free
            </Link>
            <a
              href="mailto:info@thetaxpert.com"
              className="btn mkt-cta-btn-ghost btn-large"
            >
              Talk to a Taxpert
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
