import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";
import MilestoneBar from "../../components/dashboard/MilestoneBar";

type ServiceStatus = "pending" | "documents_required" | "under_review" | "in_progress" | "action_required" | "invoice_pending" | "completed" | "cancelled";

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Documents Required",
  under_review: "Under Review",
  in_progress: "In Progress",
  action_required: "Action Required",
  invoice_pending: "Invoice Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const SERVICE_STATUS_STYLES: Record<string, { fg: string; bg: string }> = {
  pending:            { fg: "#b45309", bg: "#fef3c7" },
  documents_required: { fg: "#b45309", bg: "#fef3c7" },
  under_review:       { fg: "#1d4ed8", bg: "#dbeafe" },
  in_progress:        { fg: "#1d4ed8", bg: "#dbeafe" },
  action_required:    { fg: "#be123c", bg: "#ffe4e6" },
  invoice_pending:    { fg: "#b45309", bg: "#fef3c7" },
  completed:          { fg: "#15803d", bg: "#dcfce7" },
  cancelled:          { fg: "#6b7280", bg: "#f3f4f6" },
};

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function docStats(docs: any[]) {
  if (!docs?.length) return null;
  const approved = docs.filter(d => d.status === "approved").length;
  const pending  = docs.filter(d => d.status === "pending" || d.status === "rejected" || d.status === "expired").length;
  const pct      = Math.round((approved / docs.length) * 100);
  return { approved, pending, total: docs.length, pct };
}

export default function MyServicesPage() {
  const { profile } = useAuth();

  // Staff use /workload — /my-services is client-only
  const isStaff = profile?.role && profile.role !== "client";
  if (isStaff) return <Navigate to="/workload" replace />;

  const { data: clientServices, error, isLoading } = useQuery({
    queryKey: ['my-services'],
    queryFn: async () => {
      const { data } = await apiClient.get('/client-services');
      return data.data; // backend returns { data: [...] }
    }
  });

  if (isLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  return (
    <div className="cs-shell">
      <div className="cs-header">
        <div>
          <h1 className="cs-heading">My Services</h1>
          <p className="cs-sub">Track and manage every service assigned to your account.</p>
        </div>
      </div>

      {error && <div className="db-alert-error">{(error as any).message}</div>}

      {!clientServices?.length ? (
        <div className="cs-empty">
          <div className="cs-empty-icon">📋</div>
          <h3 className="cs-empty-title">No services yet</h3>
          <p className="cs-empty-desc">
            Add a service to begin the document checklist and start your filing workflow.
          </p>
          <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--ink-400)" }}>
            Use <strong>+ Add Service</strong> in the top-right to get started.
          </p>
        </div>
      ) : (
        <div className="cs-grid">
          {clientServices.map((cs: any) => {
            const stats = docStats(cs.client_documents);
            const st    = SERVICE_STATUS_STYLES[cs.status] ?? SERVICE_STATUS_STYLES.pending;
            const lastUpdated = formatRelative(cs.status_updated_at ?? cs.updated_at);
            const needsPayment = cs.status === "invoice_pending" && cs.payment_status !== "paid";

            // Determine the "next action" for clarity
            const nextAction = cs.status === "documents_required"
              ? "Upload to your Tax Vault"
              : cs.status === "invoice_pending"
              ? "Invoice ready — payment required"
              : cs.status === "in_progress"
              ? "Your filing is being processed"
              : cs.status === "under_review"
              ? "Expert is reviewing your documents"
              : cs.status === "completed"
              ? "Service completed"
              : null;

            return (
              <div key={cs.id} className="cs-card-wrap">
                <Link to={`/my-services/${cs.id}`} className="cs-card">
                  <div className="cs-card-top">
                    <div className="cs-card-meta">
                      <span className="cs-card-category">{cs.service?.category}</span>
                      {cs.fiscal_year && (
                        <span className="cs-fy-badge">FY {cs.fiscal_year}</span>
                      )}
                    </div>
                    <span className="cs-status-pill" style={{ background: st.bg, color: st.fg }}>
                      {SERVICE_STATUS_LABELS[cs.status] ?? cs.status}
                    </span>
                  </div>

                  <div className="cs-card-name">{cs.service?.name}</div>

                  {nextAction && (
                    <div className="cs-next-action">{nextAction}</div>
                  )}

                  <div className="cs-milestone-wrap">
                    <MilestoneBar status={cs.status as ServiceStatus} />
                  </div>

                  {stats && (
                    <div className="cs-doc-row">
                      <div className="cs-doc-bar-track">
                        <div
                          className="cs-doc-bar-fill"
                          style={{
                            width: `${stats.pct}%`,
                            background: stats.pct === 100 ? "var(--green-600)" : "var(--gold-500)",
                          }}
                        />
                      </div>
                      <div className="cs-doc-chips">
                        {stats.approved > 0 && (
                          <span className="cs-doc-chip cs-chip-verified">✓ {stats.approved} approved</span>
                        )}
                        {stats.pending > 0 && (
                          <span className="cs-doc-chip cs-chip-pending">⏳ {stats.pending} pending</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="cs-card-footer">
                    <span className="cs-card-date">
                      Started {new Date(cs.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {lastUpdated && (
                      <span className="cs-card-date">Updated {lastUpdated}</span>
                    )}
                    <span className="cs-card-arrow">→</span>
                  </div>
                </Link>

                {needsPayment && (
                  <Link to={`/invoices/${cs.id}`} className="cs-pay-now-banner">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Invoice ready — <strong>Pay Now to complete</strong>
                    <span className="cs-pay-now-arrow">→</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
