import { Navigate, useNavigate } from 'react-router-dom';
import Loader from "../../components/ui/Loader";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees } from '../../shared/finance-utils';

// ── Types ─────────────────────────────────────────────────────

interface Stats {
  activeServices:     number;
  pendingReview:      number;
  completedThisMonth: number;
  earningsThisMonth:  number;
  totalEarned:        number;
  queueOpen:          number;
}

interface AttentionItem {
  id:             string;
  service_name:   string;
  client_display: string;
  fiscal_year:    string | null;
  status:         string;
  reason:         'new_docs' | 'overdue_reupload' | 'sla_overdue' | 'sla_attention';
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

const REASON_META: Record<AttentionItem['reason'], { label: string; cls: string; icon: string }> = {
  new_docs:         { label: 'New documents uploaded', cls: 'txd-reason-new',       icon: '📄' },
  overdue_reupload: { label: 'Re-upload pending >3 days', cls: 'txd-reason-stalled', icon: '🔁' },
  sla_overdue:      { label: 'No update in 7+ days',  cls: 'txd-reason-overdue',   icon: '⚠️' },
  sla_attention:    { label: 'No update in 3+ days',  cls: 'txd-reason-attention', icon: '⏰' },
};

const STATUS_BADGE: Record<string, string> = {
  pending:             'aq-badge-pending',
  documents_required:  'aq-badge-docs',
  documents_received:  'aq-badge-docs',
  in_progress:         'aq-badge-active',
  under_review:        'aq-badge-review',
  invoice_pending:     'aq-badge-invoice',
  completed:           'aq-badge-done',
  on_hold:             'aq-badge-hold',
};

const EVENT_ICON: Record<string, string> = {
  status_changed:                '🔄',
  document_approved:             '✅',
  document_rejected:             '❌',
  document_reupload_requested:   '🔁',
  optional_document_added:       '📎',
  texpert_assigned:              '👤',
  task_added:                    '📋',
  texpert_note:                  '📝',
  pinned_updated:                '📌',
  payout_recorded:               '💰',
  payment_captured:              '💳',
  default:                       '📋',
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

// ── Main page ─────────────────────────────────────────────────

export default function TexpertDashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['tx-dashboard'],
    queryFn:  async () => (await apiClient.get('/texpert/dashboard')).data.data,
    enabled:  isTexpert,
    refetchInterval: 60_000, // gentle 1-min refresh
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isTexpert)  return <Navigate to="/dashboard" replace />;

  const stats     = data?.stats;
  const attention = data?.needs_attention ?? [];
  const activity  = data?.recent_activity  ?? [];

  // Compute the one-line tip
  let tip = "You're all caught up.";
  if (stats) {
    if (stats.pendingReview > 0 && attention.length > 0) {
      tip = `${attention.length} service${attention.length !== 1 ? 's' : ''} need${attention.length === 1 ? 's' : ''} your attention.`;
    } else if (stats.activeServices === 0 && stats.queueOpen > 0) {
      tip = `${stats.queueOpen} open service${stats.queueOpen !== 1 ? 's' : ''} in the queue — go claim one.`;
    }
  }

  return (
    <div className="db-page-new">
      {/* Header */}
      <div className="txd-greeting">
        <div>
          <h1 className="txd-greeting-line">
            {greeting()}, <span className="txd-name">{profile?.first_name ?? ''}</span>
          </h1>
          <p className="txd-greeting-sub">
            <span>{todayLabel()}</span>
            <span className="txd-dot">·</span>
            <span style={{ fontWeight: 500 }}>{tip}</span>
          </p>
        </div>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="txd-kpi-row">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="txd-kpi"><div className="tx-skeleton" style={{ height: 28, width: '50%' }} /></div>
          ))}
        </div>
      ) : isError ? (
        <div className="db-alert-error">Failed to load dashboard. Please refresh.</div>
      ) : (
        <div className="txd-kpi-row">
          <div className="txd-kpi" onClick={() => navigate('/texpert/services')}>
            <div className="txd-kpi-label">Active Services</div>
            <div className="txd-kpi-value">{stats?.activeServices ?? 0}</div>
            <div className="txd-kpi-sub">Currently working on</div>
          </div>
          <div className="txd-kpi" style={{ borderTop: '3px solid var(--gold-500)' }} onClick={() => navigate('/texpert/services?status=documents_received')}>
            <div className="txd-kpi-label">Pending Review</div>
            <div className="txd-kpi-value" style={{ color: stats && stats.pendingReview > 0 ? 'var(--gold-600)' : undefined }}>
              {stats?.pendingReview ?? 0}
            </div>
            <div className="txd-kpi-sub">Docs awaiting your action</div>
          </div>
          <div className="txd-kpi" style={{ borderTop: '3px solid var(--green-500)' }} onClick={() => navigate('/texpert/services?status=completed')}>
            <div className="txd-kpi-label">Completed This Month</div>
            <div className="txd-kpi-value">{stats?.completedThisMonth ?? 0}</div>
            <div className="txd-kpi-sub">Services finished</div>
          </div>
          <div className="txd-kpi" style={{ borderTop: '3px solid #10b981' }}>
            <div className="txd-kpi-label">Earnings This Month</div>
            <div className="txd-kpi-value">{formatRupees(stats?.earningsThisMonth ?? 0)}</div>
            <div className="txd-kpi-sub">Total: {formatRupees(stats?.totalEarned ?? 0)}</div>
          </div>
          <div className="txd-kpi" style={{ borderTop: '3px solid #3b82f6' }} onClick={() => navigate('/texpert/queue')}>
            <div className="txd-kpi-label">In Queue</div>
            <div className="txd-kpi-value">{stats?.queueOpen ?? 0}</div>
            <div className="txd-kpi-sub">Available to claim</div>
          </div>
        </div>
      )}

      {/* Two-column body */}
      <div className="txd-cols">
        {/* Needs Attention */}
        <div className="txd-panel">
          <div className="txd-panel-head">
            <h3 className="txd-panel-title">Needs Attention</h3>
            <span className="txd-panel-count">{attention.length}</span>
          </div>

          {isLoading ? (
            <div style={{ padding: '1rem' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="tx-skeleton" style={{ height: 50, marginBottom: 6 }} />)}
            </div>
          ) : attention.length === 0 ? (
            <div className="txd-empty">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
              <p className="txd-empty-title">All caught up</p>
              <p className="txd-empty-sub">
                {stats?.queueOpen ? 'Check the queue to claim more work.' : 'New work will appear as clients upload documents.'}
              </p>
              {(stats?.queueOpen ?? 0) > 0 && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/texpert/queue')}>
                  Browse Queue ({stats?.queueOpen})
                </button>
              )}
            </div>
          ) : (
            <div className="txd-attention-list">
              {attention.map(a => {
                const meta = REASON_META[a.reason];
                return (
                  <div
                    key={a.id}
                    className={`txd-attention-row ${meta.cls}`}
                    onClick={() => navigate(`/texpert/services/${a.id}`)}
                  >
                    <div className="txd-attention-icon">{meta.icon}</div>
                    <div className="txd-attention-body">
                      <div className="txd-attention-svc">
                        {a.service_name}
                        {a.fiscal_year && <span className="txd-attention-fy">· {a.fiscal_year}</span>}
                      </div>
                      <div className="txd-attention-client">
                        {a.client_display}
                        <span className="txd-dot">·</span>
                        <span className={`aq-badge ${STATUS_BADGE[a.status] ?? 'aq-badge-pending'}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="txd-attention-reason">{meta.label}</div>
                    </div>
                    <div className="txd-attention-arrow">→</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="txd-panel">
          <div className="txd-panel-head">
            <h3 className="txd-panel-title">Recent Activity</h3>
            <span className="txd-panel-count">{activity.length}</span>
          </div>

          {isLoading ? (
            <div style={{ padding: '1rem' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="tx-skeleton" style={{ height: 40, marginBottom: 6 }} />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="txd-empty">
              <p className="txd-empty-title">No activity yet</p>
              <p className="txd-empty-sub">Actions on your assigned services will appear here.</p>
            </div>
          ) : (
            <div className="txd-activity-list">
              {activity.map(ev => (
                <div
                  key={ev.id}
                  className="txd-activity-row"
                  onClick={() => navigate(`/texpert/services/${ev.client_service_id}`)}
                >
                  <div className="txd-activity-icon">{EVENT_ICON[ev.event_type] ?? EVENT_ICON.default}</div>
                  <div className="txd-activity-body">
                    <div className="txd-activity-msg">{ev.message}</div>
                    <div className="txd-activity-meta">
                      <span className="txd-activity-svc">{ev.service_name}</span>
                      {ev.client_first_name && (
                        <>
                          <span className="txd-dot">·</span>
                          <span>{ev.client_first_name}</span>
                        </>
                      )}
                      <span className="txd-dot">·</span>
                      <span>{fmtRelative(ev.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
