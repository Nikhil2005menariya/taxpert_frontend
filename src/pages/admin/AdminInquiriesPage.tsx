import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import Loader from '../../components/ui/Loader';

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_needed: string;
  message: string | null;
  is_consulted: boolean;
  consulted_at: string | null;
  notes: string | null;
  created_at: string;
}

const LIMIT = 20;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ChevD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
);

function MarkConsultedModal({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const mark = useMutation({
    mutationFn: () => apiClient.patch(`/admin/consultations/${inquiry.id}/consulted`, { notes: notes.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-consultations'] });
      onClose();
    },
  });

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Consultation</p>
            <h3 className="adm-modal-title">Mark as Consulted</h3>
            <p className="adm-modal-sub"><strong>{inquiry.name}</strong> · {inquiry.service_needed}</p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Notes <span className="adm-label-opt">(optional)</span></label>
            <textarea
              className="adm-textarea"
              rows={3}
              placeholder="Outcome, follow-up details…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          {mark.isError && (
            <p className="adm-modal-err">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              {(mark.error as any)?.response?.data?.error ?? 'Failed to update'}
            </p>
          )}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={mark.isPending} onClick={() => mark.mutate()}>
            {mark.isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInquiriesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('');        // '' | 'pending' | 'consulted'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [marking, setMarking]   = useState<Inquiry | null>(null);

  function resetPage() { setPage(1); }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-consultations', page, status, fromDate, toDate],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status)   p.append('status',    status);
      if (fromDate) p.append('from_date', fromDate);
      if (toDate)   p.append('to_date',   toDate);
      return (await apiClient.get(`/admin/consultations?${p}`)).data as {
        data: Inquiry[]; count: number; page: number; limit: number;
      };
    },
    enabled: isAdmin,
    placeholderData: prev => prev,
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const rows       = data?.data ?? [];
  const count      = data?.count ?? 0;
  const totalPages = Math.ceil(count / LIMIT);
  const hasFilters = !!(fromDate || toDate || status);

  return (
    <div className="adm-root">
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Pipeline</p>
            <h1 className="adm-hero-title">Inquiries</h1>
            <p className="adm-hero-date">{count} consultation request{count !== 1 ? 's' : ''} from the marketing site.</p>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-filterbar">
          <div className="adm-fgroup">
            <label className="adm-flabel">From</label>
            <input type="date" className="adm-input adm-input--date" value={fromDate} onChange={e => { setFromDate(e.target.value); resetPage(); }} />
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">To</label>
            <input type="date" className="adm-input adm-input--date" value={toDate} onChange={e => { setToDate(e.target.value); resetPage(); }} />
          </div>
          <div className="adm-fgroup">
            <label className="adm-flabel">Status</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={status} onChange={e => { setStatus(e.target.value); resetPage(); }} style={{ width: 160 }}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="consulted">Consulted</option>
              </select>
              <span className="adm-select-ico">{ChevD}</span>
            </div>
          </div>
          {hasFilters && (
            <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => { setFromDate(''); setToDate(''); setStatus(''); resetPage(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <div className="adm-banner adm-banner--err" style={{ marginBottom: 0 }}>Failed to load inquiries.</div>
        ) : isLoading ? (
          <div className="adm-loading"><Loader /></div>
        ) : rows.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </span>
            <p className="adm-empty-txt">{hasFilters ? 'No inquiries match these filters.' : 'No inquiries yet.'}</p>
          </div>
        ) : (
          <>
            <div className="adm-tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Service Needed</th>
                    <th>Message</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th className="adm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--lp-ink)' }}>{row.name}</span></td>
                      <td className="adm-mono"><a href={`tel:${row.phone}`} className="adm-link-inherit">{row.phone}</a></td>
                      <td className="adm-mono adm-cell-email" title={row.email}><a href={`mailto:${row.email}`} className="adm-link-inherit">{row.email}</a></td>
                      <td>{row.service_needed}</td>
                      <td className="adm-cell-msg">
                        {row.message ? <span title={row.message}>{row.message}</span> : <span style={{ color: 'var(--lp-ink-faint)' }}>—</span>}
                      </td>
                      <td className="adm-mono">{fmtDate(row.created_at)}</td>
                      <td>
                        {row.is_consulted
                          ? <span className="adm-badge adm-badge--green"><span className="adm-badge-dot" />Consulted</span>
                          : <span className="adm-badge adm-badge--amber"><span className="adm-badge-dot" />Pending</span>}
                      </td>
                      <td className="adm-cell-actions">
                        <div className="adm-actions">
                          {!row.is_consulted ? (
                            <button className="adm-btn adm-btn--accent adm-btn--sm" onClick={() => setMarking(row)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                              Mark Consulted
                            </button>
                          ) : row.consulted_at ? (
                            <span className="adm-mono" style={{ fontSize: '0.72rem', color: 'var(--lp-ink-faint)' }}>
                              {new Date(row.consulted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          ) : null}
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg><span>Prev</span>
                </button>
                <span className="adm-pager-info">Page <b>{page}</b> of <b>{totalPages}</b></span>
                <button className="adm-pager-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <span>Next</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {marking && <MarkConsultedModal inquiry={marking} onClose={() => setMarking(null)} />}
    </div>
  );
}
