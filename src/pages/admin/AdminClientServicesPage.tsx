import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import Loader from '../../components/ui/Loader';

// ── Types ─────────────────────────────────────────────────────

type ServiceStatus =
  | 'pending' | 'documents_required' | 'documents_received'
  | 'in_progress' | 'under_review' | 'payment'
  | 'action_required' | 'completed' | 'on_hold' | 'cancelled';

interface ClientServiceRow {
  id: string;
  status: ServiceStatus;
  payment_status: string;
  fiscal_year: string | null;
  created_at: string;
  updated_at: string;
  client: { id: string; first_name: string; last_name: string; email: string; pan: string } | null;
  service: { id: string; name: string; slug: string; category: string } | null;
  assigned_texpert: { id: string; first_name: string; last_name: string; email: string } | null;
}

// ── Status config ─────────────────────────────────────────────

const STATUS_LABEL: Record<ServiceStatus, string> = {
  pending:             'Pending',
  documents_required:  'Docs Required',
  documents_received:  'Docs Received',
  in_progress:         'In Progress',
  under_review:        'Under Review',
  payment:             'Payment',
  action_required:     'Action Required',
  completed:           'Completed',
  on_hold:             'On Hold',
  cancelled:           'Cancelled',
};

const STATUS_TONE: Record<ServiceStatus, string> = {
  pending:             'adm-badge--neutral',
  documents_required:  'adm-badge--amber',
  documents_received:  'adm-badge--green',
  in_progress:         'adm-badge--blue',
  under_review:        'adm-badge--accent',
  payment:             'adm-badge--amber',
  action_required:     'adm-badge--red',
  completed:           'adm-badge--green',
  on_hold:             'adm-badge--neutral',
  cancelled:           'adm-badge--red',
};

const ALL_STATUSES: ServiceStatus[] = [
  'pending', 'documents_required', 'documents_received',
  'in_progress', 'under_review', 'payment',
  'action_required', 'completed', 'on_hold', 'cancelled',
];

const LIMIT = 20;

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  ),
};

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const s = status as ServiceStatus;
  return (
    <span className={`adm-badge ${STATUS_TONE[s] ?? 'adm-badge--neutral'}`}>
      <span className="adm-badge-dot" />{STATUS_LABEL[s] ?? status}
    </span>
  );
}

function ViewButton({ to }: { to: string }) {
  return (
    <Link to={to} className="adm-view">
      View
      <span className="adm-view-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminClientServicesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [page, setPage]           = useState(1);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input — 300 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(rawSearch.trim());
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawSearch]);

  function handleStatusChange(val: string) {
    setStatus(val);
    setPage(1);
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client-services', page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)  params.append('search', search);
      if (status)  params.append('status', status);
      const res = await apiClient.get(`/admin/client-services?${params}`);
      return res.data as { data: ClientServiceRow[]; count: number; page: number; limit: number };
    },
    enabled: isAdmin,
    placeholderData: (prev) => prev,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const rows: ClientServiceRow[] = data?.data ?? [];
  const count       = data?.count ?? 0;
  const totalPages  = Math.ceil(count / LIMIT);
  const loading     = isLoading;

  return (
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Operations</p>
            <h1 className="adm-hero-title">Client Services</h1>
            <p className="adm-hero-date">Every service engagement across the platform, with assignment and status.</p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{count}</div><div className="adm-hero-stat-lbl">Total</div></div>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">All services{count > 0 && <span className="adm-count">{count}</span>}</h2>
            <p className="adm-panel-desc">Search by client, PAN, or taxpert. Filter by current status.</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search">
            <span className="adm-search-ico">{Icon.search}</span>
            <input
              className="adm-search-input"
              placeholder="Search by client name, PAN, or taxpert name…"
              value={rawSearch}
              onChange={e => setRawSearch(e.target.value)}
            />
            {rawSearch && (
              <button className="adm-search-clear" onClick={() => setRawSearch('')} aria-label="Clear search">{Icon.x}</button>
            )}
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={status} onChange={e => handleStatusChange(e.target.value)}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
        </div>

        {error && <div className="adm-banner adm-banner--err">Failed to load services.</div>}

        {loading ? (
          <div className="adm-loading"><Loader /></div>
        ) : rows.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">{(search || status) ? 'No services match your filters.' : 'No services found.'}</p>
          </div>
        ) : (
          <>
            <div className="adm-tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>PAN</th>
                    <th>Service</th>
                    <th>Assigned CA / Taxpert</th>
                    <th>FY</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="adm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div className="adm-tbl-name">
                          {row.client ? (
                            <>
                              <span className="adm-avatar">{row.client.first_name?.[0]}{row.client.last_name?.[0]}</span>
                              {row.client.first_name} {row.client.last_name}
                            </>
                          ) : '—'}
                        </div>
                      </td>
                      <td>{row.client?.pan ? <code className="adm-code">{row.client.pan}</code> : <span className="adm-mono">—</span>}</td>
                      <td>{row.service?.name ?? <span className="adm-mono">—</span>}</td>
                      <td>
                        {row.assigned_texpert
                          ? `${row.assigned_texpert.first_name} ${row.assigned_texpert.last_name}`
                          : <span className="adm-mono">Unassigned</span>}
                      </td>
                      <td className="adm-mono">{row.fiscal_year ?? '—'}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="adm-mono">{fmtDate(row.updated_at)}</td>
                      <td className="adm-cell-actions">
                        <div className="adm-actions">
                          <ViewButton to={`/admin/client-services/${row.id}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="adm-pager">
                <button className="adm-pager-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  {Icon.chevronL}<span>Prev</span>
                </button>
                <span className="adm-pager-info">Page <b>{page}</b> of <b>{totalPages}</b></span>
                <button className="adm-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
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
