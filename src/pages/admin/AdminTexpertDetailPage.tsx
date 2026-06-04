import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate } from 'react-router-dom';
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

export default function AdminTexpertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('services');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', mobile: '' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-texpert-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/taxperts/${id}/detail`);
      return res.data;
    },
    enabled: isAdmin && !!id,
  });

  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/admin/taxperts/${id}`, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-texpert-detail', id] });
      setEditing(false);
    },
  });

  const deactivate = useMutation({
    mutationFn: async () => apiClient.patch(`/admin/taxperts/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-texpert-detail', id] }),
  });

  const remove = useMutation({
    mutationFn: async () => apiClient.delete(`/admin/taxperts/${id}`),
    onSuccess: () => navigate('/admin/users?tab=staff'),
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (error) return <div className="adm-root"><div className="adm-banner adm-banner--err">Taxpert not found.</div></div>;

  const { profile: tp, services = [] } = data ?? {};
  if (!tp) return null;

  const completed = services.filter((s: any) => s.status === 'completed').length;

  function startEdit() {
    setEditForm({ first_name: tp.first_name, last_name: tp.last_name, mobile: tp.mobile ?? '' });
    setEditing(true);
  }

  return (
    <div className="adm-root">
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <button className="adm-back" onClick={() => navigate('/admin/users?tab=staff')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Users
        </button>
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Taxpert</p>
            <h1 className="adm-hero-title">{tp.first_name} {tp.last_name}</h1>
            <p className="adm-hero-date">{tp.email} · {tp.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="adm-hero-aside" style={{ alignItems: 'flex-end' }}>
            <div className="adm-hero-stats">
              <div className="adm-hero-stat"><div className="adm-hero-stat-val">{services.length}</div><div className="adm-hero-stat-lbl">Services</div></div>
              <div className="adm-hero-stat"><div className="adm-hero-stat-val">{completed}</div><div className="adm-hero-stat-lbl">Completed</div></div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={startEdit} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: 'var(--lp-on-dark)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                Edit
              </button>
              {tp.is_active && (
                <button className="adm-btn adm-btn--danger adm-btn--sm"
                  onClick={() => { if (confirm('Deactivate this taxpert?')) deactivate.mutate(); }}>
                  Deactivate
                </button>
              )}
              <button className="adm-btn adm-btn--danger adm-btn--sm"
                onClick={() => { if (confirm('Permanently delete this taxpert? This cannot be undone.')) remove.mutate(); }}>
                Remove
              </button>
            </div>
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
              <p className="adm-empty-txt">No services assigned yet.</p>
            </div>
          </div>
        ) : (
          <section className="adm-panel">
            <div className="adm-tbl-wrap">
              <table className="adm-tbl">
                <thead><tr><th>Service</th><th>Client</th><th>FY</th><th>Status</th><th>Date</th><th className="adm-th-actions">Actions</th></tr></thead>
                <tbody>
                  {services.map((s: any) => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/client-services/${s.id}`)}>
                      <td><span style={{ fontWeight: 600, color: 'var(--lp-ink)' }}>{s.service?.name ?? '—'}</span></td>
                      <td>{s.client?.first_name} {s.client?.last_name}</td>
                      <td className="adm-mono">{s.fiscal_year ?? '—'}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="adm-mono">{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td className="adm-cell-actions">
                        <div className="adm-actions">
                          <span className="adm-view" aria-hidden="true">
                            View<span className="adm-view-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      )}

      {tab === 'profile' && (
        <div className="adm-kv" style={{ maxWidth: 560 }}>
          <div className="adm-kv-row"><span className="adm-kv-label">Email</span><span className="adm-kv-val">{tp.email}</span></div>
          <div className="adm-kv-row"><span className="adm-kv-label">Mobile</span><span className="adm-kv-val">{tp.mobile ?? '—'}</span></div>
          <div className="adm-kv-row"><span className="adm-kv-label">PAN</span><span className="adm-kv-val">{tp.pan ? <code className="adm-code">{tp.pan}</code> : '—'}</span></div>
          <div className="adm-kv-row"><span className="adm-kv-label">Role</span><span className="adm-kv-val" style={{ textTransform: 'capitalize' }}>{tp.role}</span></div>
          <div className="adm-kv-row">
            <span className="adm-kv-label">Status</span>
            <span className="adm-kv-val">
              <span className={`adm-badge ${tp.is_active ? 'adm-badge--green' : 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{tp.is_active ? 'Active' : 'Inactive'}</span>
            </span>
          </div>
          <div className="adm-kv-row"><span className="adm-kv-label">Joined</span><span className="adm-kv-val">{new Date(tp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        </div>
      )}

      {editing && (
        <div className="adm-modal-overlay" onClick={() => setEditing(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-head">
              <div>
                <p className="adm-modal-eyebrow">— Edit</p>
                <h3 className="adm-modal-title">Edit Taxpert</h3>
              </div>
              <button className="adm-modal-x" onClick={() => setEditing(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label className="adm-label">First Name</label>
                  <input className="adm-input" value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Last Name</label>
                  <input className="adm-input" value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="adm-field">
                <label className="adm-label">Mobile</label>
                <input className="adm-input" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} />
              </div>
            </div>
            <div className="adm-modal-foot">
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="adm-btn adm-btn--accent" disabled={update.isPending} onClick={() => update.mutate()}>
                {update.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
