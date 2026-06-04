import { useState, useEffect, useRef } from 'react';
import Loader from '../../components/ui/Loader';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Action registry ───────────────────────────────────────────

const ACTION_META: Record<string, { label: string; group: string; color: string }> = {
  user_signup:               { label: 'Signed Up',              group: 'Auth',    color: '#6366f1' },
  user_login:                { label: 'Logged In',               group: 'Auth',    color: '#2f7a5b' },
  user_logout:               { label: 'Logged Out',              group: 'Auth',    color: '#8b857a' },
  login_failed:              { label: 'Login Failed',            group: 'Auth',    color: '#c43d33' },
  password_change:           { label: 'Password Changed',        group: 'Auth',    color: '#a96a16' },
  email_verified:            { label: 'Email Verified',          group: 'Auth',    color: '#2f7a5b' },
  create_texpert:            { label: 'Created Taxpert',         group: 'Admin',   color: '#5a5fb8' },
  update_texpert:            { label: 'Updated Taxpert',         group: 'Admin',   color: '#5a5fb8' },
  deactivate_texpert:        { label: 'Deactivated Taxpert',     group: 'Admin',   color: '#c43d33' },
  remove_texpert:            { label: 'Removed Taxpert',         group: 'Admin',   color: '#c43d33' },
  assign_texpert:            { label: 'Assigned Taxpert',        group: 'Admin',   color: '#7c3aed' },
  unassign_texpert:          { label: 'Unassigned Taxpert',      group: 'Admin',   color: '#8b857a' },
  add_to_queue:              { label: 'Added to Queue',          group: 'Admin',   color: '#a96a16' },
  self_assign_service:       { label: 'Self-Assigned',           group: 'Admin',   color: '#5a5fb8' },
  send_notification:         { label: 'Sent Notification',       group: 'Admin',   color: '#6366f1' },
  admin_update_service:      { label: 'Admin Updated Service',   group: 'Admin',   color: '#a96a16' },
  update_service_status:     { label: 'Status Updated',          group: 'Service', color: '#e85220' },
  approve_document:          { label: 'Document Approved',       group: 'Service', color: '#2f7a5b' },
  reject_document:           { label: 'Document Rejected',       group: 'Service', color: '#c43d33' },
  document_uploaded:         { label: 'Document Uploaded',       group: 'Service', color: '#6366f1' },
  order_created:             { label: 'Order Created',           group: 'Payment', color: '#a96a16' },
  payment_captured:          { label: 'Payment Captured',        group: 'Payment', color: '#2f7a5b' },
  payment_failed:            { label: 'Payment Failed',          group: 'Payment', color: '#c43d33' },
  coupon_consumed:           { label: 'Coupon Used',             group: 'Payment', color: '#6366f1' },
  referral_rewarded:         { label: 'Referral Rewarded',       group: 'Payment', color: '#2f7a5b' },
  invoice_overdue_notified:  { label: 'Invoice Overdue',         group: 'Invoice', color: '#a96a16' },
  invoice_overdue_escalated: { label: 'Overdue Escalated',       group: 'Invoice', color: '#c43d33' },
};

const ACTION_GROUPS: Record<string, string[]> = {
  Auth:    ['user_signup','user_login','user_logout','login_failed','password_change','email_verified'],
  Admin:   ['create_texpert','update_texpert','deactivate_texpert','remove_texpert','assign_texpert','unassign_texpert','add_to_queue','self_assign_service','send_notification','admin_update_service'],
  Service: ['update_service_status','approve_document','reject_document','document_uploaded'],
  Payment: ['order_created','payment_captured','payment_failed','coupon_consumed','referral_rewarded'],
  Invoice: ['invoice_overdue_notified','invoice_overdue_escalated'],
};

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  chevronL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  chevronR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h4M9 17h6" />
    </svg>
  ),
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
  return <span className="adm-au-dot" style={{ background: color }} />;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="adm-au-field">
      <span className="adm-au-field-lbl">{label}</span>
      <span className="adm-au-field-val">{value}</span>
    </div>
  );
}

function Card({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="adm-au-card">
      <div className="adm-au-card-title" style={{ color: color ?? 'var(--lp-ink-subtle)' }}>{title}</div>
      <div className="adm-au-card-body">{children}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="adm-au-mono">{children}</code>;
}

// ── Expanded detail panel ─────────────────────────────────────

function AuditDetailPanel({ entry }: { entry: any }) {
  const { action, target_type, target_id, metadata: m = {}, enriched: en = {} } = entry;
  const ua    = parseUA(m.userAgent as string | undefined);
  const group = ACTION_META[action]?.group;

  const totalAmount    = en.payment_amount    ?? (m.amountPaise      as number | undefined);
  const baseAmount     = en.base_amount       ?? (m.baseAmount       as number | undefined);
  const gstAmount      = en.gst_amount        ?? (m.gstAmount        as number | undefined);
  const discountAmount = en.discount_amount   ?? (m.discountAmount   as number | undefined);
  const gstRate        = en.gst_rate;
  const razorpayId     = en.razorpay_id       ?? (m.razorpayPaymentId as string | undefined);
  const orderId        = en.razorpay_order_id ?? (m.razorpayOrderId  as string | undefined);
  const capturedAt     = en.payment_captured_at ?? entry.created_at;

  return (
    <div className="adm-au-detail">
      <div className="adm-au-detail-head">
        <strong>{ACTION_META[action]?.label ?? action}</strong>
        {' · '}{fmtDateTime(entry.created_at)}{' · target: '}
        <Mono>{target_type}</Mono>
        {target_id && <> <Mono>{target_id.slice(0, 8)}…</Mono></>}
      </div>

      <div className="adm-au-cards">
        {(m.ip || m.userAgent || m.email || m.reason) && (
          <Card title="Session" color="#6366f1">
            {m.email  && <Field label="Email"      value={m.email} />}
            {m.ip && m.ip !== 'unknown' && <Field label="IP Address" value={<Mono>{m.ip}</Mono>} />}
            {m.reason && <Field label="Reason"     value={<span style={{ color: '#c43d33' }}>{m.reason}</span>} />}
            {ua && (
              <>
                <Field label="Browser" value={ua.browser} />
                <Field label="OS"      value={ua.os}      />
                <Field label="Device"  value={ua.device}  />
              </>
            )}
            {m.userAgent && !ua && (
              <Field label="User Agent" value={<span style={{ fontSize: '0.72rem', color: 'var(--lp-ink-faint)', wordBreak: 'break-all' }}>{String(m.userAgent).slice(0, 120)}</span>} />
            )}
          </Card>
        )}

        {en.client && (
          <Card title="Client" color="#e85220">
            <Field label="Name"   value={`${en.client.first_name} ${en.client.last_name}`} />
            <Field label="Email"  value={en.client.email} />
            {en.client.pan    && <Field label="PAN"    value={<Mono>{en.client.pan}</Mono>} />}
            {en.client.mobile && <Field label="Mobile" value={en.client.mobile} />}
            <Field label="Role"   value={en.client.role} />
          </Card>
        )}

        {en.texpert && (
          <Card title="Taxpert" color="#7c3aed">
            <Field label="Name"  value={`${en.texpert.first_name} ${en.texpert.last_name}`} />
            <Field label="Email" value={en.texpert.email} />
            <Field label="Role"  value={en.texpert.role} />
          </Card>
        )}

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

        {(en.service_name || en.service_status || en.fiscal_year) && (
          <Card title="Service" color="#5a5fb8">
            {en.service_name   && <Field label="Service"     value={en.service_name} />}
            {en.service_status && <Field label="Status"      value={<Mono>{en.service_status}</Mono>} />}
            {en.fiscal_year    && <Field label="Fiscal Year" value={en.fiscal_year} />}
            {m.status && group !== 'Payment' && (
              <Field label="New Status" value={<Mono>{String(m.status)}</Mono>} />
            )}
            {m.notes && <Field label="Notes" value={String(m.notes)} />}
          </Card>
        )}

        {group === 'Payment' && (
          <Card title="Payment" color="#2f7a5b">
            <Field label="Date & Time"   value={fmtDateTime(capturedAt)} />
            <Field label="Total Amount"  value={<strong>{fmtRupees(totalAmount)}</strong>} />
            {baseAmount       != null && baseAmount > 0       && <Field label="Base Amount"     value={fmtRupees(baseAmount)} />}
            {gstAmount        != null && gstAmount > 0        && (
              <Field label={gstRate ? `GST (${gstRate}%)` : 'GST'}  value={fmtRupees(gstAmount)} />
            )}
            {discountAmount   != null && discountAmount > 0   && <Field label="Discount"        value={<span style={{ color: '#2f7a5b' }}>-{fmtRupees(discountAmount)}</span>} />}
            {en.payment_method && <Field label="Payment Method"  value={en.payment_method} />}
            {en.payment_status && <Field label="Status"          value={<Mono>{en.payment_status}</Mono>} />}
            {razorpayId  && <Field label="Payment ID"  value={<Mono>{razorpayId}</Mono>} />}
            {orderId     && <Field label="Order ID"    value={<Mono>{orderId}</Mono>} />}
            {en.coupon_id && <Field label="Coupon Used" value={<Mono>{en.coupon_id}</Mono>} />}
            {m.couponId && !en.coupon_id && <Field label="Coupon ID" value={<Mono>{String(m.couponId)}</Mono>} />}
            {m.serviceSlug && !en.service_name && <Field label="Service" value={String(m.serviceSlug)} />}
          </Card>
        )}

        {(m.documentName || m.document_name) && (
          <Card title="Document" color="#6366f1">
            <Field label="Document Name" value={String(m.documentName ?? m.document_name)} />
            {m.documentType && <Field label="Type"   value={String(m.documentType)} />}
            {m.reason       && <Field label="Reason" value={<span style={{ color: '#c43d33' }}>{String(m.reason)}</span>} />}
          </Card>
        )}

        {action === 'add_to_queue' && (
          <Card title="Queue" color="#a96a16">
            <Field label="Priority"     value={m.priority !== undefined ? String(m.priority) : '0'} />
            {en.service_name && <Field label="Service" value={en.service_name} />}
          </Card>
        )}

        {target_type === 'invoice' && (
          <Card title="Invoice" color="#a96a16">
            {m.invoiceNumber && <Field label="Invoice No."  value={<Mono>{String(m.invoiceNumber)}</Mono>} />}
            {m.daysOverdue   && <Field label="Days Overdue" value={<span style={{ color: '#c43d33' }}>{String(m.daysOverdue)} days</span>} />}
          </Card>
        )}

        {action === 'admin_update_service' && Object.keys(m).length > 0 && (
          <Card title="Changes" color="#a96a16">
            {Object.entries(m).map(([k, v]) => (
              <Field key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
            ))}
          </Card>
        )}
      </div>

      {Object.keys(m).length > 0 && (
        <details className="adm-au-raw">
          <summary>Raw metadata</summary>
          <pre>{JSON.stringify(m, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [page,         setPage]         = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterGroup,  setFilterGroup]  = useState('');
  const [rawSearch,    setRawSearch]    = useState('');
  const [search,       setSearch]       = useState('');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

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
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Security</p>
            <h1 className="adm-hero-title">Audit Log</h1>
            <p className="adm-hero-date">Every action across the platform, captured with full context.</p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{count}</div><div className="adm-hero-stat-lbl">{hasFilters ? 'Filtered' : 'Entries'}</div></div>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        {/* Filter bar */}
        <div className="adm-filterbar">
          <div className="adm-fgroup" style={{ flex: '1 1 220px' }}>
            <label className="adm-flabel">Search</label>
            <input className="adm-input" placeholder="Name, PAN, email, phone…" value={rawSearch} onChange={e => setRawSearch(e.target.value)} />
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">Group</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setFilterAction(''); resetPage(); }}>
                <option value="">All groups</option>
                {Object.keys(ACTION_GROUPS).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <span className="adm-select-ico">{Icon.chevronD}</span>
            </div>
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">Action</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={filterAction} onChange={e => { setFilterAction(e.target.value); setFilterGroup(''); resetPage(); }}>
                <option value="">All actions</option>
                {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
                  <optgroup key={group} label={group}>
                    {actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
                  </optgroup>
                ))}
              </select>
              <span className="adm-select-ico">{Icon.chevronD}</span>
            </div>
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">From</label>
            <input type="date" className="adm-input adm-input--date" value={fromDate} onChange={e => { setFromDate(e.target.value); resetPage(); }} />
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">To</label>
            <input type="date" className="adm-input adm-input--date" value={toDate} onChange={e => { setToDate(e.target.value); resetPage(); }} />
          </div>
          {hasFilters && (
            <button className="adm-btn adm-btn--ghost" onClick={clearAll}>Clear all</button>
          )}
        </div>

        {error && <div className="adm-banner adm-banner--err">Failed to load audit log.</div>}

        {isLoading ? (
          <div className="adm-loading"><Loader /></div>
        ) : entries.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">{hasFilters ? 'No entries match your filters.' : 'No audit entries yet.'}</p>
          </div>
        ) : (
          <>
            <div className="adm-tbl-wrap">
              <table className="adm-tbl adm-au-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Time</th>
                    <th style={{ width: 190 }}>Actor</th>
                    <th style={{ width: 190 }}>Action</th>
                    <th>Context</th>
                    <th style={{ width: 36 }}></th>
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
                          onClick={() => setExpandedId(prev => prev === e.id ? null : e.id)}
                          className={`adm-au-row${isOpen ? ' is-open' : ''}`}
                        >
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div className="adm-au-date">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                            <div className="adm-au-time">{new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          </td>

                          <td style={{ overflow: 'hidden' }}>
                            {e.actor ? (
                              <>
                                <div className="adm-au-actor">{e.actor.first_name} {e.actor.last_name}</div>
                                <div className="adm-au-actor-sub">{e.actor.email}</div>
                                <div className="adm-au-actor-role">{e.actor.role}</div>
                              </>
                            ) : (
                              <span className="adm-au-actor-sub">{m.email ?? 'System'}</span>
                            )}
                          </td>

                          <td>
                            <span className="adm-au-action"><Dot color={am?.color ?? '#aaa498'} />{am?.label ?? e.action}</span>
                            {am && <div className="adm-au-group">{am.group}</div>}
                          </td>

                          <td style={{ overflow: 'hidden' }}>
                            {contextLine
                              ? <div className="adm-au-context">{contextLine}</div>
                              : <div className="adm-au-context adm-au-context--faint">{e.target_type}</div>}
                            {en.fiscal_year && <div className="adm-au-fy">FY {en.fiscal_year}</div>}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className={`adm-au-chev${isOpen ? ' is-open' : ''}`}>{Icon.chevronD}</span>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${e.id}-detail`} className="adm-au-detail-tr">
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
              <div className="adm-pager">
                <button className="adm-pager-btn" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setExpandedId(null); }}>
                  {Icon.chevronL}<span>Prev</span>
                </button>
                <span className="adm-pager-info">Page <b>{page}</b> of <b>{totalPages}</b></span>
                <button className="adm-pager-btn" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setExpandedId(null); }}>
                  <span>Next</span>{Icon.chevronR}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
