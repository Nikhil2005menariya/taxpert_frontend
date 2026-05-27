
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import MobileNav from "../components/dashboard/MobileNav";
import AddServiceModal from "../components/dashboard/AddServiceModal";
import TopbarUserMenu from "../components/dashboard/TopbarUserMenu";
import IdleSessionGuard from "../guards/IdleSessionGuard";

function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'ca': return 'Taxpert';
    case 'ops': return 'Operations';
    case 'client': return 'Client';
    default: return 'User';
  }
}

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

export default function DashboardLayout() {
  const { profile, user } = useAuth();

  const role = profile?.role ?? "client";
  const isAdmin = isAdminRole(role);
  const isClient = role === "client";
  const roleLabel = getRoleLabel(role);

  // In the real app, we might want to fetch expert assignments using TanStack Query.
  // For the layout, we can default to null and let specific dashboard pages load more detail.
  // We'll leave it as null for now, as it can be expanded later when we implement the query.
  const expertFirstName: string | null = null;
  const expertLastName: string | null = null;
  const expertRole: string | null = null;

  const sharedProps = {
    firstName: profile?.first_name || user?.user_metadata?.first_name || "",
    lastName: profile?.last_name || user?.user_metadata?.last_name || "",
    role,
    roleLabel,
    isAdmin,
    isClient,
    expertFirstName,
    expertLastName,
    expertRole,
  };

  return (
    <div className="db-shell">
      <DashboardSidebar {...sharedProps} />
      <div className="db-right-col">
        {/* Topbar */}
        <div className="db-topbar">
          {/* Left: mobile hamburger + Add Service */}
          <div className="db-topbar-left">
            <MobileNav
              firstName={sharedProps.firstName}
              lastName={sharedProps.lastName}
              role={sharedProps.role}
              roleLabel={sharedProps.roleLabel}
              isAdmin={sharedProps.isAdmin}
              isClient={sharedProps.isClient}
              expertFirstName={sharedProps.expertFirstName}
              expertLastName={sharedProps.expertLastName}
              expertRole={sharedProps.expertRole}
            />
            {isClient && <AddServiceModal />}
          </div>

          {/* Right: notification bell + user menu */}
          <div className="db-topbar-right">
            <div className="db-topbar-bell" title="Notifications coming soon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" /><path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </div>
            <div className="db-topbar-divider" />
            <TopbarUserMenu
              firstName={profile?.first_name ?? ""}
              lastName={profile?.last_name ?? ""}
              roleLabel={roleLabel}
            />
          </div>
        </div>

        <main className="db-main">
          <Outlet />
        </main>
        {/* Session inactivity guard — 25min timeout, 5min warning */}
        <IdleSessionGuard />
      </div>
    </div>
  );
}
