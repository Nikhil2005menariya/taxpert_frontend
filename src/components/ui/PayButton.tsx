import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface PayButtonProps {
  /** react-router target — renders a <Link> */
  to?: string;
  /** plain href — renders an <a> */
  href?: string;
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const ico = (cls: string, paths: ReactNode) => (
  <svg className={`lp-paybtn-ico ${cls}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

/**
 * Premium "Pay now" button (CSS-only). On hover the payment glyphs cycle;
 * on press a checkmark confirms. Adapted from a Uiverse pattern.
 */
export default function PayButton({ to, href, onClick, label = "Pay now", disabled, className }: PayButtonProps) {
  const inner = (
    <>
      <span className="lp-paybtn-icons">
        {ico("lp-paybtn-wallet lp-paybtn-default", <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>)}
        {ico("lp-paybtn-card", <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>)}
        {ico("lp-paybtn-payment", <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>)}
        {ico("lp-paybtn-dollar", <><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>)}
        {ico("lp-paybtn-check", <path d="M20 6 9 17l-5-5" />)}
      </span>
      <span className="lp-paybtn-text">{label}</span>
    </>
  );

  const cls = `lp-paybtn${className ? " " + className : ""}`;

  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{inner}</button>;
}
