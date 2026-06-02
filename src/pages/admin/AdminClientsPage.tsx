import { useState } from 'react';
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

export default function AdminClientsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-clients', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.append('search', search.trim());
      const res = await apiClient.get(`/admin/clients?${params}`);
      return res.data;
    },
    enabled: isAdmin,
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const clients: Client[] = data?.data ?? [];
  const count: number = data?.count ?? 0;
  const totalPages = Math.ceil(count / 20);

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Clients</h1>
          <p className="db-page-sub">{count} total clients</p>
        </div>
      </div>

      <div className="aq-search-row">
        <input
          className="form-input aq-search-input"
          placeholder="Search by name, email, or PAN…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div className="db-alert-error">Failed to load clients.</div>}

      {clients.length === 0 && !error ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">👥</span>
          <p className="db-empty-title">No clients found</p>
          {search && <p className="db-empty-desc">Try a different search term.</p>}
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>PAN</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td className="aq-td-name">{c.first_name} {c.last_name}</td>
                    <td className="aq-client-email">{c.email}</td>
                    <td>{c.mobile}</td>
                    <td><span className="aq-mono">{c.pan}</span></td>
                    <td>
                      <span className={`aq-badge ${c.is_active ? 'aq-badge-done' : 'aq-badge-hold'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td>
                      <Link to={`/admin/clients/${c.id}`} className="btn btn-sm btn-secondary">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="aq-pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="aq-pagination-info">Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
