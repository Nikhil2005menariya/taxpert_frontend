import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";
import AddServiceModal from "../../../components/dashboard/AddServiceModal";
import TexpertDashboardPage from "../../texpert/TexpertDashboardPage";

// Types
type ServiceStatus = "pending" | "documents_required" | "under_review" | "in_progress" | "action_required" | "completed" | "cancelled";

const SERVICE_STATUS_SHORT_LABELS: Record<ServiceStatus, string> = {
  pending: "Pending",
  documents_required: "Docs Needed",
  under_review: "Reviewing",
  in_progress: "In Progress",
  action_required: "Action Needed",
  completed: "Done",
  cancelled: "Cancelled",
};

const SERVICE_STATUS_STYLES: Record<ServiceStatus, { fg: string; bg: string }> = {
  pending:            { fg: "#b45309", bg: "#fef3c7" },
  documents_required: { fg: "#b45309", bg: "#fef3c7" },
  under_review:       { fg: "#1d4ed8", bg: "#dbeafe" },
  in_progress:        { fg: "#1d4ed8", bg: "#dbeafe" },
  action_required:    { fg: "#be123c", bg: "#ffe4e6" },
  completed:          { fg: "#15803d", bg: "#dcfce7" },
  cancelled:          { fg: "#6b7280", bg: "#f3f4f6" },
};

function currentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`; // e.g. 2024-25
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

function fmtRelative(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatCard({ label, value, sub, tone }: {
  label: string; value: string | number; sub: string;
  tone?: "urgent" | "gold" | "good" | "default";
}) {
  const tones = {
    urgent:  { fg: "var(--red-600)",   bg: "rgba(182,69,69,0.08)" },
    gold:    { fg: "var(--gold-700)",  bg: "rgba(196,154,58,0.1)" },
    good:    { fg: "var(--green-600)", bg: "rgba(47,122,91,0.08)" },
    default: { fg: "var(--ink-500)",   bg: "var(--ink-50)" },
  };
  const t = tones[tone ?? "default"];
  return (
    <div className="db-stat-card-new">
      <div className="db-stat-card-label">{label}</div>
      <div className="db-stat-card-value">{value}</div>
      <div className="db-stat-card-sub" style={{ background: t.bg, color: t.fg }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, user } = useAuth();

  const { data: summary, error, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/client-services/dashboard');
      return data.data; // backend returns { data: { kind, ... } }
    },
  });

  if (isLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (error && !summary) {
    return (
      <div className="db-page-new">
        <div className="db-alert-error" style={{ marginTop: "2rem" }}>
          Could not load dashboard data: {(error as any)?.response?.data?.error ?? (error as any)?.message ?? "Unknown error"}
          <button onClick={() => window.location.reload()} style={{ marginLeft: "1rem", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Retry</button>
        </div>
      </div>
    );
  }

  const role      = profile?.role ?? "client";
  const isClient  = role === "client";
  const firstName = profile?.first_name || user?.user_metadata?.first_name || "there";

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── STAFF / ADMIN VIEW ─────────────────────────────────────
  if (!isClient) {
    const s = summary?.kind === "staff" ? summary : null;
    return (
      <div className="db-page-new">
        <div className="db-welcome">
          <span className="db-welcome-eyebrow">{greeting}</span>
          <h1 className="db-welcome-heading">Welcome back, <em>Team</em>.</h1>
          <p className="db-welcome-sub">Platform overview — open Workload for the full service queue.</p>
        </div>

        {error && <div className="db-alert-error">Failed to load summary: {(error as any).message}</div>}

        <div className="db-stat-grid">
          <StatCard label="Total services"   value={s?.total ?? 0}         sub="All time"             tone="default" />
          <StatCard label="Active pipeline"  value={s?.active ?? 0}        sub={s?.active ? "In progress" : "All clear"} tone={s?.active ? "gold" : "good"} />
          <StatCard label="Docs required"    value={s?.needsDocs ?? 0}     sub={s?.needsDocs ? "Awaiting client upload" : "None pending"} tone={s?.needsDocs ? "urgent" : "good"} />
          <StatCard label="Invoice pending"  value={s?.invoicePending ?? 0} sub={s?.invoicePending ? "Awaiting payment" : "None"} tone={s?.invoicePending ? "gold" : "default"} />
        </div>

        <div className="db-bottom-grid">
          <div className="db-activity-card">
            <div className="db-activity-header">
              <span className="db-activity-title">Service Workload</span>
            </div>
            <div style={{ padding: "1.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--ink-400)", fontSize: "0.875rem", margin: "0 0 1rem" }}>
                Full client service list with search, filters, SLA risk, and doc progress.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/my-services" className="btn btn-primary">
                  Open Workload →
                </Link>
                <Link to="/work-queue" className="btn btn-secondary">
                  Task Queue →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CLIENT VIEW ────────────────────────────────────────────
  const s = summary?.kind === "client" ? summary : null;
  const all          = s?.all ?? [];
  const active       = s?.active ?? [];
  const docsRequired = s?.docsRequired ?? [];
  const totalPendingDocs = s?.totalPendingDocs ?? 0;

  return (
    <div className="db-page-new">
      {/* Welcome & Add Service Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div className="db-welcome">
          <span className="db-welcome-eyebrow">{greeting}</span>
          <h1 className="db-welcome-heading">
            Welcome back, <em>{firstName}</em>.
          </h1>
          <p className="db-welcome-sub">
            {totalPendingDocs > 0
              ? `${totalPendingDocs} document${totalPendingDocs !== 1 ? "s" : ""} waiting for upload.`
              : all.length > 0
                ? "All your services are up to date."
                : "Add a service to get started."}
          </p>
        </div>
        {isClient && (
          <div style={{ marginBottom: "0.25rem" }}>
            <AddServiceModal />
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="db-stat-grid">
        <StatCard label="Docs to upload"  value={totalPendingDocs}   sub={totalPendingDocs > 0 ? "Upload via Vault" : "All uploaded"}         tone={totalPendingDocs > 0 ? "urgent" : "good"} />
        <StatCard label="Active services" value={active.length}      sub={active.length > 0 ? `${docsRequired.length} need docs` : "None active"} tone={active.length > 0 ? "gold" : "default"} />
        <StatCard label="Completed"       value={s?.completed ?? 0}  sub={s?.completed ? "Services finalised" : "None yet"}                   tone={s?.completed ? "good" : "default"} />
        <StatCard label="Total services"  value={s?.total ?? 0}      sub="All time" />
      </div>

      {error && <div className="db-alert-error">Failed to load services: {(error as any).message}</div>}

      {/* Client empty state */}
      {!all.length && (
        <div className="db-empty-card">
          <div className="db-empty-icon">📋</div>
          <h3 className="db-empty-title">No services yet</h3>
          <p className="db-empty-desc">
            Click <strong>+ Add Service</strong> in the top-right to get started. Your assigned Taxpert will guide you through the rest.
          </p>
          <div className="db-empty-steps">
            <div className="db-empty-step"><span>1</span>Add a service</div>
            <div className="db-empty-step"><span>2</span>Upload required documents in Vault</div>
            <div className="db-empty-step"><span>3</span>We review it and complete the service</div>
          </div>
          <div className="db-empty-actions">
            <Link to="/services" className="btn btn-primary">Browse Services →</Link>
            <a href="mailto:info@thetaxpert.com" className="btn btn-secondary">Talk to a Taxpert</a>
          </div>
        </div>
      )}

      {all.length > 0 && (
        <div className="db-bottom-grid">

          {/* Pending documents section */}
          {docsRequired.length > 0 && (
            <div className="db-filings-card">
              <div className="db-filings-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="db-filings-title">Tax Vault — Documents Needed</span>
                  <span className="db-chip">{docsRequired.length}</span>
                </div>
                <Link to="/vault" className="btn btn-primary db-btn-sm">
                  Open Tax Vault →
                </Link>
              </div>
              <div className="db-filings-scroll">
                <div className="db-filings-table">
                  <div className="db-filings-thead">
                    <span>Service</span>
                    <span>Pending</span>
                    <span>Uploaded</span>
                    <span></span>
                  </div>
                  {docsRequired.map((cs: any, i: number) => {
                    const docs    = cs.client_documents ?? [];
                    const pending = docs.filter((d: any) => d.status === "pending" || d.status === "rejected" || d.status === "expired").length;
                    const done    = docs.filter((d: any) => d.status === "uploaded" || d.status === "under_review" || d.status === "approved").length;
                    return (
                      <Link
                        key={cs.id}
                        to={`/vault?fy=${cs.fiscal_year ?? currentFY()}&svc=${cs.id}`}
                        className="db-filings-row"
                        style={{ borderBottom: i < docsRequired.length - 1 ? "1px solid var(--line-soft)" : "none" }}
                      >
                        <span className="db-filings-year">{cs.service?.name}</span>
                        <span style={{ color: pending > 0 ? "#dc2626" : "var(--green-600)", fontWeight: 500 }}>
                          {pending} pending
                        </span>
                        <span style={{ color: "var(--ink-400)" }}>{done} uploaded</span>
                        <span style={{ color: "var(--gold-600)", fontSize: "0.8rem" }}>Upload →</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active services */}
          <div className="db-activity-card" style={{ minHeight: 0 }}>
            <div className="db-activity-header">
              <span className="db-activity-title">Active Services</span>
              <Link to="/my-services" style={{ fontSize: "0.8rem", color: "var(--gold-600)" }}>
                View all →
              </Link>
            </div>
            {active.length === 0 ? (
              <div className="db-activity-empty">No active services</div>
            ) : (
              <div className="db-activity-list">
                {active.slice(0, 6).map((cs: any) => {
                  const tone = SERVICE_STATUS_STYLES[cs.status as ServiceStatus] ?? SERVICE_STATUS_STYLES.pending;
                  const rel  = fmtRelative(cs.updated_at);
                  return (
                    <Link
                      key={cs.id}
                      to={`/my-services/${cs.id}`}
                      className="db-activity-row"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="db-activity-icon-wrap">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <span className="db-activity-text" style={{ flex: 1 }}>
                        {cs.service?.name ?? "Service"}
                      </span>
                      <span
                        className="db-status-pill"
                        style={{
                          background: tone.bg,
                          color: tone.fg,
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: 20,
                        }}
                      >
                        {SERVICE_STATUS_SHORT_LABELS[cs.status as ServiceStatus] ?? cs.status}
                      </span>
                      {rel && <span className="db-activity-time">{rel}</span>}
                    </Link>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
