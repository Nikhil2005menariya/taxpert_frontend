import { useState, useRef, useEffect, useCallback } from 'react';
import Loader from "../../components/ui/Loader";
import DownloadButton from "../../components/ui/DownloadButton";
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees, calcGst } from '../../shared/finance-utils';

// ── Types ─────────────────────────────────────────────────────

interface PaymentRow {
  id:                   string;
  amount:               number;
  base_amount:          number;
  gst_amount:           number;
  gst_rate:             number;
  discount_amount:      number;
  status:               string;
  payment_method:       string | null;
  captured_at:          string | null;
  created_at:           string;
  razorpay_payment_id:  string | null;
  razorpay_order_id:    string | null;
  coupon_id:            string | null;
  user_profile:         { first_name: string; last_name: string; email: string; pan: string } | null;
  service:              { name: string; category: string } | null;
}

interface Stats { total: number; gst: number; count: number; thisMonth: number; failed: number; }

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  captured: { label: 'Paid',     color: 'var(--lp-green)',     bg: 'var(--lp-green-soft)',  dot: 'var(--lp-green)' },
  paid:     { label: 'Paid',     color: 'var(--lp-green)',     bg: 'var(--lp-green-soft)',  dot: 'var(--lp-green)' },
  failed:   { label: 'Failed',   color: '#c43d33',             bg: '#fbe9e2',               dot: '#c43d33' },
  created:  { label: 'Pending',  color: '#a96a16',             bg: '#f6ecd6',               dot: '#a96a16' },
  refunded: { label: 'Refunded', color: 'var(--lp-ink-muted)', bg: 'var(--lp-surface-2)',   dot: 'var(--lp-ink-subtle)' },
};

const METHOD_META: Record<string, { label: string; color: string; bg: string }> = {
  upi:        { label: 'UPI',         color: 'var(--lp-accent-strong)', bg: 'var(--lp-accent-soft)' },
  card:       { label: 'Card',        color: 'var(--lp-ink-muted)',     bg: 'var(--lp-surface-2)'   },
  netbanking: { label: 'Net Banking', color: 'var(--lp-green)',         bg: 'var(--lp-green-soft)'  },
  wallet:     { label: 'Wallet',      color: '#a96a16',                 bg: '#f6ecd6'               },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: 'var(--lp-ink-muted)', bg: 'var(--lp-surface-2)', dot: 'var(--lp-ink-subtle)' };
  return (
    <span className="pmt-pill" style={{ '--pill-bg': m.bg, '--pill-color': m.color, '--pill-dot': m.dot } as React.CSSProperties}>
      <span className="pmt-pill-dot" />
      {m.label}
    </span>
  );
}

function MethodChip({ method }: { method: string | null }) {
  if (!method) return <span className="pmt-novalue">—</span>;
  const m = METHOD_META[method.toLowerCase()] ?? { label: method.toUpperCase(), color: 'var(--lp-ink-muted)', bg: 'var(--lp-surface-2)' };
  return (
    <span className="pmt-method" style={{ '--method-bg': m.bg, '--method-color': m.color } as React.CSSProperties}>
      {m.label}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`pmt-copy${copied ? ' pmt-copy--done' : ''}`}
      title="Copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ── CSV export ────────────────────────────────────────────────

function exportCSV(rows: PaymentRow[], fromDate: string, toDate: string) {
  const headers = ['Date', 'Time', 'Client Name', 'PAN', 'Email', 'Service', 'Category', 'Amount (₹)', 'Base (₹)', 'GST (₹)', 'Discount (₹)', 'Method', 'Razorpay Payment ID', 'Razorpay Order ID', 'Status'];
  const escape = (v: string | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map(p => [
    fmtDate(p.captured_at ?? p.created_at),
    fmtTime(p.captured_at ?? p.created_at),
    escape(`${p.user_profile?.first_name ?? ''} ${p.user_profile?.last_name ?? ''}`.trim()),
    escape(p.user_profile?.pan),
    escape(p.user_profile?.email),
    escape(p.service?.name),
    escape(p.service?.category),
    ((p.amount) / 100).toFixed(2),
    ((p.base_amount ?? 0) / 100).toFixed(2),
    ((p.gst_amount ?? 0) / 100).toFixed(2),
    ((p.discount_amount ?? 0) / 100).toFixed(2),
    escape(p.payment_method),
    escape(p.razorpay_payment_id),
    escape(p.razorpay_order_id),
    escape(p.status),
  ].join(','));
  const csv  = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const range = fromDate && toDate ? `_${fromDate}_to_${toDate}` : fromDate ? `_from_${fromDate}` : '';
  a.href = url; a.download = `thetaxpert_payments${range}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Admin ledger ──────────────────────────────────────────────

function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromDate, setFromDate] = useState(searchParams.get('from') ?? '');
  const [toDate,   setToDate]   = useState(searchParams.get('to')   ?? '');
  const [status,   setStatus]   = useState(searchParams.get('status') ?? '');
  const [method,   setMethod]   = useState(searchParams.get('method') ?? '');
  const [query,    setQuery]    = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const qs = new URLSearchParams();
  if (fromDate) qs.set('startDate', fromDate);
  if (toDate)   qs.set('endDate',   toDate);
  if (status)   qs.set('status',    status);
  if (method)   qs.set('method',    method);

  const { data: statsData } = useQuery<Stats>({
    queryKey: ['payment-stats'],
    queryFn: async () => (await apiClient.get('/payments/admin/stats')).data.data,
    staleTime: 60_000,
  });

  const { data: paymentsData, isLoading } = useQuery<PaymentRow[]>({
    queryKey: ['admin-payments', qs.toString()],
    queryFn: async () => {
      const url = `/payments/admin/all${qs.toString() ? `?${qs}` : ''}`;
      return (await apiClient.get(url)).data.data ?? [];
    },
  });

  const payments = (paymentsData ?? []).filter(p => {
    if (!debouncedQuery.trim()) return true;
    const q     = debouncedQuery.toLowerCase().trim();
    const name  = `${p.user_profile?.first_name ?? ''} ${p.user_profile?.last_name ?? ''}`.toLowerCase();
    const pan   = (p.user_profile?.pan   ?? '').toLowerCase();
    const pid   = (p.razorpay_payment_id ?? '').toLowerCase();
    const svc   = (p.service?.name       ?? '').toLowerCase();
    const email = (p.user_profile?.email ?? '').toLowerCase();
    return name.includes(q) || pan.includes(q) || pid.includes(q) || svc.includes(q) || email.includes(q);
  });

  const totalFiltered = payments.filter(p => p.status === 'captured' || p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const gstFiltered   = payments.filter(p => p.status === 'captured' || p.status === 'paid').reduce((s, p) => s + (p.gst_amount ?? 0), 0);

  function applyFilters() {
    const p = new URLSearchParams();
    if (fromDate) p.set('from', fromDate);
    if (toDate)   p.set('to',   toDate);
    if (status)   p.set('status', status);
    if (method)   p.set('method', method);
    setSearchParams(p);
  }
  function clearFilters() {
    setFromDate(''); setToDate(''); setStatus(''); setMethod(''); setQuery(''); setDebouncedQuery('');
    setSearchParams(new URLSearchParams());
  }

  const stats = statsData;
  const hasFilters = !!(fromDate || toDate || status || method || debouncedQuery);
  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="adm-root">

      {/* ── Hero ── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Finance</p>
            <h1 className="adm-hero-title">Transaction Ledger</h1>
            <p className="adm-hero-date">All transactions · GST worksheet · audit trail.</p>
          </div>
          <div className="adm-hero-aside">
            <DownloadButton
              label="Export CSV"
              onClick={() => exportCSV(payments, fromDate, toDate)}
              disabled={payments.length === 0}
            />
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
            <span className="adm-stat-lbl">Total Revenue</span>
          </div>
          <div className="adm-stat-val">{formatRupees(stats?.total ?? 0)}</div>
          <div className="adm-stat-sub">{stats?.count ?? 0} captured</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
            <span className="adm-stat-lbl">GST Collected</span>
          </div>
          <div className="adm-stat-val">{formatRupees(stats?.gst ?? 0)}</div>
          <div className="adm-stat-sub">18% on all transactions</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            <span className="adm-stat-lbl">This Month</span>
          </div>
          <div className="adm-stat-val">{formatRupees(stats?.thisMonth ?? 0)}</div>
          <div className="adm-stat-sub">{monthLabel}</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
            <span className="adm-stat-lbl">Successful</span>
          </div>
          <div className="adm-stat-val">{stats?.count ?? 0}</div>
          <div className="adm-stat-sub">All time</div>
        </div>
        <div className="adm-stat" style={{ borderColor: (stats?.failed ?? 0) > 0 ? '#c43d33' : undefined }}>
          <div className="adm-stat-top">
            <span className="adm-stat-ico" style={{ color: '#c43d33' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>
            <span className="adm-stat-lbl">Failed</span>
          </div>
          <div className="adm-stat-val" style={{ color: (stats?.failed ?? 0) > 0 ? '#c43d33' : undefined }}>{stats?.failed ?? 0}</div>
          <div className="adm-stat-sub">Needs attention</div>
        </div>
      </div>

      <section className="adm-panel">
        {/* ── Filter bar ── */}
        <div className="adm-filterbar">
          <div className="adm-fgroup" style={{ flex: '1 1 240px' }}>
            <label className="adm-flabel">Search</label>
            <div className="adm-search">
              <span className="adm-search-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input className="adm-search-input" placeholder="Name, PAN, payment ID, service…" value={query} onChange={e => handleQueryChange(e.target.value)} />
              {query && (
                <button className="adm-search-clear" onClick={() => { setQuery(''); setDebouncedQuery(''); }} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">Status</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="captured">Paid</option>
                <option value="failed">Failed</option>
                <option value="created">Pending</option>
                <option value="refunded">Refunded</option>
              </select>
              <span className="adm-select-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
            </div>
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">Method</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="">All methods</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
                <option value="wallet">Wallet</option>
              </select>
              <span className="adm-select-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
            </div>
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">From</label>
            <input type="date" className="adm-input adm-input--date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">To</label>
            <input type="date" className="adm-input adm-input--date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button className="adm-btn adm-btn--accent" onClick={applyFilters}>Apply</button>
          {(fromDate || toDate || status || method) && (
            <button className="adm-btn adm-btn--ghost" onClick={clearFilters}>Clear</button>
          )}
        </div>

        {/* ── Summary bar ── */}
        {payments.length > 0 && hasFilters && (
          <div className="adm-pmt-sum">
            <span className="adm-pmt-sum-count">{payments.length} result{payments.length !== 1 ? 's' : ''}</span>
            <span className="adm-pmt-sum-item">Total <strong>{formatRupees(totalFiltered)}</strong></span>
            <span className="adm-pmt-sum-item">GST <strong>{formatRupees(gstFiltered)}</strong></span>
          </div>
        )}

        {/* ── Table ── */}
        {isLoading ? (
          <div className="adm-loading"><Loader /></div>
        ) : payments.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </span>
            <p className="adm-empty-txt">{hasFilters ? 'No payments match your filters.' : 'Payments will appear here once clients start paying.'}</p>
          </div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>GST</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                  <th>Method</th>
                  <th>Payment ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const base = p.base_amount ?? calcGst(p.amount, p.gst_rate ?? 18).base;
                  const gst  = p.gst_amount  ?? calcGst(p.amount, p.gst_rate ?? 18).gst;
                  const up   = p.user_profile;
                  const dateStr = p.captured_at ?? p.created_at;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="pmt-cell-date">{fmtDate(dateStr)}</div>
                        <div className="pmt-cell-time">{fmtTime(dateStr)}</div>
                      </td>
                      <td>
                        {up ? (
                          <>
                            <div className="pmt-client-name">{up.first_name} {up.last_name}</div>
                            <div className="pmt-client-meta">
                              <span className="pmt-pan">{up.pan}</span>
                              {up.email && <span className="pmt-email" title={up.email}>{up.email}</span>}
                            </div>
                          </>
                        ) : <span className="pmt-novalue">—</span>}
                      </td>
                      <td>
                        <div className="pmt-svc-name">{p.service?.name ?? '—'}</div>
                        {p.service?.category && <div className="pmt-svc-cat">{p.service.category}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="pmt-amount">{formatRupees(p.amount)}</div>
                        <div className="pmt-amount-sub">Base: {formatRupees(base)}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="pmt-gst">{formatRupees(gst)}</div>
                        <div className="pmt-amount-sub">{p.gst_rate ?? 18}%</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(p.discount_amount ?? 0) > 0
                          ? <span className="pmt-discount">−{formatRupees(p.discount_amount)}</span>
                          : <span className="pmt-novalue">—</span>}
                      </td>
                      <td><MethodChip method={p.payment_method} /></td>
                      <td>
                        {p.razorpay_payment_id ? (
                          <span className="pmt-pid-wrap">
                            <span className="pmt-pid">{p.razorpay_payment_id}</span>
                            <CopyBtn text={p.razorpay_payment_id} />
                          </span>
                        ) : <span className="pmt-novalue">—</span>}
                      </td>
                      <td><StatusPill status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              {payments.length > 1 && (
                <tfoot>
                  <tr className="adm-pmt-foot">
                    <td colSpan={3}>Total ({payments.length} records)</td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupees(payments.reduce((s, p) => s + p.amount, 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupees(payments.reduce((s, p) => s + (p.gst_amount ?? 0), 0))}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>−{formatRupees(payments.reduce((s, p) => s + (p.discount_amount ?? 0), 0))}</strong></td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Root (admin-guarded) ──────────────────────────────────────

export default function AdminPaymentsPage() {
  const { profile, isLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  if (isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <AdminPayments />;
}
