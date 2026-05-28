import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  isAdmin: boolean;
  isClient: boolean;
  isTexpert: boolean;
  expertFirstName?: string | null;
  expertLastName?: string | null;
  expertRole?: string | null;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// Inline SVG icons
function IconTrending() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>
    </svg>
  );
}
function IconCheckSquare() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}
function IconFolder() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6"/>
    </svg>
  );
}
function IconTasks() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>
    </svg>
  );
}
function IconCreditCard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l10 10 10-10L12 2z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/>
      <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function IconDiscount() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 15 8"/><circle cx="9.5" cy="8.5" r=".5" fill="currentColor"/><circle cx="14.5" cy="13.5" r=".5" fill="currentColor"/>
      <path d="M3 7c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/>
    </svg>
  );
}
function IconActivity() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function IconInbox() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
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
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  );
}


const Logo = () => (
  <Link to="/dashboard" className="db-sidebar-logo-link" aria-label="Go to dashboard">
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ink-900)"/>
      <path d="M8 11h16M16 11v13" stroke="var(--gold-400)" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="24" cy="22" r="2.5" stroke="var(--paper)" strokeWidth="1.5"/>
    </svg>
  </Link>
);

export default function DashboardSidebar({
  isAdmin,
  isClient,
  isTexpert,
  expertFirstName,
  expertLastName,
  expertRole,
}: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NavItem = { href: string; label: string; Icon: any; exact: boolean; badge: null; comingSoon?: boolean };
  const nav: NavItem[] = [
    { href: "/dashboard",   label: "Overview",   Icon: IconTrending,  exact: true,  badge: null },
    ...(isClient ? [{ href: "/my-services", label: "My Services", Icon: IconGlobe, exact: false, badge: null }] : []),
    ...(isClient ? [{ href: "/vault",       label: "My Vault",    Icon: IconShield,   exact: false, badge: null }] : []),
    ...(isClient ? [{ href: "/due-dates",   label: "Due Dates",   Icon: IconCalendar,  exact: false, badge: null }] : []),
    ...(isClient || isAdmin ? [{ href: "/payments",  label: "Payments",  Icon: IconCreditCard, exact: false, badge: null }] : []),
    ...(isClient ? [{ href: "/referrals",   label: "Refer & Earn",Icon: IconGift,      exact: false, badge: null }] : []),
    ...(isClient ? [{ href: "/profile",     label: "Profile",     Icon: IconUser,      exact: false, badge: null }] : []),

    // Taxpert items
    ...(isTexpert
      ? [
          { href: "/texpert/services", label: "My Services",  Icon: IconClipboard, exact: false, badge: null },
          { href: "/queue",            label: "Queue",         Icon: IconInbox,     exact: false, badge: null },
        ]
      : []),

    // Staff (legacy) items
    ...(expertRole === "staff" || expertRole === "admin" || expertRole === "super_admin"
      ? [
          { href: "/work-queue", label: "Work Queue", Icon: IconTasks,       exact: false, badge: null },
          { href: "/workload",   label: "Workload",   Icon: IconCheckSquare, exact: false, badge: null },
        ]
      : []),

    // Admin items
    ...(isAdmin
      ? [
          { href: "/admin/taxperts",         label: "Taxperts",       Icon: IconUsers,     exact: false, badge: null },
          { href: "/admin/clients",          label: "Clients",        Icon: IconUser,      exact: false, badge: null },
          { href: "/queue",                  label: "Queue",          Icon: IconInbox,     exact: true,  badge: null },
          { href: "/admin/payouts",          label: "Payouts",        Icon: IconDollar,    exact: false, badge: null },
          { href: "/admin/services",         label: "Services",       Icon: IconGlobe,     exact: false, badge: null },
          { href: "/admin/document-types",   label: "Doc Types",      Icon: IconFolder,    exact: false, badge: null },
          { href: "/admin/pricing",          label: "Pricing",        Icon: IconTag,       exact: false, badge: null },
          { href: "/admin/coupons",          label: "Coupons",        Icon: IconDiscount,  exact: false, badge: null },
          { href: "/admin/settings/invoice", label: "Invoice",        Icon: IconBuilding,  exact: false, badge: null },
          { href: "/admin/notify",           label: "Notify",         Icon: IconBell,      exact: false, badge: null },
          { href: "/admin/audit",            label: "Audit Log",      Icon: IconActivity,  exact: false, badge: null },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "Users & Ops", Icon: IconBuilding, exact: true, badge: null }] : []),
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    // Exact match for /admin to avoid sub-routes marking it active
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const expertAvatar = expertFirstName && expertLastName
    ? initials(expertFirstName, expertLastName)
    : "AP";
  const expertDisplayName = expertFirstName && expertLastName
    ? `${expertFirstName} ${expertLastName}`
    : "Your Taxpert";
  const expertDisplayRole = expertRole ?? "Taxpert";

  return (
    <aside className="db-sidebar">
      {/* Brand */}
      <div className="db-sidebar-brand">
        <Logo />
        <span className="db-sidebar-brand-name">TheTaxpert</span>
      </div>

      {/* Nav */}
      <nav className="db-sidebar-nav">
        {nav.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`db-nav-item${active ? " db-nav-item-active" : ""}`}
            >
              <span className="db-nav-icon">
                <item.Icon />
              </span>
              <span className="db-nav-label">{item.label}</span>
              {item.badge != null && (
                <span className="db-nav-badge">{item.badge}</span>
              )}
              {"comingSoon" in item && item.comingSoon && (
                <span className="db-nav-soon">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="db-sidebar-footer">
        {/* Show assigned expert card only for clients who have an expert */}
        {isClient && expertFirstName && (
          <div className="db-taxpert-card">
            <span className="db-taxpert-eyebrow">Your Taxpert</span>
            <div className="db-taxpert-row">
              <div className="db-taxpert-avatar">{expertAvatar}</div>
              <div className="db-taxpert-info">
                <div className="db-taxpert-name">{expertDisplayName}</div>
                <div className="db-taxpert-role">{expertDisplayRole}</div>
              </div>
            </div>
            <a href="mailto:info@thetaxpert.com" className="db-taxpert-msg-btn">
              Send a message
            </a>
          </div>
        )}

      </div>
    </aside>
  );
}
