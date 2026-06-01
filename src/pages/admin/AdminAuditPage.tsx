import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// Keys stored in paise — shown as ₹ in audit details
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

// ── Action metadata ───────────────────────────────────────────

const ACTION_META: Record<string, { label: string; group: string; dot: string }> = {
  // Auth
  user_signup:           { label: 'Signed Up',           group: 'Auth', dot: '#6366f1' },
  user_login:            { label: 'Logged In',            group: 'Auth', dot: '#10b981' },
  user_logout:           { label: 'Logged Out',           group: 'Auth', dot: '#94a3b8' },
  login_failed:          { label: 'Login Failed',         group: 'Auth', dot: '#ef4444' },
  password_change:       { label: 'Password Changed',     group: 'Auth', dot: '#f59e0b' },
  email_verified:        { label: 'Email Verified',       group: 'Auth', dot: '#10b981' },
  // Admin / staff
  create_texpert:        { label: 'Created Taxpert',       group: 'Admin', dot: '#1d4ed8' },
  update_texpert:        { label: 'Updated Taxpert',       group: 'Admin', dot: '#1d4ed8' },
  deactivate_texpert:    { label: 'Deactivated Taxpert',   group: 'Admin', dot: '#dc2626' },
  remove_texpert:        { label: 'Removed Taxpert',       group: 'Admin', dot: '#dc2626' },
  assign_texpert:        { label: 'Assigned Taxpert',      group: 'Admin', dot: '#1d4ed8' },
  unassign_texpert:      { label: 'Unassigned Taxpert',    group: 'Admin', dot: '#94a3b8' },
  add_to_queue:          { label: 'Added to Queue',        group: 'Admin', dot: '#f59e0b' },
  record_payout:         { label: 'Recorded Payout',       group: 'Admin', dot: '#10b981' },
  send_notification:     { label: 'Sent Notification',     group: 'Admin', dot: '#6366f1' },
  self_assign_service:   { label: 'Self-Assigned Service', group: 'Admin', dot: '#1d4ed8' },
  update_service_status: { label: 'Updated Service Status',group: 'Admin', dot: '#f59e0b' },
  // Payment
  order_created:              { label: 'Order Created',         group: 'Payment', dot: '#f59e0b' },
  payment_captured:           { label: 'Payment Captured',      group: 'Payment', dot: '#10b981' },
  payment_failed:             { label: 'Payment Failed',        group: 'Payment', dot: '#ef4444' },
  coupon_consumed:            { label: 'Coupon Used',           group: 'Payment', dot: '#6366f1' },
  referral_rewarded:          { label: 'Referral Rewarded',     group: 'Payment', dot: '#10b981' },
  // Invoice
  invoice_overdue_notified:   { label: 'Invoice Overdue',       group: 'Invoice', dot: '#f59e0b' },
  invoice_overdue_escalated:  { label: 'Overdue Escalation',    group: 'Invoice', dot: '#ef4444' },
};

const ACTION_GROUPS: Record<string, string[]> = {
  Auth:    ['user_signup','user_login','user_logout','login_failed','password_change','email_verified'],
  Admin:   ['create_texpert','update_texpert','deactivate_texpert','remove_texpert','assign_texpert','unassign_texpert','add_to_queue','record_payout','send_notification','self_assign_service','update_service_status'],
  Payment: ['order_created','payment_captured','payment_failed','coupon_consumed','referral_rewarded'],
  Invoice: ['invoice_overdue_notified','invoice_overdue_escalated'],
};

function ActionBadge({ action }: { action: string }) {
  const m = ACTION_META[action];
  if (!m) return <span style={{ fontSize: '0.8rem', color: '#475569' }}>{action}</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, flexShrink: 0, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

// Format IP + UA from metadata for display
function AuthDetails({ meta }: { meta: Record<string, any> }) {
  if (!meta) return null;
  const { ip, userAgent, email, reason, ...rest } = meta;
  return (
    <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {email && <span style={{ color: '#0f172a', fontWeight: 500 }}>{email}</span>}
      {ip && ip !== 'unknown' && <span>IP: <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{ip}</code></span>}
      {userAgent && userAgent !== 'unknown' && (
        <span title={userAgent} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.72rem' }}>
          {userAgent}
        </span>
      )}
      {reason && <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>Reason: {reason}</span>}
      {Object.keys(rest).length > 0 && (
        <details style={{ marginTop: 2 }}>
          <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.72rem' }}>more details</summary>
          <pre style={{ fontSize: '0.7rem', background: '#f8fafc', padding: '6px', borderRadius: 4, marginTop: 4, overflow: 'auto', maxWidth: 260 }}>
            {JSON.stringify(formatAuditMetadata(rest), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [page,         setPage]         = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterGroup,  setFilterGroup]  = useState('');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit', page, filterAction, filterGroup],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      return (await apiClient.get(`/admin/audit?${params}`)).data;
    },
    enabled: isAdmin,
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const allEntries: any[] = data?.data ?? [];
  const count      = data?.count ?? 0;
  const totalPages = Math.ceil(count / 50);

  // Client-side group filter (server already filters by action)
  const entries = filterGroup && !filterAction
    ? allEntries.filter(e => (ACTION_GROUPS[filterGroup] ?? []).includes(e.action))
    : allEntries;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Audit Log</h1>
          <p className="db-page-sub">{count} total entries — all user and system actions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aq-search-row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <select
          className="form-input"
          style={{ maxWidth: 160 }}
          value={filterGroup}
          onChange={e => { setFilterGroup(e.target.value); setFilterAction(''); setPage(1); }}
        >
          <option value="">All groups</option>
          {Object.keys(ACTION_GROUPS).map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          className="form-input"
          style={{ maxWidth: 220 }}
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setFilterGroup(''); setPage(1); }}
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_META).map(([k, v]) => (
            <option key={k} value={k}>{v.group} — {v.label}</option>
          ))}
        </select>

        {(filterAction || filterGroup) && (
          <button className="btn btn-sm btn-secondary" onClick={() => { setFilterAction(''); setFilterGroup(''); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="db-alert-error">Failed to load audit log.</div>}

      {entries.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">No entries found</p>
          <p className="db-empty-desc">{filterAction || filterGroup ? 'Try clearing the filters.' : 'Actions will appear here as they occur.'}</p>
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => {
                  const isAuthEvent = ACTION_META[e.action]?.group === 'Auth';
                  const hasIpData   = e.metadata?.ip || e.metadata?.userAgent || e.metadata?.email;
                  return (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#475569' }}>
                        <div>{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        {e.actor ? (
                          <>
                            <div className="aq-td-name">{e.actor.first_name} {e.actor.last_name}</div>
                            <div className="aq-client-email">{e.actor.email}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>{e.actor.role}</div>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {e.metadata?.email ?? 'System'}
                          </span>
                        )}
                      </td>
                      <td>
                        <ActionBadge action={e.action} />
                      </td>
                      <td>
                        <div className="aq-client-email" style={{ textTransform: 'capitalize' }}>{e.target_type}</div>
                        {e.target_id && (
                          <div className="aq-mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {e.target_id.length > 12 ? e.target_id.slice(0, 8) + '…' : e.target_id}
                          </div>
                        )}
                      </td>
                      <td>
                        {(isAuthEvent && hasIpData) ? (
                          <AuthDetails meta={e.metadata ?? {}} />
                        ) : Object.keys(e.metadata ?? {}).length > 0 ? (
                          <details className="aq-audit-meta">
                            <summary>details</summary>
                            <pre>{JSON.stringify(formatAuditMetadata(e.metadata), null, 2)}</pre>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
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
