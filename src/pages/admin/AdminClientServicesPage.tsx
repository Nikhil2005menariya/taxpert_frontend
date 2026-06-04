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
  payment:     'Payment',
  action_required:     'Action Required',
  completed:           'Completed',
  on_hold:             'On Hold',
  cancelled:           'Cancelled',
};

const STATUS_STYLE: Record<ServiceStatus, { color: string; background: string }> = {
  pending:             { color: '#a96a16', background: '#f6ecd6' },
  documents_required:  { color: '#a96a16', background: '#f6ecd6' },
  documents_received:  { color: '#1a6b3c', background: '#e0f5e9' },
  in_progress:         { color: '#1a56a8', background: '#e8f0fc' },
  under_review:        { color: '#555', background: '#f0f0f0' },
  payment:     { color: '#a96a16', background: '#f6ecd6' },
  action_required:     { color: '#b91c1c', background: '#fee2e2' },
  completed:           { color: '#15803d', background: '#dcfce7' },
  on_hold:             { color: '#555', background: '#f0f0f0' },
  cancelled:           { color: '#888', background: '#f0f0f0' },
};

const ALL_STATUSES: ServiceStatus[] = [
  'pending', 'documents_required', 'documents_received',
  'in_progress', 'under_review', 'payment',
  'action_required', 'completed', 'on_hold', 'cancelled',
];

const LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const s = status as ServiceStatus;
  const style = STATUS_STYLE[s] ?? { color: '#555', background: '#f0f0f0' };
  return (
    <span className="aq-badge" style={style}>
      {STATUS_LABEL[s] ?? status}
    </span>
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

  // Reset page when filter changes
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
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const rows: ClientServiceRow[] = data?.data ?? [];
  const count       = data?.count ?? 0;
  const totalPages  = Math.ceil(count / LIMIT);
  const loading     = isLoading;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Client Services</h1>
          <p className="db-page-sub">{count} service{count !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aq-search-row">
        <input
          className="form-input aq-search-input"
          placeholder="Search by client name, PAN, or taxpert name…"
          value={rawSearch}
          onChange={e => setRawSearch(e.target.value)}
        />
        <select
          className="form-input aq-filter-select"
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {error && <div className="db-alert-error">Failed to load services.</div>}

      {loading ? (
        <div className="page-loader"><Loader /></div>
      ) : rows.length === 0 ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">No services found</p>
          {(search || status) && <p className="db-empty-desc">Try a different search or clear the filter.</p>}
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>PAN</th>
                  <th>Service</th>
                  <th>Assigned CA / Taxpert</th>
                  <th>FY</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="aq-td-name">
                      {row.client
                        ? `${row.client.first_name} ${row.client.last_name}`
                        : <span className="aq-muted">—</span>}
                    </td>
                    <td>
                      {row.client?.pan
                        ? <span className="aq-mono">{row.client.pan}</span>
                        : <span className="aq-muted">—</span>}
                    </td>
                    <td>{row.service?.name ?? <span className="aq-muted">—</span>}</td>
                    <td>
                      {row.assigned_texpert
                        ? `${row.assigned_texpert.first_name} ${row.assigned_texpert.last_name}`
                        : <span className="aq-muted">Unassigned</span>}
                    </td>
                    <td>{row.fiscal_year ?? <span className="aq-muted">—</span>}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{fmtDate(row.updated_at)}</td>
                    <td>
                      <Link to={`/admin/client-services/${row.id}`} className="btn btn-sm btn-secondary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="aq-pagination">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span className="aq-pagination-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
