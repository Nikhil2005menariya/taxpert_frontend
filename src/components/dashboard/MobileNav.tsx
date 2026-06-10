import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandMark from "../ui/BrandMark";

interface MobileNavProps {
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  isAdmin: boolean;
  isClient: boolean;
  isTexpert?: boolean;
  expertFirstName?: string | null;
  expertLastName?: string | null;
  expertRole?: string | null;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconTrending() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l10 10 10-10L12 2z" /><circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconDiscount() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 15 8" /><circle cx="9.5" cy="8.5" r=".5" fill="currentColor" /><circle cx="14.5" cy="13.5" r=".5" fill="currentColor" />
      <path d="M3 7c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavItem = { href: string; label: string; Icon: any; exact: boolean };

export default function MobileNav({
  firstName,
  lastName,
  roleLabel,
  isAdmin,
  isClient,
  isTexpert,
  expertFirstName,
  expertLastName,
  expertRole,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  const isStaffOrAdmin = !isClient;

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const nav: NavItem[] = [
    // Dashboard home — role-specific so active state highlights correctly
    ...(isClient  ? [{ href: "/client/dashboard",  label: "Overview", Icon: IconTrending, exact: true }] : []),
    ...(isTexpert ? [{ href: "/texpert/dashboard", label: "Overview", Icon: IconTrending, exact: true }] : []),
    ...(isAdmin   ? [{ href: "/admin",             label: "Overview", Icon: IconTrending, exact: true }] : []),

    // Client-only items
    ...(isClient ? [
      { href: "/client/services",  label: "My Services",  Icon: IconGlobe,      exact: false },
      { href: "/client/vault",     label: "Vault",        Icon: IconFolder,     exact: false },
      { href: "/client/due-dates", label: "Due Dates",    Icon: IconCalendar,   exact: false },
      { href: "/client/payments",  label: "Payments",     Icon: IconCreditCard, exact: false },
      { href: "/client/referrals", label: "Refer & Earn", Icon: IconGift,       exact: false },
      { href: "/profile",          label: "Profile",      Icon: IconUser,       exact: false },
    ] : []),

    // Texpert items
    ...(isTexpert ? [
      { href: "/texpert/services", label: "My Services", Icon: IconFolder,     exact: false },
      { href: "/texpert/queue",    label: "Queue",        Icon: IconCalendar,  exact: false },
      { href: "/profile",          label: "Profile",      Icon: IconUser,      exact: false },
    ] : []),

    // Staff / Expert items (legacy)
    ...(!isClient && !isTexpert && !isAdmin ? [
      { href: "/workload",   label: "Workload",   Icon: IconFolder,   exact: false },
      { href: "/work-queue", label: "Work Queue", Icon: IconCalendar, exact: false },
    ] : []),

    // Admin-only
    ...(isAdmin ? [
      { href: "/admin/client-services", label: "Services",  Icon: IconFolder,     exact: false },
      { href: "/admin/queue",           label: "Queue",     Icon: IconCalendar,   exact: false },
      { href: "/admin/payments",        label: "Payments",  Icon: IconCreditCard, exact: false },
      { href: "/admin/coupons",         label: "Coupons",   Icon: IconDiscount,   exact: false },
    ] : []),
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const expertDisplayName = expertFirstName && expertLastName
    ? `${expertFirstName} ${expertLastName}`
    : "Your Taxpert";
  const expertDisplayRole = expertRole ?? "Taxpert";
  const expertAvatar = expertFirstName && expertLastName
    ? initials(expertFirstName, expertLastName)
    : "AP";

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="db-mobile-menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <IconMenu />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="db-mobile-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div className={`db-mobile-drawer${open ? " db-mobile-drawer-open" : ""}`} aria-hidden={!open}>
        {/* Drawer header */}
        <div className="db-mobile-drawer-header">
          <span className="db-mobile-drawer-brand">
            <BrandMark size={26} />
            TheTaxpert
          </span>
          <button
            className="db-mobile-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <IconX />
          </button>
        </div>

        {/* User identity */}
        <div className="db-mobile-identity">
          <div className="db-mobile-avatar">{initials(firstName, lastName)}</div>
          <div>
            <div className="db-mobile-name">{firstName} {lastName}</div>
            <div className="db-mobile-role">{roleLabel}</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="db-mobile-nav">
          {nav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`db-mobile-nav-item${active ? " db-mobile-nav-item-active" : ""}`}
              >
                <span className="db-mobile-nav-icon"><item.Icon /></span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Your Taxpert — clients only, when assigned */}
        {isClient && expertFirstName && (
          <div className="db-mobile-taxpert">
            <span className="db-mobile-taxpert-label">Your Taxpert</span>
            <div className="db-mobile-taxpert-row">
              <div className="db-mobile-taxpert-avatar">{expertAvatar}</div>
              <div>
                <div className="db-mobile-taxpert-name">{expertDisplayName}</div>
                <div className="db-mobile-taxpert-role">{expertDisplayRole}</div>
              </div>
            </div>
            <a href="mailto:info@thetaxpert.com" className="db-mobile-msg-btn">
              Contact TheTaxpert
            </a>
          </div>
        )}
      </div>
    </>
  );
}
