import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────

interface ServiceRow {
  id:                 string;
  status:             string;
  fiscal_year:        string | null;
  payment_status:     string;
  assigned_texpert_at: string | null;
  created_at:         string;
  updated_at:         string;
  client:   { id: string; first_name: string; last_name: string; email: string; pan: string } | null;
  service:  { name: string; slug: string; category: string } | null;
  doc_summary: {
    total: number; uploaded: number; approved: number;
    pending: number; reuploads: number; newSinceReview: number;
  };
  sla: 'overdue' | 'attention' | null;
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_OPTIONS = [
  'documents_required', 'documents_received', 'in_progress',
  'under_review', 'invoice_pending', 'completed', 'on_hold', 'cancelled',
];

const STATUS_BADGE: Record<string, string> = {
  pending:             'aq-badge-pending',
  documents_required:  'aq-badge-docs',
  documents_received:  'aq-badge-docs',
  in_progress:         'aq-badge-active',
  under_review:        'aq-badge-review',
  invoice_pending:     'aq-badge-invoice',
  completed:           'aq-badge-done',
  on_hold:             'aq-badge-hold',
  cancelled:           'aq-badge-hold',
};

// ── Helpers ───────────────────────────────────────────────────

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins   < 1)   return 'just now';
  if (mins   < 60)  return `${mins}m ago`;
  if (hours  < 24)  return `${hours}h ago`;
  if (days   < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`aq-badge ${STATUS_BADGE[status] ?? 'aq-badge-pending'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function SlaTag({ sla }: { sla: 'overdue' | 'attention' | null }) {
  if (!sla) return null;
  if (sla === 'overdue')   return <span className="tx-sla-tag tx-sla-overdue">⚠ Overdue</span>;
  if (sla === 'attention') return <span className="tx-sla-tag tx-sla-attention">Needs attention</span>;
  return null;
}

// ── Main page ─────────────────────────────────────────────────

export default function TexpertServicesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';

  // Filter state — synced with URL
  const [query, setQuery]                 = useState(searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [fy,     setFy]     = useState(searchParams.get('fy')     ?? '');
  const [sort,   setSort]   = useState(searchParams.get('sort')   ?? 'recently_updated');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  const onQueryChange = useCallback((val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
      const next = new URLSearchParams(searchParams);
      if (val.trim()) next.set('q', val.trim()); else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 300);
  }, [searchParams, setSearchParams]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Sync select filters with URL
  function applyFilter(key: 'status' | 'fy' | 'sort', value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setQuery(''); setDebouncedQuery(''); setStatus(''); setFy(''); setSort('recently_updated');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  // Build query string for backend
  const qs = new URLSearchParams();
  if (debouncedQuery.trim()) qs.set('search', debouncedQuery.trim());
  if (status) qs.set('status', status);
  if (fy)     qs.set('fy', fy);
  if (sort)   qs.set('sort', sort);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tx-services', qs.toString()],
    queryFn: async () => (await apiClient.get(`/texpert/services${qs.toString() ? `?${qs}` : ''}`)).data,
    enabled: isTexpert,
  });

  if (authLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isTexpert)  return <Navigate to="/dashboard" replace />;

  const services: ServiceRow[] = data?.data ?? [];
  const fiscalYears: string[]  = data?.fiscal_years ?? [];

  // Compute mini stats
  const active    = services.filter(s => !['completed', 'cancelled', 'on_hold'].includes(s.status)).length;
  const pendingReview = services.filter(s => s.doc_summary.newSinceReview > 0 || s.doc_summary.uploaded > s.doc_summary.approved).length;
  const onHold    = services.filter(s => s.status === 'on_hold').length;
  const completed = services.filter(s => s.status === 'completed').length;

  const hasFilters = !!(debouncedQuery || status || fy || sort !== 'recently_updated');

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">My Services</h1>
          <p className="db-page-sub">All services assigned to you · {services.length} total</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/texpert/queue')}>
          Browse Queue →
        </button>
      </div>

      {/* Stats row */}
      <div className="tx-mini-stats">
        <div className="tx-mini-stat">
          <div className="tx-mini-num">{active}</div>
          <div className="tx-mini-lbl">Active</div>
        </div>
        <div className="tx-mini-stat">
          <div className="tx-mini-num" style={{ color: 'var(--gold-600)' }}>{pendingReview}</div>
          <div className="tx-mini-lbl">Pending Review</div>
        </div>
        <div className="tx-mini-stat">
          <div className="tx-mini-num">{onHold}</div>
          <div className="tx-mini-lbl">On Hold</div>
        </div>
        <div className="tx-mini-stat">
          <div className="tx-mini-num" style={{ color: 'var(--green-600)' }}>{completed}</div>
          <div className="tx-mini-lbl">Completed</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="tx-filters">
        <div className="tx-search-wrap">
          <svg className="tx-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <circle cx="9" cy="9" r="6"/><path d="m15 15-3-3" strokeLinecap="round"/>
          </svg>
          <input
            className="tx-search"
            placeholder="Search by client name, PAN, service, fiscal year…"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
          />
          {query && (
            <button className="tx-search-clear" onClick={() => onQueryChange('')}>✕</button>
          )}
        </div>

        <select className="tx-select" value={status} onChange={e => { setStatus(e.target.value); applyFilter('status', e.target.value); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select className="tx-select" value={fy} onChange={e => { setFy(e.target.value); applyFilter('fy', e.target.value); }}>
          <option value="">All fiscal years</option>
          {fiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select className="tx-select" value={sort} onChange={e => { setSort(e.target.value); applyFilter('sort', e.target.value); }}>
          <option value="recently_updated">Recently updated</option>
          <option value="oldest">Oldest first</option>
          <option value="status">By status</option>
        </select>

        {hasFilters && (
          <button className="tx-clear-btn" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="tx-svc-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="tx-svc-card" style={{ opacity: 0.4 }}>
              <div className="tx-skeleton" style={{ height: 18, width: '40%' }} />
              <div className="tx-skeleton" style={{ height: 12, width: '60%', marginTop: 8 }} />
              <div className="tx-skeleton" style={{ height: 12, width: '50%', marginTop: 6 }} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="db-alert-error">Failed to load services.</div>
      ) : services.length === 0 ? (
        <div className="db-empty-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <p className="db-empty-title">
            {hasFilters ? 'No services match your filters' : 'No services assigned yet'}
          </p>
          <p className="db-empty-desc">
            {hasFilters
              ? 'Try adjusting your search or filters.'
              : 'Once an admin assigns you services or you claim from the queue, they will appear here.'}
          </p>
          {!hasFilters && (
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/texpert/queue')}>
              Browse Open Queue
            </button>
          )}
        </div>
      ) : (
        <div className="tx-svc-list">
          {services.map(s => {
            const docSum = s.doc_summary;
            const isDimmed = s.status === 'completed' || s.status === 'on_hold' || s.status === 'cancelled';
            const slaClass = s.sla === 'overdue' ? 'tx-svc-overdue' : s.sla === 'attention' ? 'tx-svc-attention' : '';
            const newDocsClass = docSum.newSinceReview > 0 ? 'tx-svc-new-docs' : '';
            return (
              <div
                key={s.id}
                className={`tx-svc-card ${slaClass} ${newDocsClass}`}
                style={{ opacity: isDimmed ? 0.7 : 1, cursor: 'pointer' }}
                onClick={() => navigate(`/texpert/services/${s.id}`)}
              >
                <div className="tx-svc-card-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tx-svc-title">
                      {s.service?.name ?? '—'}
                      {s.fiscal_year && <span className="tx-svc-fy">{s.fiscal_year}</span>}
                    </div>
                    <div className="tx-svc-client">
                      <span className="tx-svc-client-name">
                        {s.client?.first_name} {s.client?.last_name}
                      </span>
                      {s.client?.pan && <span className="tx-svc-pan">PAN: {s.client.pan}</span>}
                    </div>
                  </div>
                  <div className="tx-svc-right">
                    <StatusPill status={s.status} />
                    <SlaTag sla={s.sla} />
                  </div>
                </div>

                <div className="tx-svc-bottom">
                  <div className="tx-svc-stats">
                    <span>
                      <strong>{docSum.uploaded}/{docSum.total}</strong> uploaded
                    </span>
                    {docSum.approved > 0 && (
                      <span style={{ color: 'var(--green-600)' }}>
                        {docSum.approved} approved
                      </span>
                    )}
                    {docSum.reuploads > 0 && (
                      <span style={{ color: 'var(--gold-600)' }}>
                        {docSum.reuploads} reupload pending
                      </span>
                    )}
                    {docSum.newSinceReview > 0 && (
                      <span className="tx-new-badge">+{docSum.newSinceReview} new</span>
                    )}
                    {s.payment_status === 'paid' && (
                      <span style={{ color: 'var(--green-600)', fontSize: '0.78rem' }}>· Paid</span>
                    )}
                  </div>
                  <div className="tx-svc-time">
                    Updated {fmtRelative(s.updated_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
