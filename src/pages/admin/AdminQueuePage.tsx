import { useState } from 'react';
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

// ── Helpers ───────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending:            'aq-badge-pending',
    documents_required: 'aq-badge-docs',
    in_progress:        'aq-badge-active',
    under_review:       'aq-badge-review',
    completed:          'aq-badge-done',
    on_hold:            'aq-badge-hold',
  };
  return (
    <span className={`aq-badge ${map[status] ?? 'aq-badge-pending'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function priorityChip(priority: number) {
  const tier  = priority > 5 ? 'high' : priority > 0 ? 'med' : 'low';
  const label = priority > 5 ? 'High' : priority > 0 ? 'Medium' : 'Normal';
  return <span className={`aq-priority aq-priority-${tier}`}>{label}</span>;
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
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Assign Taxpert</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p className="aq-modal-service">
            {item.client_service?.service?.name}
            {item.client_service?.fiscal_year ? ` · ${item.client_service.fiscal_year}` : ''}
            {' — '}{clientName}
          </p>
          <div className="form-group">
            <label className="form-label">Select Taxpert</label>
            <select className="form-input" value={selectedTexpertId} onChange={e => setSelectedTexpertId(e.target.value)}>
              <option value="">-- Choose a Taxpert --</option>
              {(taxperts ?? []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.email})
                </option>
              ))}
            </select>
          </div>
          {assign.isError && (
            <p className="aq-modal-error">{(assign.error as any)?.response?.data?.error ?? 'Assignment failed'}</p>
          )}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!selectedTexpertId || assign.isPending}
            onClick={() => assign.mutate()}
          >
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
        // Refresh list so the already-claimed row disappears
        qc.invalidateQueries({ queryKey: ['admin-queue'] });
      }
    },
  });

  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Claim This Service</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p className="aq-modal-service">
            {item.client_service?.service?.name}
            {item.client_service?.fiscal_year ? ` · ${item.client_service.fiscal_year}` : ''}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-600)', lineHeight: 1.6 }}>
            You will be assigned to this service. The full client information will become visible to you.
            You can release the service back to the queue later if needed.
          </p>

          {conflictError && (
            <div className="db-alert-error" style={{ fontSize: '0.85rem' }}>
              Another texpert claimed this service just before you. The queue has been refreshed.
            </div>
          )}
          {claim.isError && !conflictError && (
            <p className="aq-modal-error">
              {(claim.error as any)?.response?.data?.error ?? 'Failed to claim. Please try again.'}
            </p>
          )}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {conflictError ? 'Close' : 'Cancel'}
          </button>
          {!conflictError && (
            <button
              className="btn btn-primary"
              disabled={claim.isPending}
              onClick={() => claim.mutate()}
            >
              {claim.isPending ? 'Claiming…' : 'Claim Service'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function AdminQueuePage() {
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
    return <div className="page-loader"><div className="page-loader-ring" /></div>;
  }
  if (!canAccess) return <Navigate to="/dashboard" replace />;

  const items = data ?? [];

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">{isAdmin ? 'Assignment Queue' : 'Open Queue'}</h1>
          <p className="db-page-sub">
            {isAdmin
              ? 'Open service tickets waiting for a Taxpert to be assigned.'
              : 'Available services you can claim. Client info is masked until you claim.'}
          </p>
        </div>
      </div>

      {error && <div className="db-alert-error">Failed to load queue. Please refresh.</div>}

      {items.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">{isAdmin ? 'Queue is empty' : 'No open services right now'}</p>
          <p className="db-empty-desc">
            {isAdmin
              ? 'All services have been assigned. New tickets will appear here.'
              : 'Check back soon — new services come in throughout the day.'}
          </p>
        </div>
      ) : (
        <div className="aq-table-wrap">
          <table className="aq-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Client</th>
                <th>FY</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                // Render client based on what we got back — admin gets full, texpert gets masked.
                const client = item.client_service?.client;
                let clientLine = '—';
                let clientSub  = '';
                if (client) {
                  if (client.display_name) {
                    // Texpert view: masked
                    clientLine = client.display_name;
                    clientSub  = 'Full info revealed after claim';
                  } else {
                    // Admin view: full
                    clientLine = `${client.first_name} ${client.last_name ?? ''}`.trim();
                    clientSub  = client.email ?? '';
                  }
                }

                return (
                  <tr key={item.id}>
                    <td className="aq-td-service">{item.client_service?.service?.name ?? '—'}</td>
                    <td>
                      <div className="aq-client-name">{clientLine}</div>
                      {clientSub && <div className="aq-client-email">{clientSub}</div>}
                    </td>
                    <td>{item.client_service?.fiscal_year ?? '—'}</td>
                    <td>{statusBadge(item.client_service?.status ?? '')}</td>
                    <td>{priorityChip(item.priority)}</td>
                    <td>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td>
                      {isAdmin && (
                        <button className="btn btn-sm btn-primary" onClick={() => setAssignItem(item)}>
                          Assign
                        </button>
                      )}
                      {isTexpert && (
                        <button className="btn btn-sm btn-gold" onClick={() => setClaimItem(item)}>
                          Claim
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {assignItem && <AssignModal item={assignItem} onClose={() => setAssignItem(null)} />}
      {claimItem  && <ClaimModal  item={claimItem}  onClose={() => setClaimItem(null)} />}
    </div>
  );
}
