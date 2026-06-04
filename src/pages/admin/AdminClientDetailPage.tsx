import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type Tab = 'services' | 'profile';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'aq-badge-pending',
    documents_required: 'aq-badge-docs',
    in_progress: 'aq-badge-active',
    under_review: 'aq-badge-review',
    completed: 'aq-badge-done',
    on_hold: 'aq-badge-hold',
    payment: 'aq-badge-invoice',
    cancelled: 'aq-badge-hold',
  };
  return <span className={`aq-badge ${map[status] ?? 'aq-badge-pending'}`}>{status.replace(/_/g, ' ')}</span>;
}

function AssignTexpertModal({
  clientServiceId, clientServiceLabel, onClose,
}: { clientServiceId: string; clientServiceLabel: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [texpertId, setTexpertId] = useState('');

  const { data: taxperts } = useQuery({
    queryKey: ['taxperts-active'],
    queryFn: async () => (await apiClient.get('/admin/taxperts/active')).data.data ?? [],
  });

  const assign = useMutation({
    mutationFn: async () => apiClient.post('/admin/assign', { clientServiceId, texpertId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-client-detail'] });
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
          <p className="aq-modal-service">{clientServiceLabel}</p>
          <div className="form-group">
            <label className="form-label">Select Taxpert</label>
            <select className="form-input" value={texpertId} onChange={e => setTexpertId(e.target.value)}>
              <option value="">-- Choose a Taxpert --</option>
              {(taxperts ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          {assign.isError && <p className="aq-modal-error">{(assign.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!texpertId || assign.isPending} onClick={() => assign.mutate()}>
            {assign.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('services');
  const [assigningService, setAssigningService] = useState<{ id: string; label: string } | null>(null);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client-detail', id],
    queryFn: async () => (await apiClient.get(`/admin/clients/${id}`)).data,
    enabled: isAdmin && !!id,
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (error) return <div className="db-page-new"><div className="db-alert-error">Client not found.</div></div>;

  const { profile: client, services = [] } = data ?? {};
  if (!client) return null;

  const activeServices = services.filter((s: any) => s.status !== 'completed' && s.status !== 'cancelled').length;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <div className="aq-back-link" onClick={() => navigate('/admin/users?tab=clients')}>← Users</div>
          <h1 className="db-page-title">{client.first_name} {client.last_name}</h1>
          <p className="db-page-sub">{client.email} · PAN: {client.pan}</p>
        </div>
      </div>

      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Services</div>
          <div className="db-stat-card-value">{services.length}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Active</div>
          <div className="db-stat-card-value">{activeServices}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Completed</div>
          <div className="db-stat-card-value">{services.filter((s: any) => s.status === 'completed').length}</div>
        </div>
      </div>

      <div className="aq-tabs">
        {(['services', 'profile'] as Tab[]).map(t => (
          <button key={t} className={`aq-tab ${tab === t ? 'aq-tab-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'services' && (
        services.length === 0 ? (
          <div className="db-empty-card">
            <p className="db-empty-title">No services yet</p>
            <p className="db-empty-desc">This client has not subscribed to any services.</p>
          </div>
        ) : (
          <div className="aq-service-cards">
            {services.map((s: any) => {
              const texpert = s.assigned_texpert;
              const docs: any[] = s.client_documents ?? [];
              const reuploads = docs.filter((d: any) => d.reupload_requested).length;
              return (
                <div key={s.id} className="aq-service-card" style={{ position: 'relative' }}>
                  <div className="aq-service-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        to={`/admin/client-services/${s.id}`}
                        className="aq-service-card-name"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {s.service?.name ?? '—'}
                        <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--ink-400)' }}>→</span>
                      </Link>
                      <div className="aq-service-card-meta">
                        {s.fiscal_year && <span>{s.fiscal_year}</span>}
                        {statusBadge(s.status)}
                      </div>
                    </div>
                    <div className="aq-service-card-actions">
                      {texpert ? (
                        <span className="aq-texpert-chip">
                          {texpert.first_name} {texpert.last_name}
                        </span>
                      ) : (
                        <button className="btn btn-sm btn-gold"
                          onClick={() => setAssigningService({ id: s.id, label: `${s.service?.name}${s.fiscal_year ? ` (${s.fiscal_year})` : ''}` })}>
                          Assign Taxpert
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="aq-service-card-docs">
                    <span className="aq-doc-count">{docs.length} documents</span>
                    {reuploads > 0 && (
                      <span className="aq-badge aq-badge-docs">{reuploads} reupload pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'profile' && (
        <div className="aq-profile-card">
          <div className="aq-profile-row"><span className="aq-profile-label">Email</span><span>{client.email}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">Mobile</span><span>{client.mobile ?? '—'}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">PAN</span><span className="aq-mono">{client.pan}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">Status</span>
            <span className={`aq-badge ${client.is_active ? 'aq-badge-done' : 'aq-badge-hold'}`}>
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="aq-profile-row"><span className="aq-profile-label">Joined</span>
            <span>{new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      )}

      {assigningService && (
        <AssignTexpertModal
          clientServiceId={assigningService.id}
          clientServiceLabel={assigningService.label}
          onClose={() => setAssigningService(null)}
        />
      )}
    </div>
  );
}
