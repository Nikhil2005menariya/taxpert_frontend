import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type Tab = 'services' | 'payouts' | 'profile';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'aq-badge-pending',
    documents_required: 'aq-badge-docs',
    in_progress: 'aq-badge-active',
    under_review: 'aq-badge-review',
    completed: 'aq-badge-done',
    on_hold: 'aq-badge-hold',
    invoice_pending: 'aq-badge-invoice',
    cancelled: 'aq-badge-hold',
  };
  return <span className={`aq-badge ${map[status] ?? 'aq-badge-pending'}`}>{status.replace(/_/g, ' ')}</span>;
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
    onSuccess: () => navigate('/admin/taxperts'),
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (error) return <div className="db-page-new"><div className="db-alert-error">Taxpert not found.</div></div>;

  const { profile: tp, services = [], payouts = [] } = data ?? {};
  if (!tp) return null;

  const totalPayout = payouts.reduce((s: number, p: any) => s + p.amount, 0);

  function startEdit() {
    setEditForm({ first_name: tp.first_name, last_name: tp.last_name, mobile: tp.mobile ?? '' });
    setEditing(true);
  }

  return (
    <div className="db-page-new">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <div className="aq-back-link" onClick={() => navigate('/admin/taxperts')}>← Taxperts</div>
          <h1 className="db-page-title">{tp.first_name} {tp.last_name}</h1>
          <p className="db-page-sub">{tp.email} · {tp.is_active ? 'Active' : 'Inactive'}</p>
        </div>
        <div className="aq-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
          {tp.is_active && (
            <button className="btn btn-sm" style={{ background: 'var(--red-600)', color: '#fff' }}
              onClick={() => { if (confirm('Deactivate this taxpert?')) deactivate.mutate(); }}>
              Deactivate
            </button>
          )}
          <button className="btn btn-sm" style={{ background: 'var(--red-600)', color: '#fff' }}
            onClick={() => { if (confirm('Permanently delete this taxpert? This cannot be undone.')) remove.mutate(); }}>
            Remove
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Services</div>
          <div className="db-stat-card-value">{services.length}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Completed</div>
          <div className="db-stat-card-value">{services.filter((s: any) => s.status === 'completed').length}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Paid</div>
          <div className="db-stat-card-value">₹{(totalPayout / 100).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="aq-tabs">
        {(['services', 'payouts', 'profile'] as Tab[]).map(t => (
          <button key={t} className={`aq-tab ${tab === t ? 'aq-tab-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Services tab */}
      {tab === 'services' && (
        services.length === 0 ? (
          <div className="db-empty-card">
            <p className="db-empty-title">No services assigned yet</p>
          </div>
        ) : (
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead><tr><th>Service</th><th>Client</th><th>FY</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {services.map((s: any) => (
                  <tr key={s.id}>
                    <td className="aq-td-service">{s.service?.name ?? '—'}</td>
                    <td>{s.client?.first_name} {s.client?.last_name}</td>
                    <td>{s.fiscal_year ?? '—'}</td>
                    <td>{statusBadge(s.status)}</td>
                    <td>{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Payouts tab */}
      {tab === 'payouts' && (
        payouts.length === 0 ? (
          <div className="db-empty-card">
            <p className="db-empty-title">No payouts recorded</p>
          </div>
        ) : (
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead><tr><th>Service</th><th>FY</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.client_service?.service?.name ?? '—'}</td>
                    <td>{p.client_service?.fiscal_year ?? '—'}</td>
                    <td className="aq-td-amount">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                    <td>{new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td className="aq-client-email">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="aq-profile-card">
          <div className="aq-profile-row"><span className="aq-profile-label">Email</span><span>{tp.email}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">Mobile</span><span>{tp.mobile ?? '—'}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">PAN</span><span>{tp.pan ?? '—'}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">Role</span><span>{tp.role}</span></div>
          <div className="aq-profile-row"><span className="aq-profile-label">Status</span>
            <span className={`aq-badge ${tp.is_active ? 'aq-badge-done' : 'aq-badge-hold'}`}>{tp.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="aq-profile-row"><span className="aq-profile-label">Joined</span>
            <span>{new Date(tp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="aq-modal-overlay" onClick={() => setEditing(false)}>
          <div className="aq-modal" onClick={e => e.stopPropagation()}>
            <div className="aq-modal-header">
              <h3 className="aq-modal-title">Edit Taxpert</h3>
              <button className="aq-modal-close" onClick={() => setEditing(false)}>✕</button>
            </div>
            <div className="aq-modal-body">
              <div className="aq-form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} />
              </div>
            </div>
            <div className="aq-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={update.isPending} onClick={() => update.mutate()}>
                {update.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
