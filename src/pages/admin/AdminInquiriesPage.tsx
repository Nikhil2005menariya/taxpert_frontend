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
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Mark as Consulted</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
            <strong>{inquiry.name}</strong> — {inquiry.service_needed}
          </p>
          <div className="form-group">
            <label className="form-label">Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Outcome, follow-up details…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          {mark.isError && (
            <p style={{ color: '#dc2626', fontSize: '0.82rem' }}>
              {(mark.error as any)?.response?.data?.error ?? 'Failed to update'}
            </p>
          )}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={mark.isPending} onClick={() => mark.mutate()}>
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

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Inquiries</h1>
          <p className="db-page-sub">{count} consultation request{count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aq-search-row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); resetPage(); }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={toDate}
            onChange={e => { setToDate(e.target.value); resetPage(); }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
          <select
            className="form-input aq-filter-select"
            value={status}
            onChange={e => { setStatus(e.target.value); resetPage(); }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="consulted">Consulted</option>
          </select>
        </div>
        {(fromDate || toDate || status) && (
          <button
            className="btn btn-sm btn-secondary"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => { setFromDate(''); setToDate(''); setStatus(''); resetPage(); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="db-alert-error">Failed to load inquiries.</div>}

      {isLoading ? (
        <div className="page-loader"><Loader /></div>
      ) : rows.length === 0 ? (
        <div className="db-empty-card">
          <span className="db-empty-icon">📋</span>
          <p className="db-empty-title">No inquiries found</p>
          {(fromDate || toDate || status) && (
            <p className="db-empty-desc">Try clearing the filters.</p>
          )}
        </div>
      ) : (
        <>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Service Needed</th>
                  <th>Message</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="aq-td-name">{row.name}</td>
                    <td><a href={`tel:${row.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{row.phone}</a></td>
                    <td className="aq-client-email">
                      <a href={`mailto:${row.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{row.email}</a>
                    </td>
                    <td>{row.service_needed}</td>
                    <td style={{ maxWidth: 200, color: '#64748b', fontSize: '0.82rem' }}>
                      {row.message
                        ? <span title={row.message}>{row.message.length > 60 ? row.message.slice(0, 60) + '…' : row.message}</span>
                        : <span className="aq-muted">—</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(row.created_at)}</td>
                    <td>
                      {row.is_consulted ? (
                        <span className="aq-badge aq-badge-done">Consulted</span>
                      ) : (
                        <span className="aq-badge aq-badge-hold">Pending</span>
                      )}
                    </td>
                    <td>
                      {!row.is_consulted && (
                        <button className="btn btn-sm btn-primary" onClick={() => setMarking(row)}>
                          Mark Consulted
                        </button>
                      )}
                      {row.is_consulted && row.consulted_at && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {new Date(row.consulted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
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

      {marking && <MarkConsultedModal inquiry={marking} onClose={() => setMarking(null)} />}
    </div>
  );
}
