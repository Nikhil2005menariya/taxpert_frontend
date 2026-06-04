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
  { value: 'expert',      label: 'Expert' },
  { value: 'ca',          label: 'CA' },
  { value: 'admin',       label: 'Admin' },
  { value: 'staff',       label: 'Staff' },
  { value: 'super_admin', label: 'Super Admin' },
];

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  create: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  chevronL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  chevronR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  usersEmpty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),
};

/* ── Rotating + add button (themed to accent) ───────────────── */
function AddButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button className="adm-add" type="button" title={title} aria-label={title} onClick={onClick}>
      <svg viewBox="0 0 24 24" height="46" width="46" xmlns="http://www.w3.org/2000/svg">
        <path strokeWidth="1.5" d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" />
        <path strokeWidth="1.5" d="M8 12H16" />
        <path strokeWidth="1.5" d="M12 16V8" />
      </svg>
    </button>
  );
}

/* ── View button (slides toward detail) ─────────────────────── */
function ViewButton({ to }: { to: string }) {
  return (
    <Link to={to} className="adm-view">
      View
      <span className="adm-view-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

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
    <div className="adm-pager">
      <button className="adm-pager-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {Icon.chevronL}<span>Prev</span>
      </button>
      <span className="adm-pager-info">Page <b>{page}</b> of <b>{totalPages}</b></span>
      <button className="adm-pager-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <span>Next</span>{Icon.chevronR}
      </button>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

  const prevClientSearch = useRef(clientSearch);
  useEffect(() => {
    if (clientSearch !== prevClientSearch.current) {
      setClientPage(1);
      prevClientSearch.current = clientSearch;
    }
  }, [clientSearch]);

  // ── Staff tab state ───────────────────────────────────────────
  const [staffRaw, setStaffRaw]   = useState('');
  const [staffPage, setStaffPage] = useState(1);
  const [staffRole, setStaffRole] = useState('');
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
    { id: 'clients', label: 'Clients',          icon: Icon.clients },
    { id: 'staff',   label: 'Staff & Experts',  icon: Icon.staff },
    { id: 'create',  label: 'Create User',      icon: Icon.create },
  ];

  return (
    <div className="adm-root adm-um">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Administration</p>
            <h1 className="adm-hero-title">User Management</h1>
            <p className="adm-hero-date">Manage client accounts, staff, and experts across the platform.</p>
          </div>
          <div className="adm-hero-aside">
            {isSuperAdmin ? (
              <>
                <span className="adm-hero-badge">{Icon.shield} Super Admin</span>
                <p className="adm-hero-note">Full platform control, including role assignment.</p>
              </>
            ) : (
              <span className="adm-hero-live">
                <span className="adm-hero-live-dot" /> Operations
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <nav className="adm-seg" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setSearchParams({ tab: t.id })}
            className={`adm-seg-btn${tab === t.id ? ' is-active' : ''}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Clients tab ────────────────────────────────────────── */}
      {tab === 'clients' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles">
              <h2 className="adm-panel-title">
                Client accounts
                {clientCount > 0 && <span className="adm-count">{clientCount}</span>}
              </h2>
              <p className="adm-panel-desc">All registered client accounts on the platform.</p>
            </div>
            <AddButton title="Add client" onClick={() => setSearchParams({ tab: 'create' })} />
          </div>

          <div className="adm-toolbar">
            <div className="adm-search">
              <span className="adm-search-ico">{Icon.search}</span>
              <input
                className="adm-search-input"
                placeholder="Search by name, PAN, or phone number…"
                value={clientRaw}
                onChange={e => setClientRaw(e.target.value)}
              />
              {clientRaw && (
                <button className="adm-search-clear" onClick={() => setClientRaw('')} aria-label="Clear search">{Icon.x}</button>
              )}
            </div>
          </div>

          {clientLoading ? (
            <div className="adm-loading"><Loader /></div>
          ) : clientUsers.length === 0 ? (
            <div className="adm-empty-box">
              <span className="adm-empty-ico">{Icon.usersEmpty}</span>
              <p className="adm-empty-txt">{clientRaw ? 'No clients match your search.' : 'No clients registered yet.'}</p>
            </div>
          ) : (
            <>
              <div className="adm-tbl-wrap">
                <table className="adm-tbl">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>PAN</th>
                      <th>Mobile</th>
                      <th>Services</th>
                      <th>Completed</th>
                      <th>Since</th>
                      <th className="adm-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientUsers.map((u: any) => (
                      <tr key={u.id}>
                        <td>
                          <div className="adm-tbl-name">
                            <span className="adm-avatar">{u.first_name?.[0]}{u.last_name?.[0]}</span>
                            {u.first_name} {u.last_name}
                          </div>
                        </td>
                        <td className="adm-mono adm-cell-email" title={u.email}>{u.email}</td>
                        <td><code className="adm-code">{u.pan}</code></td>
                        <td className="adm-mono">{u.mobile || '—'}</td>
                        <td><span className="adm-chip-num">{u.total_services}</span></td>
                        <td>
                          <span className={`adm-chip-num${u.completed_services ? ' adm-chip-num--done' : ' adm-chip-num--zero'}`}>
                            {u.completed_services}
                          </span>
                        </td>
                        <td className="adm-mono">{fmtDate(u.created_at)}</td>
                        <td className="adm-cell-actions">
                          <div className="adm-actions">
                            <ResetPasswordButton userId={u.id} userName={`${u.first_name} ${u.last_name}`} />
                            <ViewButton to={`/admin/users/client/${u.id}`} />
                          </div>
                        </td>
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

      {/* ── Staff tab ──────────────────────────────────────────── */}
      {tab === 'staff' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles">
              <h2 className="adm-panel-title">
                Staff &amp; Experts
                {staffCount > 0 && <span className="adm-count">{staffCount}</span>}
              </h2>
              <p className="adm-panel-desc">
                Taxperts, staff, and admins.{isSuperAdmin ? ' As Super Admin, you can assign any role inline.' : ''}
              </p>
            </div>
            <AddButton title="Add staff" onClick={() => setSearchParams({ tab: 'create' })} />
          </div>

          <div className="adm-toolbar">
            <div className="adm-search">
              <span className="adm-search-ico">{Icon.search}</span>
              <input
                className="adm-search-input"
                placeholder="Search by name or phone number…"
                value={staffRaw}
                onChange={e => setStaffRaw(e.target.value)}
              />
              {staffRaw && (
                <button className="adm-search-clear" onClick={() => setStaffRaw('')} aria-label="Clear search">{Icon.x}</button>
              )}
            </div>
            <div className="adm-filter">
              <select
                className="adm-filter-select"
                value={staffRole}
                onChange={e => handleStaffRole(e.target.value)}
              >
                {STAFF_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className="adm-filter-ico">{Icon.chevronD}</span>
            </div>
          </div>

          {staffLoading ? (
            <div className="adm-loading"><Loader /></div>
          ) : staffUsers.length === 0 ? (
            <div className="adm-empty-box">
              <span className="adm-empty-ico">{Icon.usersEmpty}</span>
              <p className="adm-empty-txt">{staffRaw || staffRole ? 'No staff match your search.' : 'No staff accounts yet.'}</p>
            </div>
          ) : (
            <>
              <div className="adm-tbl-wrap">
                <table className="adm-tbl">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>PAN</th>
                      <th>Mobile</th>
                      <th>Role</th>
                      <th>Since</th>
                      <th className="adm-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((u: any) => {
                      const isTaxpert = u.role === 'expert' || u.role === 'ca';
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="adm-tbl-name">
                              <span className="adm-avatar">{u.first_name?.[0]}{u.last_name?.[0]}</span>
                              {u.first_name} {u.last_name}
                            </div>
                          </td>
                          <td className="adm-mono adm-cell-email" title={u.email}>{u.email}</td>
                          <td><code className="adm-code">{u.pan}</code></td>
                          <td className="adm-mono">{u.mobile || '—'}</td>
                          <td>
                            <UserRoleBadge
                              userId={u.id}
                              currentRole={u.role as ValidRole}
                              viewerRole={(profile?.role ?? 'admin') as ValidRole}
                            />
                          </td>
                          <td className="adm-mono">{fmtDate(u.created_at)}</td>
                          <td className="adm-cell-actions">
                            <div className="adm-actions">
                              <ResetPasswordButton userId={u.id} userName={`${u.first_name} ${u.last_name}`} />
                              {isTaxpert && <ViewButton to={`/admin/users/taxpert/${u.id}`} />}
                            </div>
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

      {/* ── Create tab ─────────────────────────────────────────── */}
      {tab === 'create' && (
        <div className="adm-create">
          <section className="adm-panel">
            <div className="adm-panel-titles" style={{ marginBottom: '1.25rem' }}>
              <h2 className="adm-panel-title">Create new user</h2>
              <p className="adm-panel-desc">
                Accounts created here are auto-confirmed and immediately ready for platform access.
              </p>
            </div>
            <CreateUserForm isSuperAdmin={isSuperAdmin} />
          </section>

          <aside className="adm-create-aside">
            <div className="adm-aside-glow" />
            <p className="adm-aside-eyebrow">— What happens</p>
            <h3 className="adm-aside-title">Onboarding, handled for you</h3>
            <ul className="adm-aside-list">
              <li className="adm-aside-item">
                <span className="adm-aside-ico">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
                  </svg>
                </span>
                <div>
                  <p className="adm-aside-h">Auto-confirmed</p>
                  <p className="adm-aside-p">No email verification step — the account is active the moment it's created.</p>
                </div>
              </li>
              <li className="adm-aside-item">
                <span className="adm-aside-ico">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <div>
                  <p className="adm-aside-h">Role-scoped access</p>
                  <p className="adm-aside-p">
                    {isSuperAdmin
                      ? 'You may assign any role, including Admin and Super Admin.'
                      : 'Admin and Super Admin roles require Super Admin access.'}
                  </p>
                </div>
              </li>
              <li className="adm-aside-item">
                <span className="adm-aside-ico">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <div>
                  <p className="adm-aside-h">Secure credentials</p>
                  <p className="adm-aside-p">Set an initial password now — it can be reset anytime from the user table.</p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
