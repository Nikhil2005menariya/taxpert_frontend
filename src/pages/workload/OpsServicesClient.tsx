import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

type ServiceStatus = string;

type DocRow = { id: string; status: string };
type UserRow = { first_name: string; last_name: string; email?: string; pan?: string } | null;

export type OpsServiceRow = {
  id: string;
  user_id: string;
  status: string;
  payment_status: string | null;
  notes: string | null;
  assigned_to: string | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
  fiscal_year: string | null;
  service: { id: string; name: string; category: string; slug: string } | null;
  client_documents: DocRow[];
  client: UserRow;
  assignee: UserRow;
};

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Docs Needed",
  documents_received: "Docs Received",
  under_review: "Reviewing",
  in_progress: "In Progress",
  action_required: "Action Needed",
  invoice_pending: "Invoice Pending",
  completed: "Done",
  cancelled: "Cancelled",
};

const SERVICE_STATUS_STYLES: Record<string, { fg: string; bg: string }> = {
  pending:            { fg: "#b45309", bg: "#fef3c7" },
  documents_required: { fg: "#b45309", bg: "#fef3c7" },
  documents_received: { fg: "#0369a1", bg: "#e0f2fe" },
  under_review:       { fg: "#1d4ed8", bg: "#dbeafe" },
  in_progress:        { fg: "#1d4ed8", bg: "#dbeafe" },
  action_required:    { fg: "#be123c", bg: "#ffe4e6" },
  invoice_pending:    { fg: "#b45309", bg: "#fef3c7" },
  completed:          { fg: "#15803d", bg: "#dcfce7" },
  cancelled:          { fg: "#6b7280", bg: "#f3f4f6" },
};

const STATUS_FILTERS: { label: string; value: ServiceStatus | "all" }[] = [
  { label: "All",               value: "all"                },
  { label: "Needs Documents",   value: "documents_required" },
  { label: "Ready to Process",  value: "documents_received" },
  { label: "In Progress",       value: "in_progress"        },
  { label: "Under Review",      value: "under_review"       },
];

function relativeTime(iso: string | null) {
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

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "2-digit",
  });
}

function docProgress(docs: DocRow[]) {
  const total    = docs.length;
  const approved = docs.filter(d => d.status === "approved").length;
  const pending  = docs.filter(d => d.status === "pending" || d.status === "rejected" || d.status === "expired").length;
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { total, approved, pending, pct };
}

function slaRisk(row: OpsServiceRow): "critical" | "warning" | null {
  if (!["documents_required", "pending"].includes(row.status)) return null;
  const age = Date.now() - new Date(row.status_updated_at ?? row.created_at).getTime();
  const days = age / (1000 * 60 * 60 * 24);
  if (days > 14) return "critical";
  if (days > 7)  return "warning";
  return null;
}

function clientName(client: UserRow) {
  if (!client) return "Unknown";
  return `${client.first_name} ${client.last_name}`;
}

function assigneeName(assignee: UserRow) {
  if (!assignee) return null;
  return `${assignee.first_name} ${assignee.last_name}`;
}

export default function OpsServicesClient({ rows }: { rows: OpsServiceRow[] }) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const cname = clientName(r.client).toLowerCase();
      const sname = r.service?.name.toLowerCase() ?? "";
      return cname.includes(q) || sname.includes(q) || r.client?.email?.toLowerCase().includes(q) || r.client?.pan?.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="ops-wrap">
      <div className="ops-controls">
        <div className="ops-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by client, email, PAN, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ops-tabs">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              className={`ops-tab ${statusFilter === f.value ? "active" : ""}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Service</th>
              <th>Status & Docs</th>
              <th>Assignee</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const { pct, total, pending } = docProgress(row.client_documents ?? []);
              const st = SERVICE_STATUS_STYLES[row.status] ?? SERVICE_STATUS_STYLES.pending;
              const risk = slaRisk(row);
              const assignee = assigneeName(row.assignee);

              return (
                <tr key={row.id} className={risk === "critical" ? "ops-row-critical" : risk === "warning" ? "ops-row-warning" : ""}>
                  <td className="ops-td-client">
                    <Link to={`/my-services/${row.id}`} className="ops-client-link">
                      <div className="ops-client-name">{clientName(row.client)}</div>
                      <div className="ops-client-sub">
                        {row.client?.email} {row.client?.pan && `· ${row.client.pan}`}
                      </div>
                    </Link>
                  </td>
                  <td className="ops-td-service">
                    <div className="ops-svc-name">{row.service?.name}</div>
                    <div className="ops-svc-sub">{row.service?.category}</div>
                  </td>
                  <td className="ops-td-status">
                    <div className="ops-status-line">
                      <span className="ops-pill" style={{ background: st.bg, color: st.fg }}>
                        {SERVICE_STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      {risk === "critical" && <span className="ops-risk-badge" title="Stuck for > 14 days">SLA Breach</span>}
                    </div>
                    {total > 0 && (
                      <div className="ops-doc-track">
                        <div className="ops-doc-fill" style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#f59e0b" }} />
                        <span className="ops-doc-label">{pending > 0 ? `${pending} pending` : `${pct}% docs`}</span>
                      </div>
                    )}
                  </td>
                  <td className="ops-td-assignee">
                    {assignee ? (
                      <span className="ops-assignee">{assignee}</span>
                    ) : (
                      <span className="ops-unassigned">Unassigned</span>
                    )}
                  </td>
                  <td className="ops-td-date">
                    <div className="ops-date">{shortDate(row.created_at)}</div>
                    <div className="ops-date-sub">{relativeTime(row.status_updated_at ?? row.created_at)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="ops-empty">
            No services found matching your filters.
          </div>
        )}
      </div>

      <style>{`
        .ops-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .ops-controls { display: flex; flex-direction: column; gap: 0.75rem; }
        .ops-search {
          position: relative; display: flex; align-items: center;
          width: 100%; max-width: 400px;
        }
        .ops-search svg { position: absolute; left: 12px; }
        .ops-search input {
          width: 100%; padding: 0.6rem 1rem 0.6rem 2.2rem;
          border: 1.5px solid #e2e8f0; border-radius: 0.5rem;
          font-size: 0.875rem; transition: border-color 0.2s;
        }
        .ops-search input:focus { outline: none; border-color: #3b82f6; }
        .ops-tabs { display: flex; flex-wrap: wrap; gap: 0.25rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
        .ops-tab {
          background: none; border: none; padding: 0.4rem 0.75rem;
          font-size: 0.8rem; font-weight: 600; color: #64748b;
          border-radius: 0.375rem; cursor: pointer; transition: all 0.2s;
        }
        .ops-tab:hover { background: #f1f5f9; color: #0f172a; }
        .ops-tab.active { background: #eff6ff; color: #2563eb; }

        .ops-table-wrap {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
          overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .ops-table { width: 100%; border-collapse: collapse; min-width: 800px; text-align: left; }
        .ops-table th {
          padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;
          background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        }
        .ops-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .ops-table tbody tr:last-child td { border-bottom: none; }
        .ops-table tbody tr:hover { background: #f8fafc; }

        .ops-row-warning { background: #fffbeb !important; }
        .ops-row-critical { background: #fef2f2 !important; }

        .ops-td-client { min-width: 200px; }
        .ops-client-link { text-decoration: none; display: block; }
        .ops-client-name { font-size: 0.9rem; font-weight: 600; color: #0f172a; margin-bottom: 0.15rem; }
        .ops-client-link:hover .ops-client-name { color: #2563eb; text-decoration: underline; }
        .ops-client-sub { font-size: 0.75rem; color: #64748b; }

        .ops-td-service { min-width: 180px; }
        .ops-svc-name { font-size: 0.85rem; font-weight: 500; color: #1e293b; margin-bottom: 0.15rem; }
        .ops-svc-sub { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

        .ops-td-status { min-width: 220px; }
        .ops-status-line { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
        .ops-pill {
          font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.6rem;
          border-radius: 999px; white-space: nowrap;
        }
        .ops-risk-badge {
          font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem;
          border-radius: 0.25rem; background: #ef4444; color: #fff;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ops-doc-track {
          display: flex; align-items: center; gap: 0.5rem;
          width: 100%; max-width: 140px; background: #f1f5f9;
          height: 4px; border-radius: 2px; position: relative;
        }
        .ops-doc-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
        .ops-doc-label {
          position: absolute; right: -60px; font-size: 0.65rem;
          color: #64748b; font-weight: 600; white-space: nowrap;
        }

        .ops-td-assignee { min-width: 120px; }
        .ops-assignee {
          display: inline-flex; align-items: center; font-size: 0.75rem;
          font-weight: 600; color: #334155; padding: 0.2rem 0.5rem;
          background: #f1f5f9; border-radius: 0.25rem;
        }
        .ops-unassigned { font-size: 0.75rem; font-weight: 600; color: #b45309; }

        .ops-td-date { min-width: 100px; }
        .ops-date { font-size: 0.8rem; font-weight: 500; color: #334155; margin-bottom: 0.15rem; }
        .ops-date-sub { font-size: 0.7rem; color: #94a3b8; }

        .ops-empty { padding: 3rem 1rem; text-align: center; color: #64748b; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
