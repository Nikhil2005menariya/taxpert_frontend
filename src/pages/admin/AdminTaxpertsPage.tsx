import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

interface Taxpert {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  total_services: number;
  completed_services: number;
  total_payout_paise: number;
}

function CreateTexpertModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', mobile: '', pan: '', password: '' });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      await apiClient.post('/admin/taxperts/new', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-taxperts'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Failed to create taxpert'),
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Add Taxpert</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          {error && <p className="aq-modal-error">{error}</p>}
          <div className="aq-form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="aq-form-row">
            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input className="form-input" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">PAN</label>
              <input className="form-input" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} maxLength={10} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Creating…' : 'Create Taxpert'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTaxpertsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery<Taxpert[]>({
    queryKey: ['admin-taxperts'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/taxperts');
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const taxperts = data ?? [];
  const active = taxperts.filter(t => t.is_active).length;
  const totalCompleted = taxperts.reduce((s, t) => s + t.completed_services, 0);
  const totalPayout = taxperts.reduce((s, t) => s + t.total_payout_paise, 0);

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Taxperts</h1>
          <p className="db-page-sub">Manage your team of tax experts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Taxpert</button>
      </div>

      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Taxperts</div>
          <div className="db-stat-card-value">{taxperts.length}</div>
          <div className="db-stat-card-sub">{active} active</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Services Completed</div>
          <div className="db-stat-card-value">{totalCompleted}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Payouts</div>
          <div className="db-stat-card-value">₹{(totalPayout / 100).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {error && <div className="db-alert-error">Failed to load taxperts.</div>}

      {taxperts.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">👤</span>
          <p className="db-empty-title">No taxperts yet</p>
          <p className="db-empty-desc">Add your first taxpert to start assigning services.</p>
          <div className="db-empty-actions">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Add Taxpert</button>
          </div>
        </div>
      ) : (
        <div className="aq-table-wrap">
          <table className="aq-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Active Services</th>
                <th>Completed</th>
                <th>Total Payout</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {taxperts.map(t => (
                <tr key={t.id}>
                  <td className="aq-td-name">{t.first_name} {t.last_name}</td>
                  <td className="aq-client-email">{t.email}</td>
                  <td>{t.total_services - t.completed_services}</td>
                  <td>{t.completed_services}</td>
                  <td>₹{(t.total_payout_paise / 100).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`aq-badge ${t.is_active ? 'aq-badge-done' : 'aq-badge-hold'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/taxperts/${t.id}`} className="btn btn-sm btn-secondary">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTexpertModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
