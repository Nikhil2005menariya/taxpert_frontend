import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";
import { Navigate, useSearchParams } from "react-router-dom";
import CreateUserForm from "../../components/admin/CreateUserForm";
import UserRoleBadge from "../../components/admin/UserRoleBadge";
import ResetPasswordButton from "../../components/admin/ResetPasswordButton";

type ValidRole = "super_admin" | "admin" | "expert" | "ca" | "staff" | "client";

export default function AdminPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "clients";

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/users");
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: filingCountsData, isLoading: filingLoading } = useQuery({
    queryKey: ["admin-filing-counts"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/analytics/filing-counts");
      return res.data.data ?? {};
    },
    enabled: isAdmin,
  });

  if (authLoading || usersLoading || filingLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (tab === "permissions" && !isSuperAdmin) {
    return <Navigate to="/admin/users" replace />;
  }

  const allUsers = usersData ?? [];
  const filingCounts = filingCountsData ?? {};

  const clientUsers = allUsers.filter((u: any) => u.role === "client");
  const staffUsers = allUsers.filter((u: any) => u.role !== "client");

  const tabs = [
    { id: "clients", label: `Clients (${clientUsers.length})` },
    { id: "staff",   label: `Staff & Experts (${staffUsers.length})` },
    { id: "create",  label: "+ Create User" },
  ];

  return (
    <div className="adm-page">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="adm-kicker">
            {isSuperAdmin ? "Super Admin · Operations" : "Operations"}
          </p>
          <h1 className="page-title">Admin Panel</h1>
        </div>
        <div className="adm-header-stats">
          <div className="adm-hstat">
            <span>{allUsers.length}</span>Total Users
          </div>
          <div className="adm-hstat">
            <span>{clientUsers.length}</span>Clients
          </div>
          <div className="adm-hstat">
            <span>{staffUsers.length}</span>Staff
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="sa-banner">
          <span className="sa-badge">Super Admin</span>
          You have full platform control including role assignment.
        </div>
      )}

      <nav className="adm-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSearchParams({ tab: t.id })}
            className={`adm-tab${tab === t.id ? " adm-tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "clients" && (
        <section className="adm-section">
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Client Accounts</h2>
              <p className="adm-section-desc">
                All registered client accounts, their services, and Taxpert assignments.
              </p>
            </div>
            <button onClick={() => setSearchParams({ tab: "create" })} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>
              + Add Client
            </button>
          </div>

          {clientUsers.length === 0 ? (
            <div className="adm-empty">No clients registered yet.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>PAN</th>
                    <th>Mobile</th>
                    <th>Services</th>
                    <th>Completed</th>
                    <th>Since</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  {clientUsers.map((u: any) => {
                    const fc = filingCounts[u.id];
                    return (
                      <tr key={u.id}>
                        <td className="adm-name">
                          <div className="adm-avatar">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="adm-muted">{u.email}</td>
                        <td>
                          <code className="adm-code">{u.pan}</code>
                        </td>
                        <td className="adm-muted">{u.mobile || "—"}</td>
                        <td>
                          <span className="adm-count">{fc?.total ?? 0}</span>
                        </td>
                        <td>
                          <span
                            className="adm-count"
                            style={fc?.filed ? { background: "#f0fdf4", color: "#057a55" } : {}}
                          >
                            {fc?.filed ?? 0}
                          </span>
                        </td>
                        <td className="adm-muted">
                          {new Date(u.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td>
                          <ResetPasswordButton
                            userId={u.id}
                            userName={`${u.first_name} ${u.last_name}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "staff" && (
        <section className="adm-section">
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Staff & Experts</h2>
              <p className="adm-section-desc">
                Taxperts, staff, and admins.
                {isSuperAdmin
                  ? " As Super Admin, you can assign any role."
                  : " Use role badges to change access levels."}
              </p>
            </div>
            <button onClick={() => setSearchParams({ tab: "create" })} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>
              + Add Staff
            </button>
          </div>

          {staffUsers.length === 0 ? (
            <div className="adm-empty">No staff accounts yet.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>PAN</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Since</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((u: any) => {
                    return (
                      <tr key={u.id}>
                        <td className="adm-name">
                          <div className="adm-avatar">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="adm-muted">{u.email}</td>
                        <td>
                          <code className="adm-code">{u.pan}</code>
                        </td>
                        <td className="adm-muted">{u.mobile || "—"}</td>
                        <td>
                          <UserRoleBadge
                            userId={u.id}
                            currentRole={u.role as ValidRole}
                            viewerRole={(profile?.role ?? "admin") as ValidRole}
                          />
                        </td>
                        <td className="adm-muted">
                          {new Date(u.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td>
                          <ResetPasswordButton
                            userId={u.id}
                            userName={`${u.first_name} ${u.last_name}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}


      {tab === "create" && (
        <section className="adm-section">
          <h2 className="adm-section-title">Create New User</h2>
          <p className="adm-section-desc" style={{ marginBottom: "1.5rem" }}>
            Accounts created here are auto-confirmed and immediately ready for
            platform access.
          </p>
          <div className="adm-create-wrap">
            <div className="card">
              <CreateUserForm isSuperAdmin={isSuperAdmin} />
            </div>
          </div>
        </section>
      )}

      <style>{`
        .adm-page { padding-bottom: 3rem; }
        .adm-kicker { margin: 0 0 0.35rem; color: #2563eb; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }

        /* Super Admin banner */
        .sa-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          border: 1px solid #c7d2fe;
          border-radius: 0.875rem;
          padding: 0.75rem 1.1rem;
          font-size: 0.82rem;
          color: #4338ca;
          font-weight: 500;
          margin-bottom: 1.25rem;
        }
        .sa-badge {
          background: #4338ca;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        /* Header stats */
        .adm-header-stats { display: flex; gap: 0.65rem; flex-wrap: wrap; }
        .adm-hstat {
          background: #fff; border: 1px solid rgba(226,232,240,0.9);
          border-radius: 1rem; padding: 0.75rem 1.1rem;
          font-size: 0.75rem; color: #94a3b8; font-weight: 500;
          display: flex; flex-direction: column; gap: 0.15rem;
          min-width: 80px; box-shadow: 0 1px 4px rgba(15,23,42,0.04);
        }
        .adm-hstat span { font-size: 1.5rem; font-weight: 800; color: #0f172a; line-height: 1; }

        /* Tabs */
        .adm-tabs {
          display: flex; gap: 0.2rem; flex-wrap: wrap; margin-bottom: 1.75rem;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 0.875rem; padding: 0.28rem; width: fit-content;
        }
        .adm-tab {
          padding: 0.5rem 1.1rem; border-radius: 0.6rem;
          font-size: 0.82rem; font-weight: 500; color: #64748b;
          text-decoration: none !important; transition: background 0.15s, color 0.15s;
          white-space: nowrap; border: none; background: transparent; cursor: pointer;
        }
        .adm-tab:hover { color: #0f172a; background: rgba(255,255,255,0.8); }
        .adm-tab-active {
          background: #fff; color: #1d4ed8; font-weight: 600;
          box-shadow: 0 1px 6px rgba(15,23,42,0.1);
        }

        /* Section */
        .adm-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .adm-section-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 0 0 0.2rem; }
        .adm-section-desc { font-size: 0.82rem; color: #94a3b8; margin: 0; max-width: 60ch; }
        .adm-card-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; padding-bottom: 0.65rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.5rem; }

        /* Table */
        .adm-table-wrap {
          overflow-x: auto;
          border-radius: 1.1rem;
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 4px 20px rgba(15,23,42,0.05);
        }
        .adm-table { width: 100%; border-collapse: collapse; font-size: 0.845rem; background: #fff; }
        .adm-table thead tr {
          background: linear-gradient(to right, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
        }
        .adm-table th {
          text-align: left; padding: 0.75rem 1rem;
          color: #94a3b8; font-weight: 700; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap;
        }
        .adm-table td { padding: 0.9rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        .adm-table tbody tr { transition: background 0.12s; }
        .adm-table tbody tr:hover td { background: #f8fbff; }

        /* Table cells */
        .adm-name { display: flex; align-items: center; gap: 0.65rem; font-weight: 600; color: #0f172a; white-space: nowrap; }
        .adm-muted { color: #64748b; font-size: 0.82rem; }
        .adm-avatar {
          width: 34px; height: 34px; border-radius: 999px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8; display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800; flex-shrink: 0;
          box-shadow: 0 0 0 2px #fff, 0 0 0 3px #bfdbfe;
        }
        .adm-code {
          background: #f1f5f9; color: #475569;
          padding: 0.18rem 0.5rem; border-radius: 5px;
          font-size: 0.76rem; font-family: 'Courier New', monospace;
          white-space: nowrap; letter-spacing: 0.04em;
          border: 1px solid #e2e8f0;
        }
        .adm-count {
          background: #eff6ff; color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 999px; padding: 0.18rem 0.6rem;
          font-size: 0.76rem; font-weight: 700; display: inline-block;
        }
        .adm-expert-pill {
          background: #fff7ed; color: #c2410c;
          border: 1px solid #fed7aa;
          border-radius: 999px; padding: 0.2rem 0.65rem;
          font-size: 0.76rem; font-weight: 600; white-space: nowrap;
        }
        .adm-unassigned { color: #cbd5e1; font-size: 0.8rem; }

        /* Assignment layout */
        .adm-asgn-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 900px) { .adm-asgn-layout { grid-template-columns: 1fr; } }

        /* Create wrap */
        .adm-create-wrap { max-width: 560px; }

        /* Empty */
        .adm-empty {
          text-align: center; padding: 3rem 2rem; color: #94a3b8; font-size: 0.9rem;
          background: #fafafa; border: 1.5px dashed #e2e8f0; border-radius: 1.1rem;
        }
      `}</style>
    </div>
  );
}
