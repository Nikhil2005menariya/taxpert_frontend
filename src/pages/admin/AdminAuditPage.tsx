import { useState, useEffect, useRef } from 'react';
import Loader from '../../components/ui/Loader';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Action registry ───────────────────────────────────────────

const ACTION_META: Record<string, { label: string; group: string; color: string }> = {
  user_signup:               { label: 'Signed Up',              group: 'Auth',    color: '#6366f1' },
  user_login:                { label: 'Logged In',               group: 'Auth',    color: '#10b981' },
  user_logout:               { label: 'Logged Out',              group: 'Auth',    color: '#94a3b8' },
  login_failed:              { label: 'Login Failed',            group: 'Auth',    color: '#ef4444' },
  password_change:           { label: 'Password Changed',        group: 'Auth',    color: '#f59e0b' },
  email_verified:            { label: 'Email Verified',          group: 'Auth',    color: '#10b981' },
  create_texpert:            { label: 'Created Taxpert',         group: 'Admin',   color: '#1d4ed8' },
  update_texpert:            { label: 'Updated Taxpert',         group: 'Admin',   color: '#1d4ed8' },
  deactivate_texpert:        { label: 'Deactivated Taxpert',     group: 'Admin',   color: '#dc2626' },
  remove_texpert:            { label: 'Removed Taxpert',         group: 'Admin',   color: '#dc2626' },
  assign_texpert:            { label: 'Assigned Taxpert',        group: 'Admin',   color: '#7c3aed' },
  unassign_texpert:          { label: 'Unassigned Taxpert',      group: 'Admin',   color: '#94a3b8' },
  add_to_queue:              { label: 'Added to Queue',          group: 'Admin',   color: '#f59e0b' },
  self_assign_service:       { label: 'Self-Assigned',           group: 'Admin',   color: '#1d4ed8' },
  send_notification:         { label: 'Sent Notification',       group: 'Admin',   color: '#6366f1' },
  admin_update_service:      { label: 'Admin Updated Service',   group: 'Admin',   color: '#f59e0b' },
  update_service_status:     { label: 'Status Updated',          group: 'Service', color: '#0ea5e9' },
  approve_document:          { label: 'Document Approved',       group: 'Service', color: '#10b981' },
  reject_document:           { label: 'Document Rejected',       group: 'Service', color: '#ef4444' },
  document_uploaded:         { label: 'Document Uploaded',       group: 'Service', color: '#6366f1' },
  order_created:             { label: 'Order Created',           group: 'Payment', color: '#f59e0b' },
  payment_captured:          { label: 'Payment Captured',        group: 'Payment', color: '#10b981' },
  payment_failed:            { label: 'Payment Failed',          group: 'Payment', color: '#ef4444' },
  coupon_consumed:           { label: 'Coupon Used',             group: 'Payment', color: '#6366f1' },
  referral_rewarded:         { label: 'Referral Rewarded',       group: 'Payment', color: '#10b981' },
  invoice_overdue_notified:  { label: 'Invoice Overdue',         group: 'Invoice', color: '#f59e0b' },
  invoice_overdue_escalated: { label: 'Overdue Escalated',       group: 'Invoice', color: '#ef4444' },
};

const ACTION_GROUPS: Record<string, string[]> = {
  Auth:    ['user_signup','user_login','user_logout','login_failed','password_change','email_verified'],
  Admin:   ['create_texpert','update_texpert','deactivate_texpert','remove_texpert','assign_texpert','unassign_texpert','add_to_queue','self_assign_service','send_notification','admin_update_service'],
  Service: ['update_service_status','approve_document','reject_document','document_uploaded'],
  Payment: ['order_created','payment_captured','payment_failed','coupon_consumed','referral_rewarded'],
  Invoice: ['invoice_overdue_notified','invoice_overdue_escalated'],
};

// ── Helpers ───────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

function fmtRupees(paise: number | null | undefined) {
  if (paise == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

function parseUA(ua: string | undefined): { browser: string; os: string; device: string } | null {
  if (!ua || ua === 'unknown') return null;
  const browser = ua.includes('Edg') ? 'Edge'
    : ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari') ? 'Safari'
    : 'Unknown';
  const os = ua.includes('Android') ? 'Android'
    : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS'
    : ua.includes('Mac OS X') ? 'macOS'
    : ua.includes('Windows') ? 'Windows'
    : ua.includes('Linux') ? 'Linux' : 'Unknown';
  const device = (ua.includes('iPhone') || (ua.includes('Android') && ua.includes('Mobile'))) ? 'Mobile'
    : ua.includes('iPad') ? 'Tablet' : 'Desktop';
  return { browser, os, device };
}

// ── Atoms ─────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
      {children}
    </span>
  );
}

function FieldVal({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500 }}>{children}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FieldLabel>{label}</FieldLabel>
      <FieldVal>{value}</FieldVal>
    </div>
  );
}

function Card({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: '0.875rem 1rem', flex: '1 1 260px',
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: color ?? '#64748b', marginBottom: '0.6rem' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontSize: '0.74rem', background: '#f1f5f9', padding: '2px 5px', borderRadius: 4, color: '#475569', fontFamily: "'Courier New', monospace" }}>
      {children}
    </code>
  );
}

// ── Expanded detail panel ─────────────────────────────────────

function AuditDetailPanel({ entry }: { entry: any }) {
  const { action, target_type, target_id, metadata: m = {}, enriched: en = {} } = entry;
  const ua    = parseUA(m.userAgent as string | undefined);
  const group = ACTION_META[action]?.group;

  // Payment amounts — prefer enriched (from DB) over metadata
  const totalAmount    = en.payment_amount    ?? (m.amountPaise      as number | undefined);
  const baseAmount     = en.base_amount       ?? (m.baseAmount       as number | undefined);
  const gstAmount      = en.gst_amount        ?? (m.gstAmount        as number | undefined);
  const discountAmount = en.discount_amount   ?? (m.discountAmount   as number | undefined);
  const gstRate        = en.gst_rate;
  const razorpayId     = en.razorpay_id       ?? (m.razorpayPaymentId as string | undefined);
  const orderId        = en.razorpay_order_id ?? (m.razorpayOrderId  as string | undefined);
  const capturedAt     = en.payment_captured_at ?? entry.created_at;

  return (
    <div style={{ padding: '1rem 1.25rem', background: '#fff', borderTop: '2px solid #f1f5f9' }}>
      {/* Timestamp line */}
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.85rem' }}>
        <strong style={{ color: '#0f172a' }}>{ACTION_META[action]?.label ?? action}</strong>
        {' · '}
        {fmtDateTime(entry.created_at)}
        {' · target: '}
        <Mono>{target_type}</Mono>
        {target_id && <> <Mono>{target_id.slice(0, 8)}…</Mono></>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>

        {/* Auth / Session info */}
        {(m.ip || m.userAgent || m.email || m.reason) && (
          <Card title="Session" color="#6366f1">
            {m.email  && <Field label="Email"      value={m.email} />}
            {m.ip && m.ip !== 'unknown' && <Field label="IP Address" value={<Mono>{m.ip}</Mono>} />}
            {m.reason && <Field label="Reason"     value={<span style={{ color: '#dc2626' }}>{m.reason}</span>} />}
            {ua && (
              <>
                <Field label="Browser" value={ua.browser} />
                <Field label="OS"      value={ua.os}      />
                <Field label="Device"  value={ua.device}  />
              </>
            )}
            {m.userAgent && !ua && (
              <Field label="User Agent" value={<span style={{ fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-all' }}>{String(m.userAgent).slice(0, 120)}</span>} />
            )}
          </Card>
        )}

        {/* Client */}
        {en.client && (
          <Card title="Client" color="#0ea5e9">
            <Field label="Name"   value={`${en.client.first_name} ${en.client.last_name}`} />
            <Field label="Email"  value={en.client.email} />
            {en.client.pan    && <Field label="PAN"    value={<Mono>{en.client.pan}</Mono>} />}
            {en.client.mobile && <Field label="Mobile" value={en.client.mobile} />}
            <Field label="Role"   value={en.client.role} />
          </Card>
        )}

        {/* Taxpert */}
        {en.texpert && (
          <Card title="Taxpert" color="#7c3aed">
            <Field label="Name"  value={`${en.texpert.first_name} ${en.texpert.last_name}`} />
            <Field label="Email" value={en.texpert.email} />
            <Field label="Role"  value={en.texpert.role} />
          </Card>
        )}

        {/* Target user (user CRUD actions) */}
        {en.target_user && (
          <Card title="User" color="#7c3aed">
            <Field label="Name"  value={`${en.target_user.first_name} ${en.target_user.last_name}`} />
            <Field label="Email" value={en.target_user.email} />
            <Field label="Role"  value={en.target_user.role}  />
            {en.target_user.pan    && <Field label="PAN"    value={<Mono>{en.target_user.pan}</Mono>} />}
            {en.target_user.mobile && <Field label="Mobile" value={en.target_user.mobile} />}
            {m.fields && <Field label="Fields changed" value={(m.fields as string[]).join(', ')} />}
          </Card>
        )}

        {/* Service context */}
        {(en.service_name || en.service_status || en.fiscal_year) && (
          <Card title="Service" color="#0ea5e9">
            {en.service_name   && <Field label="Service"     value={en.service_name} />}
            {en.service_status && <Field label="Status"      value={<Mono>{en.service_status}</Mono>} />}
            {en.fiscal_year    && <Field label="Fiscal Year" value={en.fiscal_year} />}
            {m.status && group !== 'Payment' && (
              <Field label="New Status" value={<Mono>{String(m.status)}</Mono>} />
            )}
            {m.notes && <Field label="Notes" value={String(m.notes)} />}
          </Card>
        )}

        {/* Payment — full breakdown */}
        {group === 'Payment' && (
          <Card title="Payment" color="#10b981">
            <Field label="Date &amp; Time"   value={fmtDateTime(capturedAt)} />
            <Field label="Total Amount"  value={<strong>{fmtRupees(totalAmount)}</strong>} />
            {baseAmount       != null && baseAmount > 0       && <Field label="Base Amount"     value={fmtRupees(baseAmount)} />}
            {gstAmount        != null && gstAmount > 0        && (
              <Field label={gstRate ? `GST (${gstRate}%)` : 'GST'}  value={fmtRupees(gstAmount)} />
            )}
            {discountAmount   != null && discountAmount > 0   && <Field label="Discount"        value={<span style={{ color: '#10b981' }}>-{fmtRupees(discountAmount)}</span>} />}
            {en.payment_method && <Field label="Payment Method"  value={en.payment_method} />}
            {en.payment_status && <Field label="Status"          value={<Mono>{en.payment_status}</Mono>} />}
            {razorpayId  && <Field label="Payment ID"  value={<Mono>{razorpayId}</Mono>} />}
            {orderId     && <Field label="Order ID"    value={<Mono>{orderId}</Mono>} />}
            {en.coupon_id && <Field label="Coupon Used" value={<Mono>{en.coupon_id}</Mono>} />}
            {m.couponId && !en.coupon_id && <Field label="Coupon ID" value={<Mono>{String(m.couponId)}</Mono>} />}
            {m.serviceSlug && !en.service_name && <Field label="Service" value={String(m.serviceSlug)} />}
          </Card>
        )}

        {/* Document */}
        {(m.documentName || m.document_name) && (
          <Card title="Document" color="#6366f1">
            <Field label="Document Name" value={String(m.documentName ?? m.document_name)} />
            {m.documentType && <Field label="Type"   value={String(m.documentType)} />}
            {m.reason       && <Field label="Reason" value={<span style={{ color: '#dc2626' }}>{String(m.reason)}</span>} />}
          </Card>
        )}

        {/* Queue */}
        {action === 'add_to_queue' && (
          <Card title="Queue" color="#f59e0b">
            <Field label="Priority"     value={m.priority !== undefined ? String(m.priority) : '0'} />
            {en.service_name && <Field label="Service" value={en.service_name} />}
          </Card>
        )}

        {/* Invoice */}
        {target_type === 'invoice' && (
          <Card title="Invoice" color="#f59e0b">
            {m.invoiceNumber && <Field label="Invoice No."  value={<Mono>{String(m.invoiceNumber)}</Mono>} />}
            {m.daysOverdue   && <Field label="Days Overdue" value={<span style={{ color: '#dc2626' }}>{String(m.daysOverdue)} days</span>} />}
          </Card>
        )}

        {/* Admin service update — show changed fields */}
        {action === 'admin_update_service' && Object.keys(m).length > 0 && (
          <Card title="Changes" color="#f59e0b">
            {Object.entries(m).map(([k, v]) => (
              <Field key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
            ))}
          </Card>
        )}
      </div>

      {/* Raw metadata (always available, collapsible) */}
      {Object.keys(m).length > 0 && (
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
            Raw metadata
          </summary>
          <pre style={{
            marginTop: '0.4rem', fontSize: '0.72rem', background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.75rem',
            overflow: 'auto', maxHeight: 200, color: '#475569', lineHeight: 1.6,
          }}>
            {JSON.stringify(m, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Filter state
  const [page,         setPage]         = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterGroup,  setFilterGroup]  = useState('');
  const [rawSearch,    setRawSearch]    = useState('');
  const [search,       setSearch]       = useState('');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  // Debounce search 300 ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(rawSearch.trim());
      setPage(1);
      setExpandedId(null);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawSearch]);

  function resetPage() { setPage(1); setExpandedId(null); }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit', page, filterAction, search, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action',     filterAction);
      if (search)       params.set('search',     search);
      if (fromDate)     params.set('from_date',  fromDate);
      if (toDate)       params.set('to_date',    toDate);
      return (await apiClient.get(`/admin/audit?${params}`)).data;
    },
    enabled: isAdmin,
    placeholderData: prev => prev,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const allEntries: any[] = data?.data ?? [];
  const count      = data?.count ?? 0;
  const totalPages = Math.ceil(count / 50);

  // Client-side group filter (when no specific action is selected)
  const entries = filterGroup && !filterAction
    ? allEntries.filter(e => (ACTION_GROUPS[filterGroup] ?? []).includes(e.action))
    : allEntries;

  const hasFilters = !!(filterAction || filterGroup || search || fromDate || toDate);

  function clearAll() {
    setFilterAction(''); setFilterGroup('');
    setRawSearch(''); setSearch('');
    setFromDate(''); setToDate('');
    resetPage();
  }

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Audit Log</h1>
          <p className="db-page-sub">{count} entries{hasFilters ? ' (filtered)' : ''}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        {/* Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
          <input
            className="form-input"
            placeholder="Name, PAN, email, phone…"
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
          />
        </div>

        {/* Group filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group</label>
          <select
            className="form-input"
            style={{ maxWidth: 145 }}
            value={filterGroup}
            onChange={e => { setFilterGroup(e.target.value); setFilterAction(''); resetPage(); }}
          >
            <option value="">All groups</option>
            {Object.keys(ACTION_GROUPS).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Action filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</label>
          <select
            className="form-input"
            style={{ maxWidth: 210 }}
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setFilterGroup(''); resetPage(); }}
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
              <optgroup key={group} label={group}>
                {actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 155 }}
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); resetPage(); }}
          />
        </div>

        {/* Date to */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 155 }}
            value={toDate}
            onChange={e => { setToDate(e.target.value); resetPage(); }}
          />
        </div>

        {hasFilters && (
          <button className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {error && <div className="db-alert-error">Failed to load audit log.</div>}

      {isLoading ? (
        <div className="page-loader"><Loader /></div>
      ) : entries.length === 0 ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">No entries found</p>
          <p className="db-empty-desc">{hasFilters ? 'Try clearing the filters.' : 'Actions will appear here as they occur.'}</p>
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Time</th>
                  <th style={{ width: 180 }}>Actor</th>
                  <th style={{ width: 185 }}>Action</th>
                  <th>Context</th>
                  <th style={{ width: 22 }}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => {
                  const am     = ACTION_META[e.action];
                  const isOpen = expandedId === e.id;
                  const en     = e.enriched ?? {};
                  const m      = e.metadata ?? {};

                  const contextLine =
                    en.service_name
                      ? en.client
                        ? `${en.service_name} · ${en.client.first_name} ${en.client.last_name}`
                        : en.service_name
                      : en.target_user
                      ? `${en.target_user.first_name} ${en.target_user.last_name} (${en.target_user.role})`
                      : en.payment_amount != null
                      ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(en.payment_amount / 100)}`
                      : m.documentName ?? m.document_name ?? m.invoiceNumber ?? null;

                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => { setExpandedId(prev => prev === e.id ? null : e.id); }}
                        style={{ cursor: 'pointer', background: isOpen ? '#fafbff' : undefined }}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 500 }}>
                            {new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ overflow: 'hidden' }}>
                          {e.actor ? (
                            <>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {e.actor.first_name} {e.actor.last_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.actor.email}</div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'capitalize' }}>{e.actor.role}</div>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{m.email ?? 'System'}</span>
                          )}
                        </td>

                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                            <Dot color={am?.color ?? '#94a3b8'} />
                            {am?.label ?? e.action}
                          </span>
                          {am && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>{am.group}</div>}
                        </td>

                        <td style={{ overflow: 'hidden' }}>
                          {contextLine
                            ? <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contextLine}</div>
                            : <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{e.target_type}</div>}
                          {en.fiscal_year && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>FY {en.fiscal_year}</div>}
                        </td>

                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>
                          {isOpen ? '▲' : '▼'}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${e.id}-detail`}>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <AuditDetailPanel entry={e} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="aq-pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setExpandedId(null); }}>← Prev</button>
              <span className="aq-pagination-info">Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setExpandedId(null); }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
