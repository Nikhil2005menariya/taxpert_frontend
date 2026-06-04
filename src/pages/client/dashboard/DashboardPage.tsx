import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";
import AddServiceModal from "../../../components/dashboard/AddServiceModal";
import Loader from "../../../components/ui/Loader";

// ── Types + status maps ───────────────────────────────────────

type ServiceStatus =
  | "pending" | "documents_required" | "under_review" | "in_progress"
  | "action_required" | "payment" | "completed" | "cancelled";

const STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: "Pending",
  documents_required: "Docs needed",
  under_review: "Reviewing",
  in_progress: "In progress",
  action_required: "Action needed",
  payment: "Payment",
  completed: "Done",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<ServiceStatus, { fg: string; bg: string }> = {
  pending:            { fg: "#a96a16", bg: "#f6ecd6" },
  documents_required: { fg: "#a96a16", bg: "#f6ecd6" },
  under_review:       { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  in_progress:        { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  action_required:    { fg: "var(--lp-accent-strong)", bg: "var(--lp-accent-soft)" },
  payment:            { fg: "#a96a16", bg: "#f6ecd6" },
  completed:          { fg: "var(--lp-green)", bg: "var(--lp-green-soft)" },
  cancelled:          { fg: "var(--lp-ink-faint)", bg: "var(--lp-surface-2)" },
};

// ── Inline icons ──────────────────────────────────────────────

const I = {
  upload: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  vault: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3.2" /><path d="M12 8.8V7M12 17v-1.8M15.2 12H17M7 12h1.8" /></>,
  folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" /></>,
};

const svg = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);

// ── Helpers ───────────────────────────────────────────────────

function currentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

function fmtRelative(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Stat card ─────────────────────────────────────────────────

type Tone = "urgent" | "gold" | "good" | "default";

function StatCard({ label, value, sub, tone = "default", icon }: {
  label: string; value: string | number; sub: string; tone?: Tone; icon: ReactNode;
}) {
  return (
    <div className="lpd-stat" data-tone={tone}>
      <div className="lpd-stat-top">
        <span className="lpd-stat-ico">{svg(icon)}</span>
        <span className="lpd-stat-label">{label}</span>
      </div>
      <div className="lpd-stat-value">{value}</div>
      <span className="lpd-stat-sub">{sub}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile, user } = useAuth();

  const { data: summary, error, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/client-services/dashboard");
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="lpd-page">
        <div className="lpd-page-loader">
          <Loader size={42} label="Loading your dashboard…" />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="lpd-page">
        <div className="lpd-alert">
          Could not load dashboard data: {(error as any)?.response?.data?.error ?? (error as any)?.message ?? "Unknown error"}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const role = profile?.role ?? "client";
  const isClient = role === "client";
  const firstName = profile?.first_name || user?.user_metadata?.first_name || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── STAFF / ADMIN ────────────────────────────────────────────
  if (!isClient) {
    const s = summary?.kind === "staff" ? summary : null;
    return (
      <div className="lpd-page">
        <header className="lpd-head">
          <div>
            <span className="lpd-eyebrow">{greeting}</span>
            <h1 className="lpd-title">Welcome back, <em>Team</em>.</h1>
            <p className="lpd-sub">Platform overview — open the workload for the full service queue.</p>
          </div>
        </header>

        <div className="lpd-stat-grid">
          <StatCard label="Total services"  value={s?.total ?? 0}          sub="All time"                                                  tone="default" icon={I.grid} />
          <StatCard label="Active pipeline" value={s?.active ?? 0}         sub={s?.active ? "In progress" : "All clear"}                    tone={s?.active ? "gold" : "good"} icon={I.layers} />
          <StatCard label="Docs required"   value={s?.needsDocs ?? 0}      sub={s?.needsDocs ? "Awaiting client upload" : "None pending"}   tone={s?.needsDocs ? "urgent" : "good"} icon={I.upload} />
          <StatCard label="Invoice pending" value={s?.invoicePending ?? 0} sub={s?.invoicePending ? "Awaiting payment" : "None"}            tone={s?.invoicePending ? "gold" : "default"} icon={I.inbox} />
        </div>

        <div className="lpd-card lpd-workload">
          <div className="lpd-card-head">
            <span className="lpd-card-title">{svg(I.layers)} Service workload</span>
          </div>
          <div className="lpd-workload-body">
            <p>Full client service list with search, filters, SLA risk, and document progress.</p>
            <div className="lpd-workload-actions">
              <Link to="/client/services" className="lp-btn lp-btn--primary">
                Open workload <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg>
              </Link>
              <Link to="/work-queue" className="lp-btn lp-btn--ghost">Task queue</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CLIENT ───────────────────────────────────────────────────
  const s = summary?.kind === "client" ? summary : null;
  const all = s?.all ?? [];
  const active = s?.active ?? [];
  const docsRequired = s?.docsRequired ?? [];
  const totalPendingDocs = s?.totalPendingDocs ?? 0;

  return (
    <div className="lpd-page">
      <header className="lpd-head">
        <div>
          <span className="lpd-eyebrow">{greeting}</span>
          <h1 className="lpd-title">Welcome back, <em>{firstName}</em>.</h1>
          <p className="lpd-sub">
            {totalPendingDocs > 0
              ? `${totalPendingDocs} document${totalPendingDocs !== 1 ? "s" : ""} waiting for upload.`
              : all.length > 0
                ? "All your services are up to date."
                : "Add a service to get started."}
          </p>
        </div>
        <AddServiceModal />
      </header>

      <div className="lpd-stat-grid">
        <StatCard label="Docs to upload"  value={totalPendingDocs}  sub={totalPendingDocs > 0 ? "Upload via Vault" : "All uploaded"}             tone={totalPendingDocs > 0 ? "urgent" : "good"} icon={I.upload} />
        <StatCard label="Active services" value={active.length}     sub={active.length > 0 ? `${docsRequired.length} need docs` : "None active"} tone={active.length > 0 ? "gold" : "default"} icon={I.layers} />
        <StatCard label="Completed"       value={s?.completed ?? 0} sub={s?.completed ? "Services finalised" : "None yet"}                       tone={s?.completed ? "good" : "default"} icon={I.check} />
        <StatCard label="Total services"  value={s?.total ?? 0}     sub="All time"                                                              tone="default" icon={I.grid} />
      </div>

      {error && !summary && <div className="lpd-alert">Failed to load services: {(error as any).message}</div>}

      {/* Empty state */}
      {!all.length ? (
        <div className="lpd-empty">
          <span className="lpd-empty-ico">{svg(I.folder)}</span>
          <h3>No services yet</h3>
          <p>Add a service to begin — your assigned Taxpert will guide you through every step from there.</p>
          <div className="lpd-empty-steps">
            <span className="lpd-empty-step"><span>1</span>Add a service</span>
            <span className="lpd-empty-step"><span>2</span>Upload documents in Vault</span>
            <span className="lpd-empty-step"><span>3</span>We review &amp; complete it</span>
          </div>
          <div className="lpd-empty-actions">
            <Link to="/services" className="lp-btn lp-btn--primary">
              Browse services <svg className="lp-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg>
            </Link>
            <a href="mailto:info@thetaxpert.com" className="lp-btn lp-btn--ghost">Talk to a Taxpert</a>
          </div>
        </div>
      ) : (
        <div className="lpd-grid">
          {/* Primary: documents needed (or all-caught-up) */}
          {docsRequired.length > 0 ? (
            <div className="lpd-card">
              <div className="lpd-card-head">
                <span className="lpd-card-title">{svg(I.vault)} Documents needed <span className="lpd-chip">{docsRequired.length}</span></span>
                <Link to="/client/vault" className="lpd-card-link">Open Vault <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg></Link>
              </div>
              <div>
                {docsRequired.map((cs: any) => {
                  const docs = cs.client_documents ?? [];
                  const pending = docs.filter((d: any) => ["pending", "rejected", "expired"].includes(d.status)).length;
                  const done = docs.filter((d: any) => ["uploaded", "under_review", "approved"].includes(d.status)).length;
                  const total = pending + done;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <Link key={cs.id} to={`/client/vault?fy=${cs.fiscal_year ?? currentFY()}&svc=${cs.id}`} className="lpd-doc-row">
                      <div className="lpd-doc-main">
                        <span className="lpd-doc-name">{cs.service?.name ?? "Service"}</span>
                        <span className="lpd-doc-meta">
                          <span className="lpd-doc-pending">{pending} pending</span>
                          <span className="lpd-doc-dot" />
                          <span className="lpd-doc-done">{done} uploaded</span>
                        </span>
                      </div>
                      <span className="lpd-doc-cta">Upload <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg></span>
                      <div className="lpd-doc-bar"><span className="lpd-doc-bar-fill" style={{ width: `${pct}%` }} /></div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="lpd-card lpd-allgood">
              <span className="lpd-allgood-ico">{svg(I.check)}</span>
              <h3>You’re all caught up</h3>
              <p>No documents pending right now. We’ll let you know the moment something needs your attention.</p>
              <Link to="/client/vault" className="lpd-card-link">Open Vault <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg></Link>
            </div>
          )}

          {/* Secondary: active services */}
          <div className="lpd-card">
            <div className="lpd-card-head">
              <span className="lpd-card-title">{svg(I.layers)} Active services</span>
              <Link to="/client/services" className="lpd-card-link">View all <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I.arrow}</svg></Link>
            </div>
            {active.length === 0 ? (
              <div className="lpd-empty-row">No active services right now.</div>
            ) : (
              <div>
                {active.slice(0, 5).map((cs: any) => {
                  const tone = STATUS_TONE[cs.status as ServiceStatus] ?? STATUS_TONE.pending;
                  const rel = fmtRelative(cs.updated_at);
                  return (
                    <Link key={cs.id} to={`/client/services/${cs.id}`} className="lpd-svc-row">
                      <span className="lpd-svc-ico">{svg(I.folder)}</span>
                      <span className="lpd-svc-name">{cs.service?.name ?? "Service"}</span>
                      {rel && <span className="lpd-svc-time">{rel}</span>}
                      <span className="lpd-pill" style={{ color: tone.fg, background: tone.bg }}>
                        {STATUS_LABELS[cs.status as ServiceStatus] ?? cs.status}
                      </span>
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
