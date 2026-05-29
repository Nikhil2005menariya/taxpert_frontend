import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees } from '../../shared/finance-utils';

// ── Types ─────────────────────────────────────────────────────

interface PayoutRow {
  id:      string;
  amount:  number;
  paid_at: string | null;
  notes:   string | null;
  service: { name: string; category: string } | null;
  client:  { first_name: string; service_id: string } | null;
}

interface ServiceOption { id: string; name: string; }

interface PayoutsResponse {
  data:     PayoutRow[];
  services: ServiceOption[];
  stats:    { totalEarned: number; thisMonth: number; last30Days: number };
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportCSV(rows: PayoutRow[], fromDate: string, toDate: string) {
  const headers = ['Date', 'Service', 'Category', 'Client', 'Amount (₹)', 'Notes'];

  const escape = (v: string | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = rows.map(p => [
    fmtDate(p.paid_at),
    escape(p.service?.name),
    escape(p.service?.category),
    escape(p.client?.first_name),
    (p.amount / 100).toFixed(2),
    escape(p.notes),
  ].join(','));

  const csv  = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const range = fromDate && toDate ? `_${fromDate}_to_${toDate}` : fromDate ? `_from_${fromDate}` : '';
  a.href     = url;
  a.download = `my_payouts${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="pm2-stat" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div className="pm2-stat-label">{label}</div>
      <div className="pm2-stat-value">{value}</div>
      {sub && <div className="pm2-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function TexpertPayoutsPage() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';
  if (!isTexpert) return <Navigate to="/dashboard" replace />;
  return <PayoutsView />;
}

function PayoutsView() {
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [serviceId, setServiceId] = useState('');

  // Applied filters (sent to API)
  const [applied, setApplied] = useState({ from: '', to: '', svc: '' });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const qs = new URLSearchParams();
  if (applied.from) qs.set('startDate', applied.from);
  if (applied.to)   qs.set('endDate',   applied.to);
  if (applied.svc)  qs.set('serviceId', applied.svc);

  const { data, isLoading } = useQuery<PayoutsResponse>({
    queryKey: ['texpert-payouts', qs.toString()],
    queryFn:  async () => {
      const url = `/texpert/payouts${qs.toString() ? `?${qs}` : ''}`;
      return (await apiClient.get(url)).data;
    },
  });

  const rows     = data?.data     ?? [];
  const services = data?.services ?? [];
  const stats    = data?.stats;

  const totalFiltered = rows.reduce((s, p) => s + p.amount, 0);

  const hasFilters = applied.from || applied.to || applied.svc;

  function applyFilters() {
    setApplied({ from: fromDate, to: toDate, svc: serviceId });
  }

  function clearFilters() {
    setFromDate(''); setToDate(''); setServiceId('');
    setApplied({ from: '', to: '', svc: '' });
  }

  return (
    <div className="pm2-shell">
      {/* Header */}
      <div className="pm2-header">
        <div>
          <h1 className="pm2-title">My Payouts</h1>
          <p className="pm2-subtitle">Earnings history · Filter by date or service</p>
        </div>
        <button
          className="pm2-export-btn"
          disabled={rows.length === 0}
          onClick={() => exportCSV(rows, applied.from, applied.to)}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="pm2-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Total Earned"  value={formatRupees(stats?.totalEarned ?? 0)} sub="All-time"        accent="var(--gold-500)" />
        <StatCard label="This Month"    value={formatRupees(stats?.thisMonth   ?? 0)} sub={new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })} accent="#10b981" />
        <StatCard label="Last 30 Days"  value={formatRupees(stats?.last30Days  ?? 0)} sub="Rolling 30 days" accent="#6366f1" />
      </div>

      {/* Filters */}
      <div className="pm2-filters">
        <select
          className="pm2-select"
          value={serviceId}
          onChange={e => setServiceId(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">All services</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="pm2-date-group">
          <input type="date" className="pm2-date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From date" />
          <span className="pm2-date-sep">→</span>
          <input type="date" className="pm2-date" value={toDate}   onChange={e => setToDate(e.target.value)}   title="To date" />
        </div>

        <button className="pm2-apply-btn" onClick={applyFilters}>Apply</button>
        {(fromDate || toDate || serviceId || hasFilters) && (
          <button className="pm2-clear-btn" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div className="pm2-summary">
          <span>{rows.length} payout{rows.length !== 1 ? 's' : ''}</span>
          {hasFilters && (
            <>
              <span className="pm2-summary-sep">·</span>
              <span>Total: <strong>{formatRupees(totalFiltered)}</strong></span>
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
                <div className="pm2-skeleton" style={{ width: '12%' }} />
                <div className="pm2-skeleton" style={{ width: '20%' }} />
                <div className="pm2-skeleton" style={{ width: '12%' }} />
                <div className="pm2-skeleton" style={{ width: '10%' }} />
                <div className="pm2-skeleton" style={{ width: '30%' }} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="pm2-empty">
            <div className="pm2-empty-icon">💰</div>
            <p className="pm2-empty-title">No payouts found</p>
            <p className="pm2-empty-sub">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Payouts recorded by admin will appear here'}
            </p>
          </div>
        ) : (
          <div className="pm2-table-wrap">
            <table className="pm2-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} className="pm2-row">
                    <td>
                      <div className="pm2-date-cell">{fmtDate(p.paid_at)}</div>
                    </td>
                    <td>
                      <div className="pm2-svc-name">{p.service?.name ?? '—'}</div>
                      {p.service?.category && <div className="pm2-svc-cat">{p.service.category}</div>}
                    </td>
                    <td>
                      <div className="pm2-client-name">{p.client?.first_name ?? '—'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="pm2-amount">{formatRupees(p.amount)}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: p.notes ? 'var(--ink-700)' : 'var(--ink-300)' }}>
                        {p.notes ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 1 && (
                <tfoot>
                  <tr className="pm2-foot">
                    <td colSpan={3}>Total ({rows.length} records)</td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupees(totalFiltered)}</strong></td>
                    <td />
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
