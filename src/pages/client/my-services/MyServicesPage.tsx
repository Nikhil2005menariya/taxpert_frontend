import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import Loader from "../../../components/ui/Loader";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";
import MilestoneBar from "../../../components/dashboard/MilestoneBar";
import AddServiceModal from "../../../components/dashboard/AddServiceModal";
import PayButton from "../../../components/ui/PayButton";

type ServiceStatus = "pending" | "documents_required" | "under_review" | "in_progress" | "action_required" | "payment" | "completed" | "cancelled";

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Documents Required",
  documents_received: "Documents Received",
  under_review: "Under Review",
  in_progress: "In Progress",
  action_required: "Action Required",
  payment: "Payment",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const SERVICE_STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  pending:            { fg: "#a96a16", bg: "#f6ecd6" },
  documents_required: { fg: "#a96a16", bg: "#f6ecd6" },
  documents_received: { fg: "var(--lp-green)", bg: "var(--lp-green-soft)" },
  under_review:       { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  in_progress:        { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  action_required:    { fg: "var(--lp-accent-strong)", bg: "var(--lp-accent-soft)" },
  payment:    { fg: "var(--lp-accent-strong)", bg: "var(--lp-accent-soft)" },
  completed:          { fg: "var(--lp-green)", bg: "var(--lp-green-soft)" },
  on_hold:            { fg: "var(--lp-ink-subtle)", bg: "var(--lp-surface-2)" },
  cancelled:          { fg: "var(--lp-ink-faint)", bg: "var(--lp-surface-2)" },
};

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function docStats(docs: any[]) {
  if (!docs?.length) return null;
  const approved = docs.filter((d) => d.status === "approved").length;
  const pending = docs.filter((d) => d.status === "pending" || d.status === "rejected" || d.status === "expired").length;
  const pct = Math.round((approved / docs.length) * 100);
  return { approved, pending, total: docs.length, pct };
}

type ServicesResponse = {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  fiscalYears: string[];
};

function ServiceCard({ cs }: { cs: any }) {
  const stats = docStats(cs.client_documents);
  const tone = SERVICE_STATUS_TONE[cs.status] ?? SERVICE_STATUS_TONE.pending;
  const lastUpdated = formatRelative(cs.status_updated_at ?? cs.updated_at);
  const needsPayment = cs.status === "payment" && cs.payment_status !== "paid";

  const nextAction =
    cs.status === "documents_required" ? "Upload to your Tax Vault"
    : cs.status === "payment"  ? "Ready — payment required"
    : cs.status === "in_progress"      ? "Your filing is being processed"
    : cs.status === "under_review"     ? "Expert is reviewing your documents"
    : cs.status === "completed"        ? "Service completed"
    : null;

  return (
    <div className="lps-card-wrap">
      <div className="lps-card">
        <Link to={`/client/services/${cs.id}`} className="lps-card-link" aria-label={cs.service?.name} />
        <div className="lps-card-top">
          <div className="lps-card-meta">
            <span className="lps-card-cat">{cs.service?.category}</span>
            {cs.fiscal_year && <span className="lps-fy">FY {cs.fiscal_year}</span>}
          </div>
          <span className="lps-status" style={{ color: tone.fg, background: tone.bg }}>
            {SERVICE_STATUS_LABELS[cs.status] ?? cs.status}
          </span>
        </div>

        <h3 className="lps-card-name">{cs.service?.name}</h3>
        {nextAction && <p className="lps-next">{nextAction}</p>}

        <div className="lps-milestone">
          <MilestoneBar status={cs.status as ServiceStatus} compact />
        </div>

        {stats && (
          <div className="lps-doc">
            <div className="lps-doc-top">
              <span className="lps-doc-label">Documents</span>
              <span className="lps-doc-pct">{stats.pct}%</span>
            </div>
            <div className="lps-doc-track">
              <span className={`lps-doc-fill${stats.pct === 100 ? " is-complete" : ""}`} style={{ width: `${stats.pct}%` }} />
            </div>
            <div className="lps-doc-chips">
              {stats.approved > 0 && (
                <span className="lps-chip lps-chip--ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {stats.approved} approved
                </span>
              )}
              {stats.pending > 0 && (
                <span className="lps-chip lps-chip--wait">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {stats.pending} pending
                </span>
              )}
            </div>
          </div>
        )}

        <div className="lps-card-foot">
          <span className="lps-foot-date">
            Started {new Date(cs.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {lastUpdated && <span className="lps-foot-date lps-foot-upd">{lastUpdated}</span>}
          {needsPayment ? (
            <PayButton to={`/client/invoices/${cs.id}`} label="Pay now" className="lp-paybtn--sm lps-card-pay" />
          ) : (
            <span className="lps-card-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyServicesPage() {
  const { profile } = useAuth();
  const isStaff = !!profile?.role && profile.role !== "client";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fy, setFy] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the search box → backend search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change resets to the first page
  useEffect(() => { setPage(1); }, [search, fy]);

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["my-services", search, fy, page],
    enabled: !isStaff,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (fy) params.set("fy", fy);
      params.set("page", String(page));
      const res = await apiClient.get(`/client-services?${params.toString()}`);
      return res.data as ServicesResponse;
    },
  });

  if (isStaff) return <Navigate to="/workload" replace />;
  if (isLoading && !data) return <div className="page-loader"><Loader /></div>;

  const services     = data?.data ?? [];
  const total        = data?.total ?? 0;
  const pageSize     = data?.pageSize ?? 9;
  const fiscalYears  = data?.fiscalYears ?? [];
  const totalPages   = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters   = !!search || !!fy;
  const showOnboarding = !hasFilters && total === 0;

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd   = Math.min(page * pageSize, total);

  return (
    <div className="lps-page">
      <header className="lps-head">
        <div>
          <span className="lps-eyebrow">Your account</span>
          <h1 className="lps-title">My Services</h1>
          <p className="lps-sub">Track and manage every service assigned to your account.</p>
        </div>
        <AddServiceModal />
      </header>

      {error && <div className="lpd-alert">{(error as any).message}</div>}

      {showOnboarding ? (
        <div className="lpd-empty">
          <span className="lpd-empty-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </span>
          <h3>No services yet</h3>
          <p>Add a service to begin the document checklist and start your filing workflow.</p>
          <div className="lpd-empty-actions">
            <Link to="/services" className="lp-btn lp-btn--primary">
              Browse services <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <a href="mailto:info@thetaxpert.com" className="lp-btn lp-btn--ghost">Talk to a Taxpert</a>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: debounced search + FY filter + count */}
          <div className="lps-toolbar">
            <div className="lps-search">
              <svg className="lps-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                className="lps-search-input"
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search your services…"
                aria-label="Search services"
              />
              {searchInput && (
                <button className="lps-search-clear" onClick={() => setSearchInput("")} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            <div className="lps-select-wrap">
              <select className="lps-select" value={fy} onChange={e => setFy(e.target.value)} aria-label="Filter by financial year">
                <option value="">All financial years</option>
                {fiscalYears.map(y => <option key={y} value={y}>FY {y}</option>)}
              </select>
              <svg className="lps-select-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </div>

            <span className={`lps-count${isFetching ? " is-loading" : ""}`}>
              {total > 0 ? <>Showing <strong>{rangeStart}–{rangeEnd}</strong> of {total}</> : "No matches"}
            </span>
          </div>

          {services.length === 0 ? (
            <div className="lps-nomatch">
              <span className="lps-nomatch-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <h3>No services match</h3>
              <p>Try a different search term{fy ? " or financial year" : ""}.</p>
              {hasFilters && (
                <button className="lp-btn lp-btn--ghost lp-btn--sm" onClick={() => { setSearchInput(""); setFy(""); }}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className={`lps-grid${isFetching ? " is-fetching" : ""}`}>
              {services.map((cs: any) => <ServiceCard key={cs.id} cs={cs} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="lps-pager">
              <button className="lps-pager-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Previous
              </button>
              <span className="lps-pager-info">Page {page} of {totalPages}</span>
              <button className="lps-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
