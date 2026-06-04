import { useState } from 'react';
import Loader from "../../../components/ui/Loader";
import PayButton from "../../../components/ui/PayButton";
import DownloadButton from "../../../components/ui/DownloadButton";
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../api/client';
import { formatRupees, calcGst } from '../../../shared/finance-utils';

// ── Types ─────────────────────────────────────────────────────

interface ClientPaymentRow {
  id: string;
  amount: number;
  base_amount: number | null;
  gst_amount: number | null;
  gst_rate: number;
  discount_amount: number | null;
  original_amount: number | null;
  payment_method: string | null;
  status: string;
  captured_at: string | null;
  created_at: string;
  razorpay_payment_id: string | null;
  client_service_id: string | null;
  service: { name?: string; category?: string } | null;
}

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

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI', card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet',
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

// ── Receipt generator ─────────────────────────────────────────

function buildReceiptHtml(p: ClientPaymentRow, biz: any, clientName: string): string {
  const base     = p.base_amount     ?? calcGst(p.amount, p.gst_rate ?? 18).base;
  const gst      = p.gst_amount      ?? calcGst(p.amount, p.gst_rate ?? 18).gst;
  const discount = p.discount_amount ?? 0;
  const original = p.original_amount ?? p.amount;
  const method   = p.payment_method ? (METHOD_LABELS[p.payment_method.toLowerCase()] ?? p.payment_method.toUpperCase()) : null;
  const dateStr  = p.captured_at
    ? new Date(p.captured_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date(p.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const bizName    = biz?.business_name ?? 'TheTaxpert';
  const bizEmail   = biz?.support_email ?? 'info@thetaxpert.com';
  const bizWebsite = biz?.website       ?? 'https://thetaxpert.com';
  const bizPhone   = biz?.support_phone ?? '';
  const bizPan     = biz?.pan           ?? '';
  const fmt = (paise: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payment Receipt — ${p.razorpay_payment_id ?? p.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1a1813; }
  @page { size: A4 portrait; margin: 18mm 20mm; }
  .page { max-width: 600px; margin: 0 auto; padding: 40px 0; }
  .accent { height: 4px; background: linear-gradient(90deg, #e85220 0%, #cf440f 100%); border-radius: 3px; margin-bottom: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .biz-name { font-size: 1.35rem; font-weight: 800; color: #1a1813; }
  .biz-meta { font-size: 0.78rem; color: #5f5a50; margin-top: 3px; line-height: 1.6; }
  .receipt-badge { text-align: right; }
  .receipt-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #aaa498; }
  .receipt-id { font-size: 0.85rem; font-weight: 700; font-family: 'Courier New', monospace; color: #1a1813; margin-top: 4px; }
  .paid-stamp { display: inline-block; border: 2.5px solid #2f7a5b; border-radius: 6px; padding: 3px 10px; font-size: 0.78rem; font-weight: 800; color: #2f7a5b; letter-spacing: 0.1em; margin-top: 6px; }
  .rule { border: none; border-top: 1px solid #ddd6c8; margin: 20px 0; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .meta-block .label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa498; margin-bottom: 4px; }
  .meta-block .value { font-size: 0.9rem; color: #1a1813; font-weight: 600; }
  .meta-block .sub { font-size: 0.78rem; color: #5f5a50; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-bottom: 20px; }
  thead tr { background: #faf7f1; }
  th { text-align: left; padding: 9px 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #aaa498; border-bottom: 1px solid #ddd6c8; }
  th:last-child { text-align: right; }
  td { padding: 10px 12px; border-bottom: 1px solid #f4f0e9; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 600; }
  .svc-name { font-weight: 600; color: #1a1813; }
  .svc-cat { font-size: 0.75rem; color: #aaa498; margin-top: 2px; }
  .totals { margin-left: auto; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.85rem; color: #5f5a50; }
  .totals-row.total { border-top: 1.5px solid #ddd6c8; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 0.95rem; color: #1a1813; }
  .totals-row.discount { color: #2f7a5b; font-weight: 600; }
  .totals-row.paid { color: #1a4f35; background: #e2efe8; border-radius: 6px; padding: 6px 8px; margin-top: 4px; font-weight: 700; }
  .method-row { display: flex; justify-content: space-between; align-items: center; background: #faf7f1; border: 1px solid #ddd6c8; border-radius: 8px; padding: 10px 14px; margin-top: 16px; font-size: 0.85rem; }
  .method-row .label { color: #5f5a50; }
  .method-row .value { font-weight: 600; color: #1a1813; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f4f0e9; font-size: 0.75rem; color: #aaa498; text-align: center; line-height: 1.6; }
  @media print { body { background: #fff; } .page { padding: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="accent"></div>
  <div class="header">
    <div>
      <div class="biz-name">${bizName}</div>
      <div class="biz-meta">
        ${bizEmail ? `${bizEmail}<br>` : ''}${bizWebsite ? `${bizWebsite}<br>` : ''}${bizPhone ? `${bizPhone}<br>` : ''}${bizPan ? `PAN: ${bizPan}` : ''}
      </div>
    </div>
    <div class="receipt-badge">
      <div class="receipt-title">Payment Receipt</div>
      ${p.razorpay_payment_id ? `<div class="receipt-id">${p.razorpay_payment_id}</div>` : ''}
      <div class="paid-stamp">PAID</div>
    </div>
  </div>
  <hr class="rule" />
  <div class="meta-grid">
    <div class="meta-block">
      <div class="label">Billed To</div>
      <div class="value">${clientName}</div>
    </div>
    <div class="meta-block">
      <div class="label">Payment Date</div>
      <div class="value">${dateStr}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Category</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><div class="svc-name">${p.service?.name ?? 'Professional Tax Service'}</div></td>
        <td><span class="svc-cat">${p.service?.category ?? '—'}</span></td>
        <td>${fmt(original)}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Base amount</span><span>${fmt(base)}</span></div>
    <div class="totals-row"><span>GST (${p.gst_rate ?? 18}%)</span><span>${fmt(gst)}</span></div>
    ${discount > 0 ? `<div class="totals-row discount"><span>Discount applied</span><span>−${fmt(discount)}</span></div>` : ''}
    <div class="totals-row total"><span>Total paid</span><span>${fmt(p.amount)}</span></div>
    <div class="totals-row paid"><span>Amount paid</span><span>${fmt(p.amount)}</span></div>
  </div>
  ${method ? `<div class="method-row"><span class="label">Payment method</span><span class="value">${method}</span></div>` : ''}
  <div class="footer">
    ${bizName} · ${bizEmail}${bizWebsite ? ` · ${bizWebsite}` : ''}<br>
    This is a computer-generated receipt and does not require a signature.
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

function downloadReceipt(p: ClientPaymentRow, biz: any, clientName: string) {
  const html = buildReceiptHtml(p, biz, clientName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.addEventListener('load', () => URL.revokeObjectURL(url));
  else URL.revokeObjectURL(url);
}


// ── Client view ───────────────────────────────────────────────

function ClientPayments() {
  const { profile } = useAuth();
  const clientName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['client-payments'],
    queryFn: async () => {
      const [myRes, pendingRes, settingsRes] = await Promise.all([
        apiClient.get('/payments/my-payments'),
        apiClient.get('/payments/pending-invoices'),
        apiClient.get('/payments/invoice-settings').catch(() => ({ data: { data: null } })),
      ]);
      return {
        myPayments:      myRes.data.data     as ClientPaymentRow[],
        pendingInvoices: pendingRes.data.data as any[],
        bizSettings:     settingsRes.data.data,
      };
    },
  });

  if (isLoading) return <div className="page-loader"><Loader /></div>;

  const { myPayments = [], pendingInvoices = [], bizSettings } = clientData ?? {};
  const captured = myPayments.filter(p => p.status === 'captured' || p.status === 'paid');
  const failed   = myPayments.filter(p => p.status === 'failed');
  const totalPaid = captured.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="pmt-shell">

      {/* ── Header ── */}
      <div className="pmt-client-head">
        <div className="pmt-head-text">
          <div className="pmt-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            My Payments
          </div>
          <h1 className="pmt-title">Payments &amp; Receipts</h1>
          <p className="pmt-sub">Your invoices, billing history and downloadable receipts</p>
        </div>
        {captured.length > 0 && (
          <div className="pmt-hero-stat">
            <div className="pmt-hero-val">{formatRupees(totalPaid)}</div>
            <div className="pmt-hero-label">Total paid</div>
          </div>
        )}
      </div>

      {/* ── Pending invoices ── */}
      {pendingInvoices.length > 0 && (
        <div className="pmt-action">
          <div className="pmt-action-head">
            <div className="pmt-action-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Action Required
            </div>
            <span className="pmt-action-count">{pendingInvoices.length} pending</span>
          </div>
          <div className="pmt-invoice-list">
            {pendingInvoices.map((cs: any) => {
              const price     = cs.service?.price ?? null;
              const isOverdue = cs.invoice_status === 'overdue' ||
                (cs.invoice_due_date && new Date(cs.invoice_due_date) < new Date());
              const dueDate = cs.invoice_due_date
                ? new Date(cs.invoice_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              return (
                <div key={cs.id} className={`pmt-invoice${isOverdue ? ' pmt-invoice--overdue' : ''}`}>
                  <div className="pmt-invoice-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="pmt-invoice-info">
                    <div className="pmt-invoice-row">
                      <span className="pmt-invoice-name">{cs.service?.name}</span>
                      {isOverdue && <span className="pmt-overdue-pill">Overdue</span>}
                    </div>
                    {cs.service?.category && (
                      <div className="pmt-invoice-cat">{cs.service.category}</div>
                    )}
                    <div className="pmt-invoice-meta">
                      {price && price > 0 && (
                        <span className="pmt-invoice-price">{formatRupees(price)}</span>
                      )}
                      {dueDate && (
                        <span className={`pmt-invoice-due${isOverdue ? ' pmt-invoice-due--overdue' : ''}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {isOverdue ? `Was due ${dueDate}` : `Due ${dueDate}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pmt-invoice-cta">
                    <PayButton to={`/client/invoices/${cs.id}`} label="Pay Now" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment history ── */}
      <div className="pmt-history">
        <div className="pmt-section-head">
          <span className="pmt-section-title">Payment History</span>
          {captured.length > 0 && (
            <span className="pmt-section-count">
              {captured.length} transaction{captured.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {captured.length === 0 && failed.length === 0 ? (
          <div className="pmt-empty pmt-empty--inline">
            <div className="pmt-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <p className="pmt-empty-title">No payments yet</p>
            <p className="pmt-empty-sub">Your receipts will appear here after you complete a payment</p>
          </div>
        ) : (
          <div className="pmt-receipt-list">

            {/* Successful */}
            {captured.map(p => {
              const base     = p.base_amount     ?? calcGst(p.amount, p.gst_rate ?? 18).base;
              const gst      = p.gst_amount      ?? calcGst(p.amount, p.gst_rate ?? 18).gst;
              const discount = p.discount_amount ?? 0;
              const original = p.original_amount ?? p.amount;
              const method   = p.payment_method
                ? (METHOD_LABELS[p.payment_method.toLowerCase()] ?? p.payment_method.toUpperCase())
                : null;
              return (
                <div key={p.id} className="pmt-receipt">
                  {/* Head */}
                  <div className="pmt-receipt-head">
                    <div className="pmt-receipt-ico pmt-receipt-ico--paid">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <div className="pmt-receipt-info">
                      <div className="pmt-receipt-name">{p.service?.name ?? 'Professional Service'}</div>
                      {p.service?.category && <div className="pmt-receipt-cat">{p.service.category}</div>}
                      <div className="pmt-receipt-date">{fmtDate(p.captured_at ?? p.created_at)} · {fmtTime(p.captured_at ?? p.created_at)}</div>
                    </div>
                    <div className="pmt-receipt-right">
                      <div className="pmt-receipt-amount">{formatRupees(p.amount)}</div>
                      <StatusPill status={p.status} />
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="pmt-receipt-breakdown">
                    <div className="pmt-brow">
                      <span>Base amount</span><span>{formatRupees(base)}</span>
                    </div>
                    <div className="pmt-brow">
                      <span>GST ({p.gst_rate ?? 18}%)</span><span>{formatRupees(gst)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="pmt-brow pmt-brow--discount">
                        <span>Discount applied</span>
                        <span>−{formatRupees(discount)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="pmt-brow pmt-brow--strike">
                        <span>Original price</span>
                        <span>{formatRupees(original)}</span>
                      </div>
                    )}
                    {method && (
                      <div className="pmt-brow">
                        <span>Paid via</span>
                        <span><MethodChip method={p.payment_method} /></span>
                      </div>
                    )}
                    {p.razorpay_payment_id && (
                      <div className="pmt-brow">
                        <span>Transaction ID</span>
                        <span className="pmt-pid-wrap">
                          <span className="pmt-pid">{p.razorpay_payment_id}</span>
                          <CopyBtn text={p.razorpay_payment_id} />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pmt-receipt-foot">
                    {p.client_service_id ? (
                      <Link to={`/client/services/${p.client_service_id}`} className="pmt-receipt-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        View service
                      </Link>
                    ) : <span />}
                    <DownloadButton
                      label="Download Receipt"
                      onClick={() => downloadReceipt(p, bizSettings, clientName)}
                    />
                  </div>
                </div>
              );
            })}

            {/* Failed */}
            {failed.length > 0 && (
              <>
                <div className="pmt-failed-head">
                  <span className="pmt-failed-label">Failed attempts</span>
                  <span className="pmt-failed-count">{failed.length}</span>
                </div>
                {failed.map(p => (
                  <div key={p.id} className="pmt-receipt pmt-receipt--failed">
                    <div className="pmt-receipt-head">
                      <div className="pmt-receipt-ico pmt-receipt-ico--failed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </div>
                      <div className="pmt-receipt-info">
                        <div className="pmt-receipt-name">{p.service?.name ?? 'Service'}</div>
                        <div className="pmt-receipt-date">{fmtDate(p.created_at)}</div>
                      </div>
                      <div className="pmt-receipt-right">
                        <StatusPill status={p.status} />
                      </div>
                    </div>
                    <div className="pmt-failed-note">
                      Payment did not go through. No amount was charged. Please try again from the pending invoices section.
                    </div>
                  </div>
                ))}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { profile, isLoading } = useAuth();
  const isClient = profile?.role === 'client';
  if (isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isClient) return <Navigate to="/dashboard" replace />;
  return <ClientPayments />;
}
