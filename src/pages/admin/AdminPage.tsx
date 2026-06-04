import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Loader from '../../components/ui/Loader';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import CreateUserForm from '../../components/admin/CreateUserForm';
import UserRoleBadge from '../../components/admin/UserRoleBadge';
import ResetPasswordButton from '../../components/admin/ResetPasswordButton';

type ValidRole = 'super_admin' | 'admin' | 'expert' | 'ca' | 'staff' | 'client';

const LIMIT = 20;

const STAFF_ROLES: { value: string; label: string }[] = [
  { value: '',            label: 'All roles' },
  { value: 'expert',     label: 'Expert' },
  { value: 'ca',         label: 'CA' },
  { value: 'admin',      label: 'Admin' },
  { value: 'staff',      label: 'Staff' },
  { value: 'super_admin',label: 'Super Admin' },
];

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

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="aq-pagination">
      <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span className="aq-pagination-info">Page {page} of {totalPages}</span>
      <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

export default function AdminPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'clients';

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  // ── Client tab state ──────────────────────────────────────────
  const [clientRaw, setClientRaw]   = useState('');
  const [clientPage, setClientPage] = useState(1);
  const clientSearch = useDebounce(clientRaw);

  // Reset page when search changes
  const prevClientSearch = useRef(clientSearch);
  useEffect(() => {
    if (clientSearch !== prevClientSearch.current) {
      setClientPage(1);
      prevClientSearch.current = clientSearch;
    }
  }, [clientSearch]);

  // ── Staff tab state ───────────────────────────────────────────
  const [staffRaw, setStaffRaw]     = useState('');
  const [staffPage, setStaffPage]   = useState(1);
  const [staffRole, setStaffRole]   = useState('');
  const staffSearch = useDebounce(staffRaw);

  const prevStaffSearch = useRef(staffSearch);
  useEffect(() => {
    if (staffSearch !== prevStaffSearch.current) {
      setStaffPage(1);
      prevStaffSearch.current = staffSearch;
    }
  }, [staffSearch]);

  function handleStaffRole(val: string) {
    setStaffRole(val);
    setStaffPage(1);
  }

  // ── Queries ───────────────────────────────────────────────────
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['admin-users-clients', clientPage, clientSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(clientPage), limit: String(LIMIT) });
      if (clientSearch) p.append('search', clientSearch);
      return (await apiClient.get(`/admin/users/clients?${p}`)).data;
    },
    enabled: isAdmin && tab === 'clients',
    placeholderData: (prev) => prev,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-users-staff', staffPage, staffSearch, staffRole],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(staffPage), limit: String(LIMIT) });
      if (staffSearch) p.append('search', staffSearch);
      if (staffRole)   p.append('role',   staffRole);
      return (await apiClient.get(`/admin/users/staff?${p}`)).data;
    },
    enabled: isAdmin && tab === 'staff',
    placeholderData: (prev) => prev,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const clientUsers:      any[]  = clientData?.data  ?? [];
  const clientCount:      number = clientData?.count  ?? 0;
  const clientTotalPages: number = Math.ceil(clientCount / LIMIT);

  const staffUsers:      any[]  = staffData?.data  ?? [];
  const staffCount:      number = staffData?.count  ?? 0;
  const staffTotalPages: number = Math.ceil(staffCount / LIMIT);

  const tabs = [
    { id: 'clients', label: 'Clients' },
    { id: 'staff',   label: 'Staff & Experts' },
    { id: 'create',  label: '+ Create User' },
  ];

  return (
    <div className="adm-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p className="adm-kicker">{isSuperAdmin ? 'Super Admin · Operations' : 'Operations'}</p>
          <h1 className="page-title">Admin Panel</h1>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="sa-banner">
          <span className="sa-badge">Super Admin</span>
          You have full platform control including role assignment.
        </div>
      )}

      <nav className="adm-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSearchParams({ tab: t.id })}
            className={`adm-tab${tab === t.id ? ' adm-tab-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Clients tab ─────────────────────────────────────── */}
      {tab === 'clients' && (
        <section className="adm-section">
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Client Accounts</h2>
              <p className="adm-section-desc">
                {clientCount > 0 ? `${clientCount} client${clientCount !== 1 ? 's' : ''} found` : 'All registered client accounts.'}
              </p>
            </div>
            <button onClick={() => setSearchParams({ tab: 'create' })} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
              + Add Client
            </button>
          </div>

          <div className="aq-search-row">
            <input
              className="form-input aq-search-input"
              placeholder="Search by name, PAN, or phone number…"
              value={clientRaw}
              onChange={e => setClientRaw(e.target.value)}
            />
          </div>

          {clientLoading ? (
            <div className="page-loader"><Loader /></div>
          ) : clientUsers.length === 0 ? (
            <div className="adm-empty">
              {clientRaw ? 'No clients match your search.' : 'No clients registered yet.'}
            </div>
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>PAN</th>
                      <th>Mobile</th>
                      <th>Services</th>
                      <th>Completed</th>
                      <th>Since</th>
                      <th>Password</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientUsers.map((u: any) => (
                      <tr key={u.id}>
                        <td className="adm-name">
                          <div className="adm-avatar">{u.first_name[0]}{u.last_name[0]}</div>
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="adm-muted">{u.email}</td>
                        <td><code className="adm-code">{u.pan}</code></td>
                        <td className="adm-muted">{u.mobile || '—'}</td>
                        <td><span className="adm-count">{u.total_services}</span></td>
                        <td>
                          <span className="adm-count" style={u.completed_services ? { background: '#f0fdf4', color: '#057a55' } : {}}>
                            {u.completed_services}
                          </span>
                        </td>
                        <td className="adm-muted">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td><ResetPasswordButton userId={u.id} userName={`${u.first_name} ${u.last_name}`} /></td>
                        <td><Link to={`/admin/users/client/${u.id}`} className="btn btn-sm btn-secondary">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={clientPage} totalPages={clientTotalPages} onChange={setClientPage} />
            </>
          )}
        </section>
      )}

      {/* ── Staff tab ────────────────────────────────────────── */}
      {tab === 'staff' && (
        <section className="adm-section">
          <div className="adm-section-header">
            <div>
              <h2 className="adm-section-title">Staff & Experts</h2>
              <p className="adm-section-desc">
                {staffCount > 0 ? `${staffCount} member${staffCount !== 1 ? 's' : ''} found` : 'Taxperts, staff, and admins.'}
                {isSuperAdmin ? ' As Super Admin, you can assign any role.' : ''}
              </p>
            </div>
            <button onClick={() => setSearchParams({ tab: 'create' })} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
              + Add Staff
            </button>
          </div>

          <div className="aq-search-row">
            <input
              className="form-input aq-search-input"
              placeholder="Search by name or phone number…"
              value={staffRaw}
              onChange={e => setStaffRaw(e.target.value)}
            />
            <select
              className="form-input aq-filter-select"
              value={staffRole}
              onChange={e => handleStaffRole(e.target.value)}
            >
              {STAFF_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {staffLoading ? (
            <div className="page-loader"><Loader /></div>
          ) : staffUsers.length === 0 ? (
            <div className="adm-empty">
              {staffRaw || staffRole ? 'No staff match your search.' : 'No staff accounts yet.'}
            </div>
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>PAN</th>
                      <th>Mobile</th>
                      <th>Role</th>
                      <th>Since</th>
                      <th>Password</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((u: any) => {
                      const isTaxpert = u.role === 'expert' || u.role === 'ca';
                      return (
                        <tr key={u.id}>
                          <td className="adm-name">
                            <div className="adm-avatar">{u.first_name[0]}{u.last_name[0]}</div>
                            {u.first_name} {u.last_name}
                          </td>
                          <td className="adm-muted">{u.email}</td>
                          <td><code className="adm-code">{u.pan}</code></td>
                          <td className="adm-muted">{u.mobile || '—'}</td>
                          <td>
                            <UserRoleBadge
                              userId={u.id}
                              currentRole={u.role as ValidRole}
                              viewerRole={(profile?.role ?? 'admin') as ValidRole}
                            />
                          </td>
                          <td className="adm-muted">
                            {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td><ResetPasswordButton userId={u.id} userName={`${u.first_name} ${u.last_name}`} /></td>
                          <td>
                            {isTaxpert && (
                              <Link to={`/admin/users/taxpert/${u.id}`} className="btn btn-sm btn-secondary">View</Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={staffPage} totalPages={staffTotalPages} onChange={setStaffPage} />
            </>
          )}
        </section>
      )}

      {/* ── Create tab ───────────────────────────────────────── */}
      {tab === 'create' && (
        <section className="adm-section">
          <h2 className="adm-section-title">Create New User</h2>
          <p className="adm-section-desc" style={{ marginBottom: '1.5rem' }}>
            Accounts created here are auto-confirmed and immediately ready for platform access.
          </p>
          <div className="adm-create-wrap">
            <div className="card">
              <CreateUserForm isSuperAdmin={isSuperAdmin} />
            </div>
          </div>
        </section>
      )}

      <style>{`
        .adm-page { padding-bottom: 3rem; }
        .adm-kicker { margin: 0 0 0.35rem; color: #2563eb; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }

        .sa-banner {
          display: flex; align-items: center; gap: 0.75rem;
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          border: 1px solid #c7d2fe; border-radius: 0.875rem;
          padding: 0.75rem 1.1rem; font-size: 0.82rem; color: #4338ca;
          font-weight: 500; margin-bottom: 1.25rem;
        }
        .sa-badge {
          background: #4338ca; color: #fff; font-size: 0.68rem; font-weight: 800;
          padding: 0.2rem 0.6rem; border-radius: 999px; letter-spacing: 0.05em; white-space: nowrap;
        }

        .adm-tabs {
          display: flex; gap: 0.2rem; flex-wrap: wrap; margin-bottom: 1.75rem;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 0.875rem; padding: 0.28rem; width: fit-content;
        }
        .adm-tab {
          padding: 0.5rem 1.1rem; border-radius: 0.6rem; font-size: 0.82rem;
          font-weight: 500; color: #64748b; white-space: nowrap;
          border: none; background: transparent; cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .adm-tab:hover { color: #0f172a; background: rgba(255,255,255,0.8); }
        .adm-tab-active { background: #fff; color: #1d4ed8; font-weight: 600; box-shadow: 0 1px 6px rgba(15,23,42,0.1); }

        .adm-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .adm-section-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 0 0 0.2rem; }
        .adm-section-desc { font-size: 0.82rem; color: #94a3b8; margin: 0; max-width: 60ch; }

        .adm-table-wrap { overflow-x: auto; border-radius: 1.1rem; border: 1px solid rgba(226,232,240,0.9); box-shadow: 0 4px 20px rgba(15,23,42,0.05); }
        .adm-table { width: 100%; border-collapse: collapse; font-size: 0.845rem; background: #fff; }
        .adm-table thead tr { background: linear-gradient(to right, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; }
        .adm-table th { text-align: left; padding: 0.75rem 1rem; color: #94a3b8; font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
        .adm-table td { padding: 0.9rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        .adm-table tbody tr { transition: background 0.12s; }
        .adm-table tbody tr:hover td { background: #f8fbff; }

        .adm-name { display: flex; align-items: center; gap: 0.65rem; font-weight: 600; color: #0f172a; white-space: nowrap; }
        .adm-muted { color: #64748b; font-size: 0.82rem; }
        .adm-avatar {
          width: 34px; height: 34px; border-radius: 999px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8; display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800; flex-shrink: 0;
          box-shadow: 0 0 0 2px #fff, 0 0 0 3px #bfdbfe;
        }
        .adm-code {
          background: #f1f5f9; color: #475569; padding: 0.18rem 0.5rem;
          border-radius: 5px; font-size: 0.76rem; font-family: 'Courier New', monospace;
          white-space: nowrap; letter-spacing: 0.04em; border: 1px solid #e2e8f0;
        }
        .adm-count {
          background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
          border-radius: 999px; padding: 0.18rem 0.6rem;
          font-size: 0.76rem; font-weight: 700; display: inline-block;
        }

        .adm-create-wrap { max-width: 560px; }
        .adm-empty {
          text-align: center; padding: 3rem 2rem; color: #94a3b8; font-size: 0.9rem;
          background: #fafafa; border: 1.5px dashed #e2e8f0; border-radius: 1.1rem;
        }
      `}</style>
    </div>
  );
}
