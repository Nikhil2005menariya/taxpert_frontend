import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// Keys whose values are stored in paise and should be shown as ₹ in audit details
const PAISE_KEYS = new Set([
  'amountPaise', 'amount', 'rewardAmount', 'discountAmount',
  'originalAmount', 'finalAmount', 'totalAmount',
]);

function fmtRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatAuditMetadata(meta: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(meta ?? {})) {
    if (PAISE_KEYS.has(key) && typeof val === 'number' && val > 0) {
      out[key] = `${fmtRupees(val)} (${val} paise)`;
    } else {
      out[key] = val;
    }
  }
  return out;
}

const ACTION_LABELS: Record<string, string> = {
  // Admin / staff actions
  create_texpert:        'Created Taxpert',
  update_texpert:        'Updated Taxpert',
  deactivate_texpert:    'Deactivated Taxpert',
  remove_texpert:        'Removed Taxpert',
  assign_texpert:        'Assigned Taxpert',
  unassign_texpert:      'Unassigned Taxpert',
  add_to_queue:          'Added to Queue',
  record_payout:         'Recorded Payout',
  send_notification:     'Sent Notification',
  self_assign_service:   'Self-Assigned Service',
  update_service_status: 'Updated Service Status',
  // Payment events (from payment microservice)
  order_created:              'Order Created',
  payment_captured:           'Payment Captured',
  payment_failed:             'Payment Failed',
  coupon_consumed:            'Coupon Used',
  referral_rewarded:          'Referral Rewarded',
  // Invoice overdue (daily reminders worker)
  invoice_overdue_notified:   'Invoice Marked Overdue',
  invoice_overdue_escalated:  'Overdue Escalation Sent',
};

export default function AdminAuditPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit', page, filterAction],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      return (await apiClient.get(`/admin/audit?${params}`)).data;
    },
    enabled: isAdmin,
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const entries = data?.data ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / 50);

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Audit Log</h1>
          <p className="db-page-sub">{count} total entries — admin and taxpert actions.</p>
        </div>
      </div>

      <div className="aq-search-row">
        <select
          className="form-input"
          style={{ maxWidth: 260 }}
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
        >
          <option value="">All actions</option>
          {Object.keys(ACTION_LABELS).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
      </div>

      {error && <div className="db-alert-error">Failed to load audit log.</div>}

      {entries.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">No entries yet</p>
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div className="aq-td-name">{e.actor?.first_name} {e.actor?.last_name}</div>
                      <div className="aq-client-email">{e.actor?.role}</div>
                    </td>
                    <td>
                      <span className="aq-audit-action">{ACTION_LABELS[e.action] ?? e.action}</span>
                    </td>
                    <td>
                      <div className="aq-client-email">{e.target_type}</div>
                      <div className="aq-mono" style={{ fontSize: '0.72rem' }}>{e.target_id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      {Object.keys(e.metadata ?? {}).length > 0 && (
                        <details className="aq-audit-meta">
                          <summary>details</summary>
                          <pre>{JSON.stringify(
                            formatAuditMetadata(e.metadata),
                            null, 2
                          )}</pre>
                        </details>
                      )}
                    </td>
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
    </div>
  );
}
