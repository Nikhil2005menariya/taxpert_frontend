import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'aq-badge-pending',
    documents_required: 'aq-badge-docs',
    in_progress: 'aq-badge-active',
    under_review: 'aq-badge-review',
    completed: 'aq-badge-done',
    on_hold: 'aq-badge-hold',
  };
  return (
    <span className={`aq-badge ${map[status] ?? 'aq-badge-pending'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

interface QueueItem {
  id: string;
  priority: number;
  created_at: string;
  client_service: {
    id: string;
    fiscal_year: string | null;
    status: string;
    service: { name: string; slug: string } | null;
    client: { first_name: string; last_name: string; email: string } | null;
  } | null;
}

interface Taxpert {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

function AssignModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedTexpertId, setSelectedTexpertId] = useState('');

  const { data: taxperts } = useQuery<Taxpert[]>({
    queryKey: ['taxperts-active'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/taxperts/active');
      return res.data.data ?? [];
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      await apiClient.post('/admin/assign', {
        clientServiceId: item.client_service?.id,
        texpertId: selectedTexpertId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      onClose();
    },
  });

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
            {' — '}
            {item.client_service?.client?.first_name} {item.client_service?.client?.last_name}
          </p>
          <div className="form-group">
            <label className="form-label">Select Taxpert</label>
            <select
              className="form-input"
              value={selectedTexpertId}
              onChange={e => setSelectedTexpertId(e.target.value)}
            >
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

export default function AdminQueuePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [assignItem, setAssignItem] = useState<QueueItem | null>(null);
  const queryClient = useQueryClient();

  const role = profile?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isTexpert = role === 'expert' || role === 'ca';
  const canAccess = isAdmin || isTexpert;

  const queueEndpoint = isAdmin ? '/admin/queue' : '/texpert/queue';

  const { data, isLoading, error } = useQuery<QueueItem[]>({
    queryKey: ['admin-queue', role],
    queryFn: async () => {
      const res = await apiClient.get(queueEndpoint);
      return res.data.data ?? [];
    },
    enabled: canAccess,
  });

  const claim = useMutation({
    mutationFn: async (queueId: string) => {
      await apiClient.post(`/texpert/queue/${queueId}/claim`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-queue'] }),
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
          <h1 className="db-page-title">Assignment Queue</h1>
          <p className="db-page-sub">Open service tickets waiting for a Taxpert to be assigned.</p>
        </div>
      </div>

      {error && (
        <div className="db-alert-error">Failed to load queue. Please refresh.</div>
      )}

      {items.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">Queue is empty</p>
          <p className="db-empty-desc">All services have been assigned. New tickets will appear here.</p>
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
              {items.map(item => (
                <tr key={item.id}>
                  <td className="aq-td-service">{item.client_service?.service?.name ?? '—'}</td>
                  <td>
                    <div className="aq-client-name">
                      {item.client_service?.client?.first_name} {item.client_service?.client?.last_name}
                    </div>
                    <div className="aq-client-email">{item.client_service?.client?.email}</div>
                  </td>
                  <td>{item.client_service?.fiscal_year ?? '—'}</td>
                  <td>{statusBadge(item.client_service?.status ?? '')}</td>
                  <td>
                    <span className={`aq-priority aq-priority-${item.priority > 5 ? 'high' : item.priority > 0 ? 'med' : 'low'}`}>
                      {item.priority > 5 ? 'High' : item.priority > 0 ? 'Medium' : 'Normal'}
                    </span>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td>
                    {isAdmin && (
                      <button className="btn btn-sm btn-primary" onClick={() => setAssignItem(item)}>
                        Assign
                      </button>
                    )}
                    {isTexpert && (
                      <button
                        className="btn btn-sm btn-gold"
                        disabled={claim.isPending}
                        onClick={() => claim.mutate(item.id)}
                      >
                        {claim.isPending ? '…' : 'Claim'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignItem && <AssignModal item={assignItem} onClose={() => setAssignItem(null)} />}
    </div>
  );
}
