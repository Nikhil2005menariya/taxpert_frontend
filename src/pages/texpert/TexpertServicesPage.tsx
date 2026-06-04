import { useState, useEffect, useRef, useCallback } from 'react';
import Loader from "../../components/ui/Loader";
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
  'under_review', 'payment', 'completed', 'on_hold', 'cancelled',
];

const STATUS_TONE: Record<string, string> = {
  pending:             'adm-badge--neutral',
  documents_required:  'adm-badge--amber',
  documents_received:  'adm-badge--green',
  in_progress:         'adm-badge--blue',
  under_review:        'adm-badge--accent',
  payment:             'adm-badge--amber',
  completed:           'adm-badge--green',
  on_hold:             'adm-badge--neutral',
  cancelled:           'adm-badge--red',
};

/* ── Icons ────────────────────────────────────────────────────── */
const Icon = {
  search:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  x:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  chevronD: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  empty:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  alert:    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>,
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

function StatusBadge({ status }: { status: string }) {
  return <span className={`adm-badge ${STATUS_TONE[status] ?? 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{status.replace(/_/g, ' ')}</span>;
}

function SlaTag({ sla }: { sla: 'overdue' | 'attention' | null }) {
  if (!sla) return null;
  if (sla === 'overdue')   return <span className="tx-sla tx-sla--overdue">{Icon.alert} Overdue</span>;
  return <span className="tx-sla tx-sla--attention">Needs attention</span>;
}

// ── Main page ─────────────────────────────────────────────────

export default function TexpertServicesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';

  const [query, setQuery]                 = useState(searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [fy,     setFy]     = useState(searchParams.get('fy')     ?? '');
  const [sort,   setSort]   = useState(searchParams.get('sort')   ?? 'recently_updated');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  function applyFilter(key: 'status' | 'fy' | 'sort', value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setQuery(''); setDebouncedQuery(''); setStatus(''); setFy(''); setSort('recently_updated');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

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

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isTexpert)  return <Navigate to="/dashboard" replace />;

  const services: ServiceRow[] = data?.data ?? [];
  const fiscalYears: string[]  = data?.fiscal_years ?? [];

  const active        = services.filter(s => !['completed', 'cancelled', 'on_hold'].includes(s.status)).length;
  const pendingReview = services.filter(s => s.doc_summary.newSinceReview > 0 || s.doc_summary.uploaded > s.doc_summary.approved).length;
  const onHold        = services.filter(s => s.status === 'on_hold').length;
  const completed     = services.filter(s => s.status === 'completed').length;

  const hasFilters = !!(debouncedQuery || status || fy || sort !== 'recently_updated');

  return (
    <div className="adm-root">
      {/* ── Hero ── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— My Work</p>
            <h1 className="adm-hero-title">My Services</h1>
            <p className="adm-hero-date">All services assigned to you, with document and SLA status.</p>
          </div>
          <div className="adm-hero-aside">
            <button className="adm-btn adm-btn--accent" onClick={() => navigate('/texpert/queue')}>Browse Queue</button>
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-lbl">Active</span></div>
          <div className="adm-stat-val">{active}</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-lbl">Pending Review</span></div>
          <div className="adm-stat-val" style={pendingReview > 0 ? { color: 'var(--lp-accent)' } : undefined}>{pendingReview}</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-lbl">On Hold</span></div>
          <div className="adm-stat-val">{onHold}</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-lbl">Completed</span></div>
          <div className="adm-stat-val" style={completed > 0 ? { color: 'var(--lp-green)' } : undefined}>{completed}</div>
        </div>
      </div>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">Assigned services{services.length > 0 && <span className="adm-count">{services.length}</span>}</h2>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="adm-toolbar">
          <div className="adm-search">
            <span className="adm-search-ico">{Icon.search}</span>
            <input className="adm-search-input" placeholder="Search by client, PAN, service, fiscal year…" value={query} onChange={e => onQueryChange(e.target.value)} />
            {query && <button className="adm-search-clear" onClick={() => onQueryChange('')} aria-label="Clear search">{Icon.x}</button>}
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={status} onChange={e => { setStatus(e.target.value); applyFilter('status', e.target.value); }}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={fy} onChange={e => { setFy(e.target.value); applyFilter('fy', e.target.value); }}>
              <option value="">All fiscal years</option>
              {fiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={sort} onChange={e => { setSort(e.target.value); applyFilter('sort', e.target.value); }}>
              <option value="recently_updated">Recently updated</option>
              <option value="oldest">Oldest first</option>
              <option value="status">By status</option>
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
          {hasFilters && <button className="adm-btn adm-btn--ghost" onClick={clearFilters}>Clear</button>}
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="adm-loading"><Loader /></div>
        ) : isError ? (
          <div className="adm-banner adm-banner--err">Failed to load services.</div>
        ) : services.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">{hasFilters ? 'No services match your filters.' : 'No services assigned yet. Claim one from the queue to get started.'}</p>
            {!hasFilters && <button className="adm-btn adm-btn--accent adm-btn--sm" onClick={() => navigate('/texpert/queue')}>Browse Open Queue</button>}
          </div>
        ) : (
          <div className="tx-grid">
            {services.map(s => {
              const d = s.doc_summary;
              const pct = d.total > 0 ? Math.round((d.uploaded / d.total) * 100) : 0;
              const allUp = d.total > 0 && d.uploaded >= d.total;
              const isDimmed = s.status === 'completed' || s.status === 'on_hold' || s.status === 'cancelled';
              const flag = s.sla === 'overdue' ? ' tx-card--overdue' : s.sla === 'attention' ? ' tx-card--attention' : d.newSinceReview > 0 ? ' tx-card--new' : '';
              return (
                <article key={s.id} className={`tx-card${flag}${isDimmed ? ' tx-card--dim' : ''}`} onClick={() => navigate(`/texpert/services/${s.id}`)}>
                  <div className="tx-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="tx-card-name">{s.service?.name ?? '—'}{s.fiscal_year && <span className="tx-card-fy">{s.fiscal_year}</span>}</div>
                      <div className="tx-card-client">
                        <span className="adm-avatar">{s.client?.first_name?.[0]}{s.client?.last_name?.[0]}</span>
                        <span>{s.client?.first_name} {s.client?.last_name}</span>
                        {s.client?.pan && <span className="tx-card-pan">{s.client.pan}</span>}
                      </div>
                    </div>
                    <div className="tx-card-right">
                      <StatusBadge status={s.status} />
                      <SlaTag sla={s.sla} />
                    </div>
                  </div>

                  <div className="tx-card-foot">
                    <div className="tx-prog"><div className={`tx-prog-fill${allUp ? ' tx-prog-fill--done' : ''}`} style={{ width: `${pct}%` }} /></div>
                    <div className="tx-card-stats">
                      <span><strong>{d.uploaded}/{d.total}</strong> uploaded</span>
                      {d.approved > 0 && <span className="tx-stat-green">{d.approved} approved</span>}
                      {d.reuploads > 0 && <span className="tx-stat-amber">{d.reuploads} reupload pending</span>}
                      {d.newSinceReview > 0 && <span className="tx-newpill">+{d.newSinceReview} new</span>}
                      {s.payment_status === 'paid' && <span className="tx-stat-green">Paid</span>}
                      <span className="tx-card-time" style={{ marginLeft: 'auto' }}>Updated {fmtRelative(s.updated_at)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
