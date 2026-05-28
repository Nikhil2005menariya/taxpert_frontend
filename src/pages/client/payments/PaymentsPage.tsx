import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../api/client';
import { formatRupees, calcGst } from '../../../shared/finance-utils';

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
  captured: { label: 'Paid',      color: '#166534', bg: '#dcfce7', dot: '#16a34a' },
  paid:     { label: 'Paid',      color: '#166534', bg: '#dcfce7', dot: '#16a34a' },
  failed:   { label: 'Failed',    color: '#991b1b', bg: '#fee2e2', dot: '#dc2626' },
  created:  { label: 'Pending',   color: '#92400e', bg: '#fef3c7', dot: '#d97706' },
  refunded: { label: 'Refunded',  color: '#5b21b6', bg: '#ede9fe', dot: '#7c3aed' },
};

const METHOD_META: Record<string, { label: string; color: string; bg: string }> = {
  upi:        { label: 'UPI',         color: '#1d4ed8', bg: '#dbeafe' },
  card:       { label: 'Card',        color: '#0f172a', bg: '#e2e8f0' },
  netbanking: { label: 'Net Banking', color: '#065f46', bg: '#d1fae5' },
  wallet:     { label: 'Wallet',      color: '#92400e', bg: '#fef3c7' },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', background: m.bg, color: m.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function MethodChip({ method }: { method: string | null }) {
  if (!method) return <span style={{ color: 'var(--ink-300)', fontSize: '0.8rem' }}>—</span>;
  const m = METHOD_META[method.toLowerCase()] ?? { label: method.toUpperCase(), color: '#475569', bg: '#f1f5f9' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: m.bg, color: m.color, letterSpacing: '0.03em' }}>
      {m.label}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="Copy"
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green-600)' : 'var(--ink-400)', fontSize: '0.75rem', padding: '0 2px', lineHeight: 1 }}
    >
      {copied ? '✓' : '⧉'}
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
  a.href     = url;
  a.download = `thetaxpert_payments${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="pm2-stat" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div className="pm2-stat-label">{label}</div>
      <div className="pm2-stat-value">{value}</div>
      {sub && <div className="pm2-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Admin view ────────────────────────────────────────────────

function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [fromDate, setFromDate]   = useState(searchParams.get('from') ?? '');
  const [toDate,   setToDate]     = useState(searchParams.get('to')   ?? '');
  const [status,   setStatus]     = useState(searchParams.get('status')  ?? '');
  const [method,   setMethod]     = useState(searchParams.get('method')  ?? '');
  const [query,    setQuery]      = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
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

  // Client-side search filter
  const payments = (paymentsData ?? []).filter(p => {
    if (!debouncedQuery.trim()) return true;
    const q   = debouncedQuery.toLowerCase().trim();
    const name = `${p.user_profile?.first_name ?? ''} ${p.user_profile?.last_name ?? ''}`.toLowerCase();
    const pan  = (p.user_profile?.pan ?? '').toLowerCase();
    const pid  = (p.razorpay_payment_id ?? '').toLowerCase();
    const svc  = (p.service?.name ?? '').toLowerCase();
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

  return (
    <div className="pm2-shell">
      {/* Header */}
      <div className="pm2-header">
        <div>
          <h1 className="pm2-title">Payments</h1>
          <p className="pm2-subtitle">All transactions · GST worksheet · Audit trail</p>
        </div>
        <button
          className="pm2-export-btn"
          disabled={payments.length === 0}
          onClick={() => exportCSV(payments, fromDate, toDate)}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="pm2-stats-grid">
        <StatCard label="Total Revenue"  value={formatRupees(stats?.total ?? 0)}    sub={`${stats?.count ?? 0} captured`}    accent="var(--gold-500)" />
        <StatCard label="GST Collected"  value={formatRupees(stats?.gst ?? 0)}      sub="18% on all transactions"             accent="#6366f1" />
        <StatCard label="This Month"     value={formatRupees(stats?.thisMonth ?? 0)} sub={new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})} accent="#0ea5e9" />
        <StatCard label="Total Payments" value={String(stats?.count ?? 0)}          sub="Successful"                          accent="#10b981" />
        <StatCard label="Failed"         value={String(stats?.failed ?? 0)}         sub="Needs attention"                     accent="#ef4444" />
      </div>

      {/* Filter bar */}
      <div className="pm2-filters">
        <div className="pm2-search-wrap">
          <svg className="pm2-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <circle cx="9" cy="9" r="6"/><path d="m15 15-3-3" strokeLinecap="round"/>
          </svg>
          <input
            className="pm2-search"
            placeholder="Search by client name, PAN, payment ID, service…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
          />
          {query && (
            <button className="pm2-search-clear" onClick={() => { setQuery(''); setDebouncedQuery(''); }}>✕</button>
          )}
        </div>

        <select className="pm2-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="captured">Paid</option>
          <option value="failed">Failed</option>
          <option value="created">Pending</option>
          <option value="refunded">Refunded</option>
        </select>

        <select className="pm2-select" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="">All methods</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Net Banking</option>
          <option value="wallet">Wallet</option>
        </select>

        <div className="pm2-date-group">
          <input type="date" className="pm2-date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From date" />
          <span className="pm2-date-sep">→</span>
          <input type="date" className="pm2-date" value={toDate} onChange={e => setToDate(e.target.value)} title="To date" />
        </div>

        <button className="pm2-apply-btn" onClick={applyFilters}>Apply</button>
        {(fromDate || toDate || status || method) && (
          <button className="pm2-clear-btn" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* Summary row */}
      {payments.length > 0 && (
        <div className="pm2-summary">
          <span>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
          {(debouncedQuery || fromDate || toDate || status || method) && (
            <>
              <span className="pm2-summary-sep">·</span>
              <span>Total: <strong>{formatRupees(totalFiltered)}</strong></span>
              <span className="pm2-summary-sep">·</span>
              <span>GST: <strong>{formatRupees(gstFiltered)}</strong></span>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="pm2-table-card">
        {isLoading ? (
          <div className="pm2-loading">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="pm2-skeleton-row">
                <div className="pm2-skeleton" style={{ width: '8%' }} />
                <div className="pm2-skeleton" style={{ width: '16%' }} />
                <div className="pm2-skeleton" style={{ width: '14%' }} />
                <div className="pm2-skeleton" style={{ width: '10%' }} />
                <div className="pm2-skeleton" style={{ width: '8%' }} />
                <div className="pm2-skeleton" style={{ width: '20%' }} />
                <div className="pm2-skeleton" style={{ width: '8%' }} />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="pm2-empty">
            <div className="pm2-empty-icon">💳</div>
            <p className="pm2-empty-title">No payments found</p>
            <p className="pm2-empty-sub">
              {debouncedQuery || fromDate || toDate || status || method
                ? 'Try adjusting your filters'
                : 'Payments will appear here once clients start paying'}
            </p>
          </div>
        ) : (
          <div className="pm2-table-wrap">
            <table className="pm2-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
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
                    <tr key={p.id} className="pm2-row">
                      <td>
                        <div className="pm2-date-cell">{fmtDate(dateStr)}</div>
                        <div className="pm2-time-cell">{fmtTime(dateStr)}</div>
                      </td>
                      <td>
                        {up ? (
                          <>
                            <div className="pm2-client-name">{up.first_name} {up.last_name}</div>
                            <div className="pm2-client-sub">
                              <span className="pm2-pan">{up.pan}</span>
                              {up.email && <span className="pm2-email" title={up.email}>{up.email}</span>}
                            </div>
                          </>
                        ) : <span style={{ color: 'var(--ink-300)' }}>—</span>}
                      </td>
                      <td>
                        <div className="pm2-svc-name">{p.service?.name ?? '—'}</div>
                        {p.service?.category && <div className="pm2-svc-cat">{p.service.category}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="pm2-amount">{formatRupees(p.amount)}</div>
                        <div className="pm2-amount-sub">Base: {formatRupees(base)}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pm2-gst">{formatRupees(gst)}</span>
                        <div className="pm2-amount-sub">{p.gst_rate ?? 18}%</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(p.discount_amount ?? 0) > 0
                          ? <span className="pm2-discount">−{formatRupees(p.discount_amount)}</span>
                          : <span style={{ color: 'var(--ink-300)' }}>—</span>}
                      </td>
                      <td><MethodChip method={p.payment_method} /></td>
                      <td>
                        {p.razorpay_payment_id ? (
                          <div className="pm2-pid-wrap">
                            <span className="pm2-pid">{p.razorpay_payment_id}</span>
                            <CopyBtn text={p.razorpay_payment_id} />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-300)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td><StatusPill status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              {payments.length > 1 && (
                <tfoot>
                  <tr className="pm2-foot">
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
      </div>
    </div>
  );
}

// ── Client view ───────────────────────────────────────────────

interface ClientPaymentRow {
  id: string; amount: number; gst_rate: number; status: string;
  captured_at: string | null; created_at: string;
  razorpay_payment_id: string | null; client_service_id: string | null;
  service: { name?: string; category?: string } | null;
}

function ClientPayments() {
  const { data: clientData, isLoading } = useQuery({
    queryKey: ['client-payments'],
    queryFn: async () => {
      const [myRes, pendingRes] = await Promise.all([
        apiClient.get('/payments/my-payments'),
        apiClient.get('/payments/pending-invoices'),
      ]);
      return { myPayments: myRes.data.data as ClientPaymentRow[], pendingInvoices: pendingRes.data.data as any[] };
    },
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;

  const { myPayments = [], pendingInvoices = [] } = clientData ?? {};

  return (
    <div className="pm2-shell">
      <div className="pm2-header">
        <div>
          <h1 className="pm2-title">Payments</h1>
          <p className="pm2-subtitle">Your invoices and payment history</p>
        </div>
      </div>

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <div className="pm2-pending-section">
          <div className="pm2-section-head">
            <span className="pm2-section-title">Action Required</span>
            <span className="pm2-pending-badge">{pendingInvoices.length} pending</span>
          </div>
          <div className="pm2-invoice-list">
            {pendingInvoices.map((cs: any) => {
              const price = cs.service?.price ?? null;
              return (
                <div key={cs.id} className="pm2-invoice-card">
                  <div>
                    <div className="pm2-invoice-svc">{cs.service?.name}</div>
                    <div className="pm2-invoice-cat">{cs.service?.category}</div>
                    {price && price > 0 && <div className="pm2-invoice-price">{formatRupees(price)}</div>}
                  </div>
                  <Link to={`/invoices/${cs.id}`} className="btn btn-primary pm2-pay-btn">
                    Pay Now →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="pm2-section-head" style={{ marginTop: pendingInvoices.length > 0 ? '1.5rem' : 0 }}>
        <span className="pm2-section-title">Payment History</span>
        {myPayments.length > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--ink-400)' }}>{myPayments.length} transaction{myPayments.length !== 1 ? 's' : ''}</span>}
      </div>

      {myPayments.length === 0 ? (
        <div className="pm2-empty" style={{ marginTop: '1rem' }}>
          <div className="pm2-empty-icon">💳</div>
          <p className="pm2-empty-title">No payments yet</p>
          <p className="pm2-empty-sub">Your receipts will appear here after you complete a payment</p>
        </div>
      ) : (
        <div className="pm2-receipt-list">
          {myPayments.map(p => {
            const { base, gst } = calcGst(p.amount, p.gst_rate ?? 18);
            return (
              <div key={p.id} className="pm2-receipt">
                <div className="pm2-receipt-top">
                  <div>
                    <div className="pm2-svc-name">{p.service?.name ?? '—'}</div>
                    {p.service?.category && <div className="pm2-svc-cat">{p.service.category}</div>}
                    <div className="pm2-time-cell" style={{ marginTop: 4 }}>{fmtDate(p.captured_at ?? p.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="pm2-amount">{formatRupees(p.amount)}</div>
                    <StatusPill status={p.status} />
                  </div>
                </div>
                <div className="pm2-receipt-breakdown">
                  <div className="pm2-receipt-row"><span>Base</span><span>{formatRupees(base)}</span></div>
                  <div className="pm2-receipt-row"><span>GST ({p.gst_rate ?? 18}%)</span><span>{formatRupees(gst)}</span></div>
                  {p.razorpay_payment_id && (
                    <div className="pm2-receipt-row">
                      <span>Payment ID</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="pm2-pid">{p.razorpay_payment_id}</span>
                        <CopyBtn text={p.razorpay_payment_id} />
                      </span>
                    </div>
                  )}
                  {p.client_service_id && (
                    <div className="pm2-receipt-row" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <Link to={`/my-services/${p.client_service_id}`} style={{ color: 'var(--gold-600)', fontWeight: 600, fontSize: '0.8rem' }}>
                        View service workspace →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { profile, isLoading } = useAuth();
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isClient = profile?.role === 'client';

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin && !isClient) return <Navigate to="/dashboard" replace />;
  if (isAdmin)  return <AdminPayments />;
  return <ClientPayments />;
}
