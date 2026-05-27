import { Link } from "react-router-dom";
import ConsultationButton from "./ConsultationButton";

interface NavbarProps {
  isLoggedIn?: boolean;
}

export default function Navbar({ isLoggedIn = false }: NavbarProps) {
  const ctaHref = isLoggedIn ? "/dashboard" : "/register";
  const loginHref = isLoggedIn ? "/dashboard" : "/login";
  const loginLabel = isLoggedIn ? "Dashboard" : "Login";

  return (
    <header className="mkt-nav">
      <div className="container mkt-nav-inner">
        <Link to="/" className="mkt-nav-brand">
          TheTaxpert
        </Link>

        <nav className="mkt-nav-links">
          <Link to="/#services">Services</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
          <Link to={loginHref}>{loginLabel}</Link>
        </nav>

        <div className="mkt-nav-cta">
          <a href="https://wa.me/919XXXXXXXXX" target="_blank" rel="noopener noreferrer" className="mkt-nav-phone">
            +91-XXXXXXXXXX
          </a>
          <ConsultationButton />
          <Link to={ctaHref} className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
