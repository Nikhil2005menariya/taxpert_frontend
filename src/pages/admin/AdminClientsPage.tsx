import { useState, useEffect, useRef } from 'react';
import Loader from "../../components/ui/Loader";
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  pan: string;
  is_active: boolean;
  created_at: string;
}

const LIMIT = 20;

function useDebounce(raw: string, delay = 300): string {
  const [debounced, setDebounced] = useState(raw);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(raw.trim()), delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [raw, delay]);
  return debounced;
}

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);
const ClearIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const ChevL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
);
const ArrowR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default function AdminClientsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [raw, setRaw] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(raw);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const prevSearch = useRef(search);
  useEffect(() => {
    if (search !== prevSearch.current) { setPage(1); prevSearch.current = search; }
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-clients', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.append('search', search);
      const res = await apiClient.get(`/admin/clients?${params}`);
      return res.data;
    },
    enabled: isAdmin,
    placeholderData: (prev) => prev,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const clients: Client[] = data?.data ?? [];
  const count: number = data?.count ?? 0;
  const totalPages = Math.ceil(count / LIMIT);

  return (
    <div className="adm-root">
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Directory</p>
            <h1 className="adm-hero-title">Clients</h1>
            <p className="adm-hero-date">{count} {count === 1 ? 'client' : 'clients'} registered on the platform.</p>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <span className="adm-search-ico">{SearchIcon}</span>
            <input
              className="adm-search-input"
              placeholder="Search by name, email, or PAN…"
              value={raw}
              onChange={e => setRaw(e.target.value)}
            />
            {raw && <button className="adm-search-clear" onClick={() => setRaw('')} aria-label="Clear search">{ClearIcon}</button>}
          </div>
        </div>

        {error ? (
          <div className="adm-banner adm-banner--err" style={{ marginBottom: 0 }}>Failed to load clients.</div>
        ) : isLoading ? (
          <div className="adm-loading"><Loader /></div>
        ) : clients.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
            </span>
            <p className="adm-empty-txt">{raw ? 'No clients match your search.' : 'No clients found.'}</p>
          </div>
        ) : (
          <>
            <div className="adm-tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>PAN</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="adm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="adm-tbl-name">
                          <span className="adm-avatar">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                          {c.first_name} {c.last_name}
                        </div>
                      </td>
                      <td className="adm-mono adm-cell-email" title={c.email}>{c.email}</td>
                      <td className="adm-mono">{c.mobile || '—'}</td>
                      <td><code className="adm-code">{c.pan}</code></td>
                      <td>
                        <span className={`adm-badge ${c.is_active ? 'adm-badge--green' : 'adm-badge--neutral'}`}>
                          <span className="adm-badge-dot" />{c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="adm-mono">{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td className="adm-cell-actions">
                        <div className="adm-actions">
                          <Link to={`/admin/clients/${c.id}`} className="adm-view">
                            View<span className="adm-view-ico">{ArrowR}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="adm-pager">
                <button className="adm-pager-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{ChevL}<span>Prev</span></button>
                <span className="adm-pager-info">Page <b>{page}</b> of <b>{totalPages}</b></span>
                <button className="adm-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><span>Next</span>{ChevR}</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
