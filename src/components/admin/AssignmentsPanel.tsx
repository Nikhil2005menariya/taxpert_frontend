import { useState, useMemo } from "react";
import RemoveAssignmentButton from "./RemoveAssignmentButton";

interface UserSnap {
  first_name: string;
  last_name: string;
  pan: string;
  email: string;
  mobile: string;
  role?: string;
}

type MaybeArray<T> = T | T[] | null;

interface Assignment {
  ca_id: string;
  client_id: string;
  assigned_at: string;
  ca: MaybeArray<UserSnap>;
  client: MaybeArray<UserSnap>;
}

function pick<T>(val: MaybeArray<T>): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

interface FilingCount {
  total: number;
  filed: number;
  processing: number;
}

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  super_admin: { label: "Super Admin", bg: "#eef2ff", color: "#4338ca" },
  admin:       { label: "Admin",       bg: "#fef2f2", color: "#b91c1c" },
  expert:      { label: "Tax Expert",  bg: "#fff7ed", color: "#c2410c" },
  ca:          { label: "Tax Expert",  bg: "#fff7ed", color: "#c2410c" },
  staff:       { label: "Staff",       bg: "#eff6ff", color: "#1a56db" },
  client:      { label: "Client",      bg: "#f0fdf4", color: "#057a55" },
};

function initials(u: UserSnap) {
  return `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();
}

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function AssignmentsPanel({
  assignments,
  filingCounts,
}: {
  assignments: Assignment[];
  filingCounts: Record<string, FilingCount> | null;
}) {
  const [search, setSearch] = useState("");
  const [expertFilter, setExpertFilter] = useState("all");

  const experts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of assignments) {
      const ca = pick(a.ca);
      if (ca) seen.set(a.ca_id, `${ca.first_name} ${ca.last_name}`);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assignments.filter((a) => {
      const ca = pick(a.ca);
      const cl = pick(a.client);
      if (expertFilter !== "all" && a.ca_id !== expertFilter) return false;
      if (!q) return true;
      return (
        `${ca?.first_name} ${ca?.last_name}`.toLowerCase().includes(q) ||
        `${cl?.first_name} ${cl?.last_name}`.toLowerCase().includes(q) ||
        cl?.pan?.toLowerCase().includes(q) ||
        cl?.email?.toLowerCase().includes(q)
      );
    });
  }, [assignments, search, expertFilter]);

  return (
    <div className="asgn-panel">
      {/* Stats row */}
      <div className="asgn-stats">
        <div className="asgn-stat">
          <span className="asgn-stat-num">{assignments.length}</span>
          <span className="asgn-stat-label">Total Assignments</span>
        </div>
        <div className="asgn-stat">
          <span className="asgn-stat-num">{experts.length}</span>
          <span className="asgn-stat-label">Taxperts with Clients</span>
        </div>
        <div className="asgn-stat">
          <span className="asgn-stat-num" style={{ color: "#057a55" }}>
            {assignments.length}
          </span>
          <span className="asgn-stat-label">Active</span>
        </div>
      </div>

      {/* Filters */}
      <div className="asgn-filters">
        <div className="asgn-search-wrap">
          <svg className="asgn-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M10 10l3.5 3.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="asgn-search"
            type="text"
            placeholder="Search by client, expert, PAN, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="asgn-search-clear" onClick={() => setSearch("")} type="button">✕</button>
          )}
        </div>
        <select
          className="asgn-filter-select"
          value={expertFilter}
          onChange={(e) => setExpertFilter(e.target.value)}
        >
          <option value="all">All Taxperts</option>
          {experts.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {(search || expertFilter !== "all") && (
        <p className="asgn-results-meta">
          Showing {filtered.length} of {assignments.length} assignments
          {search && <> matching &ldquo;<strong>{search}</strong>&rdquo;</>}
        </p>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="adm-empty">No assignments match your filters.</div>
      ) : (
        <div className="asgn-cards">
          {filtered.map((a) => {
            const ca = pick(a.ca);
            const cl = pick(a.client);
            const fc = filingCounts?.[a.client_id];
            const roleInfo = ROLE_BADGE[ca?.role ?? ""] ?? ROLE_BADGE.staff;

            return (
              <div key={`${a.ca_id}-${a.client_id}`} className="asgn-card">
                {/* Top: client ← arrow → expert */}
                <div className="asgn-card-body">
                  {/* Client block */}
                  <div className="asgn-user-block">
                    <div className="asgn-avatar asgn-avatar-client">
                      {cl ? initials(cl) : "?"}
                    </div>
                    <div className="asgn-user-info">
                      <span className="asgn-user-type">Client</span>
                      <strong className="asgn-user-name">
                        {cl ? `${cl.first_name} ${cl.last_name}` : "Unknown"}
                      </strong>
                      {cl?.pan && <code className="adm-code">{cl.pan}</code>}
                      {cl?.email && (
                        <a href={`mailto:${cl.email}`} className="asgn-contact-link">
                          {cl.email}
                        </a>
                      )}
                      {cl?.mobile && (
                        <a href={`tel:${cl.mobile}`} className="asgn-contact-link">
                          {cl.mobile}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="asgn-connector" aria-hidden="true">
                    <div className="asgn-connector-line" />
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5"/>
                      <path d="M7 10h6M11 8l2 2-2 2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="asgn-connector-line" />
                  </div>

                  {/* Expert block */}
                  <div className="asgn-user-block">
                    <div className="asgn-avatar asgn-avatar-expert" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                      {ca ? initials(ca) : "?"}
                    </div>
                    <div className="asgn-user-info">
                      <span className="asgn-user-type">Taxpert</span>
                      <strong className="asgn-user-name">
                        {ca ? `${ca.first_name} ${ca.last_name}` : "Unknown"}
                      </strong>
                      <span
                        className="asgn-role-pill"
                        style={{ background: roleInfo.bg, color: roleInfo.color }}
                      >
                        {roleInfo.label}
                      </span>
                      {ca?.pan && <code className="adm-code">{ca.pan}</code>}
                      {ca?.email && (
                        <a href={`mailto:${ca.email}`} className="asgn-contact-link">
                          {ca.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: metadata row */}
                <div className="asgn-card-footer">
                  <div className="asgn-meta-chips">
                    <span className="asgn-meta-chip">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Assigned {fmtDateTime(a.assigned_at)}
                    </span>
                    <span className="asgn-meta-chip asgn-since">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {daysSince(a.assigned_at)}
                    </span>
                    <span className="asgn-meta-chip">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 12l5-5 3 3 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {fc?.total ?? 0} service{fc?.total !== 1 ? "s" : ""}
                      {(fc?.filed ?? 0) > 0 && ` · ${fc!.filed} completed`}
                      {(fc?.processing ?? 0) > 0 && ` · ${fc!.processing} in progress`}
                    </span>
                  </div>

                  <div className="asgn-footer-right">
                    <span className="asgn-status-active">
                      <span className="asgn-status-dot" />
                      Active
                    </span>
                    <RemoveAssignmentButton caId={a.ca_id} clientId={a.client_id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
