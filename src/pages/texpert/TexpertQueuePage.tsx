import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────

// Admin queue payload has full client info; texpert queue payload has masked.
interface QueueItem {
  id: string;
  priority: number;
  created_at: string;
  client_service: {
    id: string;
    fiscal_year: string | null;
    status: string;
    service: { name: string; slug: string } | null;
    client: {
      first_name: string;
      last_name?: string;
      last_initial?: string;
      display_name?: string;
      email?: string;
    } | null;
  } | null;
}

interface Taxpert {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const STATUS_TONE: Record<string, string> = {
  pending:            'adm-badge--neutral',
  documents_required: 'adm-badge--amber',
  documents_received: 'adm-badge--green',
  in_progress:        'adm-badge--blue',
  under_review:       'adm-badge--accent',
  completed:          'adm-badge--green',
  on_hold:            'adm-badge--neutral',
};

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

function statusBadge(status: string) {
  return (
    <span className={`adm-badge ${STATUS_TONE[status] ?? 'adm-badge--neutral'}`}>
      <span className="adm-badge-dot" />{status.replace(/_/g, ' ')}
    </span>
  );
}

function priorityChip(priority: number) {
  const tier  = priority > 5 ? 'high' : priority > 0 ? 'med' : 'low';
  const label = priority > 5 ? 'High' : priority > 0 ? 'Medium' : 'Normal';
  return <span className={`adm-pill adm-pill--${tier}`}>{label}</span>;
}

// ── Admin: Assign modal ───────────────────────────────────────

function AssignModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedTexpertId, setSelectedTexpertId] = useState('');

  const { data: taxperts } = useQuery<Taxpert[]>({
    queryKey: ['taxperts-active'],
    queryFn: async () => (await apiClient.get('/admin/taxperts/active')).data.data ?? [],
  });

  const assign = useMutation({
    mutationFn: () => apiClient.post('/admin/assign', {
      clientServiceId: item.client_service?.id,
      texpertId:       selectedTexpertId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-queue'] });
      onClose();
    },
  });

  const clientName = item.client_service?.client?.first_name
    ? `${item.client_service.client.first_name} ${item.client_service.client.last_name ?? ''}`.trim()
    : 'Client';

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Assignment</p>
            <h3 className="adm-modal-title">Assign Taxpert</h3>
            <p className="adm-modal-sub">
              {item.client_service?.service?.name}
              {item.client_service?.fiscal_year ? ` · ${item.client_service.fiscal_year}` : ''}
              {' — '}{clientName}
            </p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Select Taxpert</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={selectedTexpertId} onChange={e => setSelectedTexpertId(e.target.value)}>
                <option value="">— Choose a Taxpert —</option>
                {(taxperts ?? []).map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.email})</option>
                ))}
              </select>
              <span className="adm-select-ico">{Icon.chevronD}</span>
            </div>
          </div>
          {assign.isError && (
            <p className="adm-modal-err">{Icon.alert}{(assign.error as any)?.response?.data?.error ?? 'Assignment failed'}</p>
          )}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={!selectedTexpertId || assign.isPending} onClick={() => assign.mutate()}>
            {assign.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Texpert: Claim confirm modal ──────────────────────────────

function ClaimModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [conflictError, setConflictError] = useState(false);

  const claim = useMutation({
    mutationFn: () => apiClient.post(`/texpert/queue/${item.id}/claim`),
    onSuccess: (res) => {
      const csId = res.data?.clientServiceId;
      qc.invalidateQueries({ queryKey: ['admin-queue'] });
      onClose();
      if (csId) navigate(`/texpert/services/${csId}`);
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setConflictError(true);
        qc.invalidateQueries({ queryKey: ['admin-queue'] });
      }
    },
  });

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Open Queue</p>
            <h3 className="adm-modal-title">Claim this service</h3>
            <p className="adm-modal-sub">
              {item.client_service?.service?.name}
              {item.client_service?.fiscal_year ? ` · ${item.client_service.fiscal_year}` : ''}
            </p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--lp-ink-muted)', lineHeight: 1.6, margin: 0 }}>
            You will be assigned to this service. The full client information will become visible to you.
            You can release the service back to the queue later if needed.
          </p>

          {conflictError && (
            <p className="adm-modal-err">{Icon.alert}Another texpert claimed this service just before you. The queue has been refreshed.</p>
          )}
          {claim.isError && !conflictError && (
            <p className="adm-modal-err">{Icon.alert}{(claim.error as any)?.response?.data?.error ?? 'Failed to claim. Please try again.'}</p>
          )}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>{conflictError ? 'Close' : 'Cancel'}</button>
          {!conflictError && (
            <button className="adm-btn adm-btn--accent" disabled={claim.isPending} onClick={() => claim.mutate()}>
              {claim.isPending ? 'Claiming…' : 'Claim Service'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function TexpertQueuePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [assignItem, setAssignItem] = useState<QueueItem | null>(null);
  const [claimItem,  setClaimItem]  = useState<QueueItem | null>(null);

  const role      = profile?.role;
  const isAdmin   = role === 'admin' || role === 'super_admin';
  const isTexpert = role === 'expert' || role === 'ca';
  const canAccess = isAdmin || isTexpert;

  const queueEndpoint = isAdmin ? '/admin/queue' : '/texpert/queue';

  const { data, isLoading, error } = useQuery<QueueItem[]>({
    queryKey: ['admin-queue', role],
    queryFn: async () => (await apiClient.get(queueEndpoint)).data.data ?? [],
    enabled:  canAccess,
  });

  if (authLoading || isLoading) {
    return <div className="page-loader"><Loader /></div>;
  }
  if (!canAccess) return <Navigate to="/dashboard" replace />;

  const items = data ?? [];
  const highPriority = items.filter(i => i.priority > 5).length;

  return (
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— {isAdmin ? 'Assignment' : 'Available work'}</p>
            <h1 className="adm-hero-title">{isAdmin ? 'Assignment Queue' : 'Open Queue'}</h1>
            <p className="adm-hero-date">
              {isAdmin
                ? 'Open service tickets waiting for a Taxpert to be assigned.'
                : 'Available services you can claim. Client info is masked until you claim.'}
            </p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{items.length}</div><div className="adm-hero-stat-lbl">Open</div></div>
            {highPriority > 0 && (
              <div className="adm-hero-stat"><div className="adm-hero-stat-val">{highPriority}</div><div className="adm-hero-stat-lbl">High Priority</div></div>
            )}
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">Queue{items.length > 0 && <span className="adm-count">{items.length}</span>}</h2>
            <p className="adm-panel-desc">
              {isAdmin ? 'Assign each ticket to an available Taxpert.' : 'Claim a ticket to reveal full client details and begin work.'}
            </p>
          </div>
        </div>

        {error && <div className="adm-banner adm-banner--err">{Icon.alert}Failed to load queue. Please refresh.</div>}

        {items.length === 0 && !error ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">
              {isAdmin
                ? 'Queue is empty — all services have been assigned.'
                : 'No open services right now. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Client</th>
                  <th>FY</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Added</th>
                  <th className="adm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const client = item.client_service?.client;
                  let clientLine = '—';
                  let clientSub  = '';
                  if (client) {
                    if (client.display_name) {
                      clientLine = client.display_name;
                      clientSub  = 'Full info revealed after claim';
                    } else {
                      clientLine = `${client.first_name} ${client.last_name ?? ''}`.trim();
                      clientSub  = client.email ?? '';
                    }
                  }

                  return (
                    <tr key={item.id}>
                      <td><div className="adm-tbl-name">{item.client_service?.service?.name ?? '—'}</div></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--lp-ink)' }}>{clientLine}</div>
                        {clientSub && <div className="adm-row-desc">{clientSub}</div>}
                      </td>
                      <td className="adm-mono">{item.client_service?.fiscal_year ?? '—'}</td>
                      <td>{statusBadge(item.client_service?.status ?? '')}</td>
                      <td>{priorityChip(item.priority)}</td>
                      <td className="adm-mono">{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td className="adm-cell-actions">
                        <div className="adm-actions">
                          {isAdmin && (
                            <button className="adm-btn adm-btn--sm adm-btn--accent" onClick={() => setAssignItem(item)}>Assign</button>
                          )}
                          {isTexpert && (
                            <button className="adm-btn adm-btn--sm adm-btn--accent" onClick={() => setClaimItem(item)}>Claim</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {assignItem && <AssignModal item={assignItem} onClose={() => setAssignItem(null)} />}
      {claimItem  && <ClaimModal  item={claimItem}  onClose={() => setClaimItem(null)} />}
    </div>
  );
}
