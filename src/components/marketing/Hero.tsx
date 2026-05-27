import { Link } from "react-router-dom";
import HeroVisual from "./HeroVisual";

interface HeroProps {
  isLoggedIn?: boolean;
}

export default function Hero({ isLoggedIn = false }: HeroProps) {
  const primaryHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <section className="mkt-hero">
      <div className="container hero-layout">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            New · Form 16 auto-extraction
          </div>
          <h1 className="hero-headline">
            Your personal <em>Taxpert</em>,<br />
            built into a platform.
          </h1>
          <p className="hero-lead">
            From company registration to ITR filing — manage everything with
            automation and Taxpert review. Upload once, stay compliant always.
          </p>
          <div className="hero-cta-row">
            <Link to={primaryHref} className="btn btn-primary btn-large">
              Get Started Free
            </Link>
            <a
              href="mailto:info@thetaxpert.com"
              className="btn btn-ghost btn-large"
            >
              Talk to a Taxpert
            </a>
          </div>
          <div className="hero-trust-pills">
            <span>Secure document vault</span>
            <span>Taxpert-reviewed filings</span>
            <span>End-to-end compliance</span>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
