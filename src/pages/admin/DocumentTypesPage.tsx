import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

type DocType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_common_document: boolean;
  is_active: boolean;
  allowed_extensions: string[];
  max_file_size_mb: number;
};

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
  ),
};

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

function EditModal({ doc, onClose, onToggled }: { doc: DocType; onClose: () => void; onToggled: (name: string, active: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(doc.name);
  const [desc, setDesc] = useState(doc.description ?? '');
  const [exts, setExts] = useState(doc.allowed_extensions.join(', '));
  const [maxMb, setMaxMb] = useState(String(doc.max_file_size_mb));
  const [isCommon, setIsCommon] = useState(doc.is_common_document);

  const save = useMutation({
    mutationFn: () => apiClient.patch(`/config/document-types/${doc.id}`, {
      name: name.trim(),
      description: desc.trim() || null,
      is_common_document: isCommon,
      allowed_extensions: exts.split(',').map(e => e.trim()).filter(Boolean),
      max_file_size_mb: parseInt(maxMb) || 10,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doc-types'] });
      onClose();
    },
  });

  const toggleActive = useMutation({
    mutationFn: () => apiClient.patch(`/config/document-types/${doc.id}`, { is_active: !doc.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doc-types'] });
      onToggled(doc.name, !doc.is_active);
      onClose();
    },
  });

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Document Type</p>
            <h3 className="adm-modal-title">Edit “{doc.name}”</h3>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Code</label>
            <input className="adm-input" value={doc.code} disabled style={{ opacity: 0.55 }} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Display Name *</label>
            <input className="adm-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Description</label>
            <input className="adm-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this document is" />
          </div>
          <div className="adm-field">
            <label className="adm-label">Allowed Extensions <span className="adm-label-opt">(comma-separated)</span></label>
            <input className="adm-input" value={exts} onChange={e => setExts(e.target.value)} placeholder="pdf, jpg, jpeg, png" />
          </div>
          <div className="adm-field">
            <label className="adm-label">Max File Size (MB)</label>
            <input className="adm-input" type="number" min="1" value={maxMb} onChange={e => setMaxMb(e.target.value)} />
          </div>
          <label className="adm-check">
            <input type="checkbox" checked={isCommon} onChange={e => setIsCommon(e.target.checked)} />
            Common document (PAN, Aadhaar, etc.)
          </label>
          {save.isError && <p className="adm-modal-err">{Icon.alert}{(save.error as any)?.response?.data?.error}</p>}
          {toggleActive.isError && <p className="adm-modal-err">{Icon.alert}{(toggleActive.error as any)?.response?.data?.error}</p>}
        </div>

        <div className="adm-modal-foot" style={{ justifyContent: 'space-between' }}>
          <button
            className={`adm-btn ${doc.is_active ? 'adm-btn--danger' : 'adm-btn--ghost'}`}
            disabled={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {toggleActive.isPending
              ? (doc.is_active ? 'Deactivating…' : 'Activating…')
              : (doc.is_active ? 'Mark Inactive' : 'Mark Active')}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
            <button className="adm-btn adm-btn--accent" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentTypesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [filterCommon, setFilterCommon] = useState<'all' | 'common' | 'service'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocType | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // New doc form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isCommon, setIsCommon] = useState(false);
  const [maxMb, setMaxMb] = useState('10');
  const [exts, setExts] = useState('pdf,jpg,jpeg,png');

  const { data: docTypes, isLoading } = useQuery({
    queryKey: ['admin-doc-types'],
    queryFn: async () => (await apiClient.get('/config/document-types')).data.data ?? [],
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => apiClient.post('/config/document-types', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doc-types'] });
      flash('ok', 'Document type created.');
      setCode(''); setName(''); setDesc(''); setIsCommon(false); setMaxMb('10'); setExts('pdf,jpg,jpeg,png');
      setShowForm(false);
    },
    onError: (err: any) => flash('err', err.response?.data?.error ?? 'Failed to create.'),
  });

  const toggleCommon = useMutation({
    mutationFn: ({ id, is_common_document }: { id: string; is_common_document: boolean }) =>
      apiClient.patch(`/config/document-types/${id}`, { is_common_document }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-doc-types'] }),
    onError: (err: any) => flash('err', err.response?.data?.error ?? 'Failed to update.'),
  });

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const all: DocType[] = docTypes ?? [];
  const filtered = all.filter(d => {
    const matchSearch = !search.trim() ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase());
    const matchCommon =
      filterCommon === 'all' ||
      (filterCommon === 'common' ? d.is_common_document : !d.is_common_document);
    return matchSearch && matchCommon;
  });

  const commonCount = all.filter(d => d.is_common_document).length;

  return (
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Configuration</p>
            <h1 className="adm-hero-title">Document Types</h1>
            <p className="adm-hero-date">Define the document slots clients can be asked to upload across services.</p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{all.length}</div><div className="adm-hero-stat-lbl">Types</div></div>
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{commonCount}</div><div className="adm-hero-stat-lbl">Common</div></div>
          </div>
        </div>
      </header>

      {msg && (
        <div className={`adm-banner adm-banner--${msg.type === 'ok' ? 'ok' : 'err'}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'ok' ? Icon.check : Icon.alert}{msg.text}
        </div>
      )}

      {/* New type form */}
      {showForm && (
        <section className="adm-panel" style={{ marginBottom: '1.25rem' }}>
          <div className="adm-sub-head">
            <div>
              <h3 className="adm-sub-title">New Document Type</h3>
              <p className="adm-sub-desc">Defines a reusable document slot. The code is used internally and cannot change later.</p>
            </div>
          </div>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label">Code *</label>
              <input className="adm-input" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. FORM_16" />
              <span className="adm-field-hint">Uppercase, underscores. Used internally.</span>
            </div>
            <div className="adm-field">
              <label className="adm-label">Display Name *</label>
              <input className="adm-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Form 16 (Part A & B)" />
            </div>
            <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <label className="adm-label">Description</label>
              <input className="adm-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this document is used for" />
            </div>
            <div className="adm-field">
              <label className="adm-label">Allowed Extensions</label>
              <input className="adm-input" value={exts} onChange={e => setExts(e.target.value)} placeholder="pdf,jpg,jpeg,png" />
            </div>
            <div className="adm-field">
              <label className="adm-label">Max File Size (MB)</label>
              <input className="adm-input" type="number" min="1" value={maxMb} onChange={e => setMaxMb(e.target.value)} />
            </div>
            <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <label className="adm-check">
                <input type="checkbox" checked={isCommon} onChange={e => setIsCommon(e.target.checked)} />
                Common document — required across many services (PAN, Aadhaar, bank statements, etc.)
              </label>
            </div>
          </div>
          {createMut.isError && (
            <p className="adm-modal-err" style={{ marginTop: '0.75rem' }}>{Icon.alert}{(createMut.error as any)?.response?.data?.error}</p>
          )}
          <div className="adm-savebar" style={{ marginTop: '1.1rem' }}>
            <button className="adm-btn adm-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="adm-submit"
              disabled={!code.trim() || !name.trim() || createMut.isPending}
              onClick={() => createMut.mutate({
                code, name,
                description: desc || null,
                is_common_document: isCommon,
                allowed_extensions: exts.split(',').map(e => e.trim()).filter(Boolean),
                max_file_size_mb: parseInt(maxMb) || 10,
              })}
            >
              {createMut.isPending ? <><span className="adm-submit-spin" /> Creating…</> : 'Create Document Type'}
            </button>
          </div>
        </section>
      )}

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">Document types<span className="adm-count">{filtered.length}</span></h2>
            <p className="adm-panel-desc">Toggle whether a type is a common document, or open it to edit details.</p>
          </div>
          <AddButton title={showForm ? 'Close form' : 'New document type'} onClick={() => setShowForm(v => !v)} />
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search">
            <span className="adm-search-ico">{Icon.search}</span>
            <input
              className="adm-search-input"
              placeholder="Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="adm-search-clear" onClick={() => setSearch('')} aria-label="Clear search">{Icon.x}</button>
            )}
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={filterCommon} onChange={e => setFilterCommon(e.target.value as typeof filterCommon)}>
              <option value="all">All types</option>
              <option value="common">Common docs only</option>
              <option value="service">Service-specific only</option>
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">No document types found.</p>
          </div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Extensions</th>
                  <th style={{ textAlign: 'center' }}>Max MB</th>
                  <th style={{ textAlign: 'center' }}>Common Doc</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th className="adm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} style={{ opacity: d.is_active ? 1 : 0.55 }}>
                    <td><code className="adm-code">{d.code}</code></td>
                    <td>
                      <div className="adm-tbl-name">{d.name}</div>
                      {d.description && <div className="adm-row-desc" style={{ marginTop: 2 }}>{d.description}</div>}
                    </td>
                    <td>
                      <div className="adm-ext-row">
                        {d.allowed_extensions.map(e => (
                          <span key={e} className="adm-ext">{e}</span>
                        ))}
                      </div>
                    </td>
                    <td className="adm-mono" style={{ textAlign: 'center' }}>{d.max_file_size_mb}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`adm-flag ${d.is_common_document ? 'is-on' : ''}`}
                        title={d.is_common_document ? 'Click to remove common flag' : 'Click to mark as common'}
                        disabled={toggleCommon.isPending}
                        onClick={() => toggleCommon.mutate({ id: d.id, is_common_document: !d.is_common_document })}
                      >
                        {d.is_common_document ? 'Common' : 'Service'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`adm-badge ${d.is_active ? 'adm-badge--green' : 'adm-badge--neutral'}`}>
                        <span className="adm-badge-dot" />{d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="adm-cell-actions">
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setEditingDoc(d)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingDoc && (
        <EditModal
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onToggled={(name, active) =>
            flash('ok', `"${name}" marked as ${active ? 'active' : 'inactive'}.`)
          }
        />
      )}
    </div>
  );
}
