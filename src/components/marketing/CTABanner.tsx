import { Link } from "react-router-dom";
import LottieIcon from "./LottieIcon";
import checkCircle from "../../assets/lottie/check-circle.json";

interface CTABannerProps {
  isLoggedIn?: boolean;
}

export default function CTABanner({ isLoggedIn = false }: CTABannerProps) {
  const primaryHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <section className="lp-cta-wrap">
      <div className="lp-container">
        <div className="lp-cta" data-reveal>
          <LottieIcon data={checkCircle} className="lp-cta-lottie" />
          <div className="lp-cta-inner">
            <span className="lp-eyebrow" style={{ justifyContent: "center" }}>Get started today</span>
            <h2>Put your compliance on autopilot.</h2>
            <p>
              Tell us what you need and get matched with a dedicated Taxpert today.
              Fixed pricing, real experts, zero missed deadlines.
            </p>
            <div className="lp-cta-row">
              <Link to={primaryHref} className="lp-btn lp-btn--accent">
                Get started free
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <a href="mailto:info@thetaxpert.com" className="lp-btn lp-btn--ghost">
                Talk to a Taxpert
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
