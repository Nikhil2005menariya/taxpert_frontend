import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

interface Taxpert { id: string; first_name: string; last_name: string; email: string; }

function RecordPayoutModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ texpertId: '', clientServiceId: '', amountRupees: '', notes: '' });
  const [error, setError] = useState('');

  const { data: taxperts } = useQuery<Taxpert[]>({
    queryKey: ['taxperts-active'],
    queryFn: async () => (await apiClient.get('/admin/taxperts/active')).data.data ?? [],
  });

  // When a texpert is selected, fetch their services so admin can pick one
  const { data: texpertServices } = useQuery({
    queryKey: ['texpert-services-select', form.texpertId],
    queryFn: async () => (await apiClient.get(`/admin/taxperts/${form.texpertId}/detail`)).data.services ?? [],
    enabled: !!form.texpertId,
  });

  const record = useMutation({
    mutationFn: async () => {
      const amount = Math.round(parseFloat(form.amountRupees) * 100);
      if (isNaN(amount) || amount <= 0) throw new Error('Enter a valid amount');
      await apiClient.post('/admin/payouts', {
        texpertId: form.texpertId,
        clientServiceId: form.clientServiceId,
        amount,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-payouts'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.error ?? e.message ?? 'Failed to record payout'),
  });

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); setError(''); }

  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Record Payout</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          {error && <p className="aq-modal-error">{error}</p>}
          <div className="form-group">
            <label className="form-label">Taxpert</label>
            <select className="form-input" value={form.texpertId} onChange={e => set('texpertId', e.target.value)}>
              <option value="">-- Select Taxpert --</option>
              {(taxperts ?? []).map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service</label>
            <select className="form-input" value={form.clientServiceId} onChange={e => set('clientServiceId', e.target.value)} disabled={!form.texpertId}>
              <option value="">-- Select Service --</option>
              {(texpertServices ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.service?.name ?? s.id}{s.fiscal_year ? ` (${s.fiscal_year})` : ''} — {s.client?.first_name} {s.client?.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" min="1" step="0.01" placeholder="e.g. 2500"
              value={form.amountRupees} onChange={e => set('amountRupees', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.texpertId || !form.clientServiceId || !form.amountRupees || record.isPending}
            onClick={() => record.mutate()}>
            {record.isPending ? 'Saving…' : 'Record Payout'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payouts', page],
    queryFn: async () => (await apiClient.get(`/admin/payouts?page=${page}&limit=20`)).data,
    enabled: isAdmin,
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const payouts = data?.data ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / 20);
  const totalPaid = payouts.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Payouts</h1>
          <p className="db-page-sub">Track and record taxpert payouts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Record Payout</button>
      </div>

      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Total Records</div>
          <div className="db-stat-card-value">{count}</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">This Page Total</div>
          <div className="db-stat-card-value">₹{(totalPaid / 100).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {error && <div className="db-alert-error">Failed to load payouts.</div>}

      {payouts.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">💰</span>
          <p className="db-empty-title">No payouts recorded</p>
          <p className="db-empty-desc">Record the first payout when a service is completed.</p>
          <div className="db-empty-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Record Payout</button>
          </div>
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th>Taxpert</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Recorded by</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p.id}>
                    <td className="aq-td-name">{p.texpert?.first_name} {p.texpert?.last_name}
                      <div className="aq-client-email">{p.texpert?.email}</div>
                    </td>
                    <td>{p.client_service?.service?.name ?? '—'}{p.client_service?.fiscal_year ? ` (${p.client_service.fiscal_year})` : ''}</td>
                    <td className="aq-td-name">{p.client ? `${p.client.first_name} ${p.client.last_name}` : '—'}</td>
                    <td className="aq-td-amount">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                    <td>{new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td>{p.recorded_by_user?.first_name} {p.recorded_by_user?.last_name}</td>
                    <td className="aq-client-email">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="aq-pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="aq-pagination-info">Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {showModal && <RecordPayoutModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
