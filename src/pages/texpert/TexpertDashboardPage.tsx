import { Navigate, useNavigate } from 'react-router-dom';
import Loader from "../../components/ui/Loader";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────

interface Stats {
  activeServices:     number;
  pendingReview:      number;
  completedThisMonth: number;
  queueOpen:          number;
}

interface AttentionItem {
  id:             string;
  service_name:   string;
  client_display: string;
  fiscal_year:    string | null;
  status:         string;
  reason:         'payment_received' | 'new_docs' | 'overdue_reupload' | 'sla_overdue' | 'sla_attention';
  priority:       number;
  updated_at:     string;
}

interface ActivityEvent {
  id:                 string;
  client_service_id:  string;
  event_type:         string;
  message:            string;
  created_at:         string;
  service_name?:      string;
  client_first_name?: string;
}

interface DashboardData {
  stats:           Stats;
  needs_attention: AttentionItem[];
  recent_activity: ActivityEvent[];
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_TONE: Record<string, string> = {
  pending:             'adm-badge--neutral',
  documents_required:  'adm-badge--amber',
  documents_received:  'adm-badge--green',
  in_progress:         'adm-badge--blue',
  under_review:        'adm-badge--accent',
  payment:             'adm-badge--amber',
  completed:           'adm-badge--green',
  on_hold:             'adm-badge--neutral',
};

const REASON_META: Record<AttentionItem['reason'], { label: string; flag: 'accent' | 'red' | 'amber' }> = {
  payment_received: { label: 'Payment received — ready to complete', flag: 'accent' },
  new_docs:         { label: 'New documents uploaded',               flag: 'accent' },
  overdue_reupload: { label: 'Re-upload pending >3 days',            flag: 'amber'  },
  sla_overdue:      { label: 'No update in 7+ days',                 flag: 'red'    },
  sla_attention:    { label: 'No update in 3+ days',                 flag: 'amber'  },
};

/* ── SVG icons (no emojis) ────────────────────────────────────── */
function ReasonIcon({ reason }: { reason: AttentionItem['reason'] }) {
  let path: React.ReactNode;
  switch (reason) {
    case 'payment_received': path = <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>; break;
    case 'new_docs':         path = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15h6" /></>; break;
    case 'overdue_reupload': path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></>; break;
    case 'sla_overdue':      path = <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>; break;
    default:                 path = <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>;
  }
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
}

function EventIcon({ type }: { type: string }) {
  let path: React.ReactNode = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>;
  switch (type) {
    case 'status_changed':              path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></>; break;
    case 'document_approved':           path = <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>; break;
    case 'document_rejected':           path = <><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></>; break;
    case 'document_reupload_requested': path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M12 8v5l3 2" /></>; break;
    case 'optional_document_added':     path = <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></>; break;
    case 'texpert_assigned':            path = <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>; break;
    case 'task_added':                  path = <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>; break;
    case 'texpert_note':                path = <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>; break;
    case 'pinned_updated':              path = <><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></>; break;
    case 'payout_recorded':
    case 'payment_captured':            path = <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>; break;
  }
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
}

const ICON = {
  active:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
  review:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  done:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>,
  queue:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>,
  chevron:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
};

// ── Helpers ───────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtRelative(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins   < 1)   return 'just now';
  if (mins   < 60)  return `${mins}m ago`;
  if (hours  < 24)  return `${hours}h ago`;
  if (days   < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── KPI card ──────────────────────────────────────────────────

function Kpi({ icon, label, value, sub, tone, onClick }: {
  icon: React.ReactNode; label: string; value: number; sub: string;
  tone?: 'accent' | 'green' | 'blue'; onClick: () => void;
}) {
  const color = tone === 'green' ? 'var(--lp-green)' : tone === 'blue' ? '#5a5fb8' : tone === 'accent' ? 'var(--lp-accent)' : undefined;
  return (
    <button className="adm-stat adm-stat--link" onClick={onClick} type="button">
      <div className="adm-stat-top"><span className="adm-stat-ico">{icon}</span><span className="adm-stat-lbl">{label}</span></div>
      <div className="adm-stat-val" style={value > 0 && color ? { color } : undefined}>{value}</div>
      <div className="adm-stat-sub">{sub}</div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function TexpertDashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['tx-dashboard'],
    queryFn:  async () => (await apiClient.get('/texpert/dashboard')).data.data,
    enabled:  isTexpert,
    refetchInterval: 60_000,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isTexpert)  return <Navigate to="/dashboard" replace />;

  const stats     = data?.stats;
  const attention = data?.needs_attention ?? [];
  const activity  = data?.recent_activity  ?? [];

  let tip = "You're all caught up.";
  if (stats) {
    if (stats.pendingReview > 0 && attention.length > 0) {
      tip = `${attention.length} service${attention.length !== 1 ? 's' : ''} need${attention.length === 1 ? 's' : ''} your attention.`;
    } else if (stats.activeServices === 0 && stats.queueOpen > 0) {
      tip = `${stats.queueOpen} open service${stats.queueOpen !== 1 ? 's' : ''} in the queue — go claim one.`;
    }
  }

  return (
    <div className="adm-root">
      {/* ── Hero ── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— {todayLabel()}</p>
            <h1 className="adm-hero-title">{greeting()}, <span style={{ color: 'var(--lp-accent)' }}>{profile?.first_name ?? ''}</span></h1>
            <p className="adm-hero-date">{tip}</p>
          </div>
          <div className="adm-hero-aside">
            <button className="adm-btn adm-btn--accent" onClick={() => navigate('/texpert/queue')}>Browse Queue</button>
          </div>
        </div>
      </header>

      {/* ── KPIs ── */}
      {isLoading ? (
        <div className="adm-loading"><Loader /></div>
      ) : isError ? (
        <div className="adm-banner adm-banner--err">Failed to load dashboard. Please refresh.</div>
      ) : (
        <div className="adm-stats">
          <Kpi icon={ICON.active} label="Active Services"      value={stats?.activeServices ?? 0}     sub="Currently working on"     onClick={() => navigate('/texpert/services')} />
          <Kpi icon={ICON.review} label="Pending Review"       value={stats?.pendingReview ?? 0}      sub="Docs awaiting your action" tone="accent" onClick={() => navigate('/texpert/services?status=documents_received')} />
          <Kpi icon={ICON.done}   label="Completed This Month" value={stats?.completedThisMonth ?? 0} sub="Services finished"        tone="green" onClick={() => navigate('/texpert/services?status=completed')} />
          <Kpi icon={ICON.queue}  label="In Queue"             value={stats?.queueOpen ?? 0}          sub="Available to claim"       tone="blue" onClick={() => navigate('/texpert/queue')} />
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="adm-grid">
        {/* Needs Attention */}
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles">
              <h2 className="adm-panel-title">Needs Attention{attention.length > 0 && <span className="adm-count">{attention.length}</span>}</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="adm-loading"><Loader size={30} /></div>
          ) : attention.length === 0 ? (
            <div className="adm-empty-box">
              <span className="adm-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
              <p className="adm-empty-txt">All caught up. {stats?.queueOpen ? 'Check the queue to claim more work.' : 'New work appears as clients upload documents.'}</p>
              {(stats?.queueOpen ?? 0) > 0 && (
                <button className="adm-btn adm-btn--accent adm-btn--sm" onClick={() => navigate('/texpert/queue')}>Browse Queue ({stats?.queueOpen})</button>
              )}
            </div>
          ) : (
            <div className="adm-list">
              {attention.map(a => {
                const meta = REASON_META[a.reason];
                return (
                  <button key={a.id} type="button" className={`adm-row adm-row--btn adm-row--${meta.flag}`} onClick={() => navigate(`/texpert/services/${a.id}`)}>
                    <span className={`tx-reason-ico tx-reason-ico--${meta.flag}`}><ReasonIcon reason={a.reason} /></span>
                    <div className="adm-row-main">
                      <div className="adm-row-name">{a.service_name}{a.fiscal_year && <span className="tx-card-fy">{a.fiscal_year}</span>}</div>
                      <div className="adm-row-meta">
                        <span className="adm-row-date">{a.client_display}</span>
                        <span className={`adm-badge ${STATUS_TONE[a.status] ?? 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{a.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="adm-row-desc">{meta.label}</div>
                    </div>
                    <span className="tx-row-go">{ICON.chevron}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles">
              <h2 className="adm-panel-title">Recent Activity{activity.length > 0 && <span className="adm-count">{activity.length}</span>}</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="adm-loading"><Loader size={30} /></div>
          ) : activity.length === 0 ? (
            <div className="adm-empty-box">
              <span className="adm-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
              <p className="adm-empty-txt">Actions on your assigned services will appear here.</p>
            </div>
          ) : (
            <div className="adm-tl">
              {activity.map(ev => (
                <button key={ev.id} type="button" className="adm-tl-item tx-tl-btn" onClick={() => navigate(`/texpert/services/${ev.client_service_id}`)}>
                  <div className="adm-tl-ico"><EventIcon type={ev.event_type} /></div>
                  <div className="adm-tl-body">
                    <div className="adm-tl-msg">{ev.message}</div>
                    <div className="adm-tl-meta">
                      {ev.service_name && <span className="adm-tl-type">{ev.service_name}</span>}
                      {ev.client_first_name && <span className="adm-tl-time">{ev.client_first_name}</span>}
                      <span className="adm-tl-time">{fmtRelative(ev.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
