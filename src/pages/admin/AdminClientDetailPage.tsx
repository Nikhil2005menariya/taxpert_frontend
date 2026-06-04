import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type Tab = 'services' | 'profile';

const STATUS_TONE: Record<string, string> = {
  pending: 'adm-badge--neutral',
  documents_required: 'adm-badge--amber',
  in_progress: 'adm-badge--blue',
  under_review: 'adm-badge--accent',
  completed: 'adm-badge--green',
  on_hold: 'adm-badge--amber',
  payment: 'adm-badge--accent',
  cancelled: 'adm-badge--red',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`adm-badge ${STATUS_TONE[status] ?? 'adm-badge--neutral'}`}>
      <span className="adm-badge-dot" />{status.replace(/_/g, ' ')}
    </span>
  );
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
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Assignment</p>
            <h3 className="adm-modal-title">Assign Taxpert</h3>
            <p className="adm-modal-sub">{clientServiceLabel}</p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Select Taxpert</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={texpertId} onChange={e => setTexpertId(e.target.value)}>
                <option value="">Choose a Taxpert…</option>
                {(taxperts ?? []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
              <span className="adm-select-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
          </div>
          {assign.isError && (
            <p className="adm-modal-err">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              {(assign.error as any)?.response?.data?.error ?? 'Failed to assign.'}
            </p>
          )}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={!texpertId || assign.isPending} onClick={() => assign.mutate()}>
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
  if (error) return <div className="adm-root"><div className="adm-banner adm-banner--err">Client not found.</div></div>;

  const { profile: client, services = [] } = data ?? {};
  if (!client) return null;

  const activeServices = services.filter((s: any) => s.status !== 'completed' && s.status !== 'cancelled').length;
  const completed = services.filter((s: any) => s.status === 'completed').length;

  const ArrowR = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );

  return (
    <div className="adm-root">
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <button className="adm-back" onClick={() => navigate('/admin/users?tab=clients')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Users
        </button>
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Client</p>
            <h1 className="adm-hero-title">{client.first_name} {client.last_name}</h1>
            <p className="adm-hero-date">{client.email} · PAN {client.pan}</p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{services.length}</div><div className="adm-hero-stat-lbl">Services</div></div>
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{activeServices}</div><div className="adm-hero-stat-lbl">Active</div></div>
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{completed}</div><div className="adm-hero-stat-lbl">Completed</div></div>
          </div>
        </div>
      </header>

      <nav className="adm-seg" role="tablist">
        {(['services', 'profile'] as Tab[]).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} className={`adm-seg-btn${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'services' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
            )}
            {t === 'services' ? 'Services' : 'Profile'}
          </button>
        ))}
      </nav>

      {tab === 'services' && (
        services.length === 0 ? (
          <div className="adm-panel">
            <div className="adm-empty-box">
              <span className="adm-empty-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              </span>
              <p className="adm-empty-txt">This client has not subscribed to any services.</p>
            </div>
          </div>
        ) : (
          <div className="adm-svc-grid">
            {services.map((s: any) => {
              const texpert = s.assigned_texpert;
              const docs: any[] = s.client_documents ?? [];
              const reuploads = docs.filter((d: any) => d.reupload_requested).length;
              return (
                <div key={s.id} className="adm-svc-card">
                  <div className="adm-svc-head">
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/admin/client-services/${s.id}`} className="adm-svc-name">
                        {s.service?.name ?? '—'}{ArrowR}
                      </Link>
                      <div className="adm-svc-meta">
                        {s.fiscal_year && <span className="adm-svc-fy">{s.fiscal_year}</span>}
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  </div>
                  <div className="adm-svc-foot">
                    <span className="adm-svc-docs">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                    {reuploads > 0 && <span className="adm-badge adm-badge--amber">{reuploads} reupload pending</span>}
                    <div style={{ marginLeft: 'auto' }}>
                      {texpert ? (
                        <span className="adm-chip-person">
                          <span className="adm-avatar">{texpert.first_name?.[0]}{texpert.last_name?.[0]}</span>
                          {texpert.first_name} {texpert.last_name}
                        </span>
                      ) : (
                        <button className="adm-btn adm-btn--accent adm-btn--sm"
                          onClick={() => setAssigningService({ id: s.id, label: `${s.service?.name}${s.fiscal_year ? ` (${s.fiscal_year})` : ''}` })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
                          Assign Taxpert
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'profile' && (
        <div className="adm-kv" style={{ maxWidth: 560 }}>
          <div className="adm-kv-row"><span className="adm-kv-label">Email</span><span className="adm-kv-val">{client.email}</span></div>
          <div className="adm-kv-row"><span className="adm-kv-label">Mobile</span><span className="adm-kv-val">{client.mobile ?? '—'}</span></div>
          <div className="adm-kv-row"><span className="adm-kv-label">PAN</span><span className="adm-kv-val"><code className="adm-code">{client.pan}</code></span></div>
          <div className="adm-kv-row">
            <span className="adm-kv-label">Status</span>
            <span className="adm-kv-val">
              <span className={`adm-badge ${client.is_active ? 'adm-badge--green' : 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{client.is_active ? 'Active' : 'Inactive'}</span>
            </span>
          </div>
          <div className="adm-kv-row"><span className="adm-kv-label">Joined</span><span className="adm-kv-val">{new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
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
