import { useState } from 'react';
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
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Edit Document Type</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <div className="form-group">
            <label className="form-label">Code</label>
            <input className="form-input" value={doc.code} disabled style={{ opacity: 0.5 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this document is" />
          </div>
          <div className="form-group">
            <label className="form-label">Allowed Extensions (comma-separated)</label>
            <input className="form-input" value={exts} onChange={e => setExts(e.target.value)} placeholder="pdf, jpg, jpeg, png" />
          </div>
          <div className="form-group">
            <label className="form-label">Max File Size (MB)</label>
            <input className="form-input" type="number" min="1" value={maxMb} onChange={e => setMaxMb(e.target.value)} />
          </div>
          <label className="dt-toggle-label">
            <input type="checkbox" checked={isCommon} onChange={e => setIsCommon(e.target.checked)} />
            Common document (PAN, Aadhaar, etc.)
          </label>
          {save.isError && <p className="aq-modal-error">{(save.error as any)?.response?.data?.error}</p>}
          {toggleActive.isError && <p className="aq-modal-error">{(toggleActive.error as any)?.response?.data?.error}</p>}
        </div>

        <div className="aq-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className={`btn btn-sm ${doc.is_active ? 'dt-deactivate-btn' : 'dt-activate-btn'}`}
            disabled={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {toggleActive.isPending
              ? (doc.is_active ? 'Deactivating…' : 'Activating…')
              : (doc.is_active ? 'Mark Inactive' : 'Mark Active')}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
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

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
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
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Document Types</h1>
          <p className="db-page-sub">{all.length} types · {commonCount} common</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Type'}
        </button>
      </div>

      {msg && (
        <div className={`db-alert-${msg.type === 'ok' ? 'ok' : 'error'}`} style={{ fontSize: '0.85rem' }}>
          {msg.text}
        </div>
      )}

      {/* New type form */}
      {showForm && (
        <div className="asd-section">
          <h3 className="asd-section-title">New Document Type</h3>
          <div className="dt-form-grid">
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input className="form-input" value={code} onChange={e => setCode(e.target.value)}
                placeholder="e.g. FORM_16" />
              <span className="dt-field-hint">Uppercase, underscores. Used internally.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Display Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Form 16 (Part A & B)" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="What this document is used for" />
            </div>
            <div className="form-group">
              <label className="form-label">Allowed Extensions</label>
              <input className="form-input" value={exts} onChange={e => setExts(e.target.value)}
                placeholder="pdf,jpg,jpeg,png" />
            </div>
            <div className="form-group">
              <label className="form-label">Max File Size (MB)</label>
              <input className="form-input" type="number" min="1" value={maxMb}
                onChange={e => setMaxMb(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="dt-toggle-label">
                <input type="checkbox" checked={isCommon} onChange={e => setIsCommon(e.target.checked)} />
                Common document — required across many services (PAN, Aadhaar, bank statements, etc.)
              </label>
            </div>
          </div>
          {createMut.isError && (
            <p className="aq-modal-error">{(createMut.error as any)?.response?.data?.error}</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!code.trim() || !name.trim() || createMut.isPending}
              onClick={() => createMut.mutate({
                code,
                name,
                description: desc || null,
                is_common_document: isCommon,
                allowed_extensions: exts.split(',').map(e => e.trim()).filter(Boolean),
                max_file_size_mb: parseInt(maxMb) || 10,
              })}
            >
              {createMut.isPending ? 'Creating…' : 'Create Document Type'}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="dt-toolbar">
        <input
          type="search"
          className="form-input"
          placeholder="Search by name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="form-input"
          value={filterCommon}
          onChange={e => setFilterCommon(e.target.value as typeof filterCommon)}
          style={{ width: 'auto' }}
        >
          <option value="all">All types</option>
          <option value="common">Common docs only</option>
          <option value="service">Service-specific only</option>
        </select>
        <span className="dt-count">{filtered.length} of {all.length}</span>
      </div>

      {/* Table */}
      <div className="aq-table-wrap">
        <table className="aq-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Extensions</th>
              <th style={{ textAlign: 'center' }}>Max MB</th>
              <th style={{ textAlign: 'center' }}>Common Doc</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} style={{ opacity: d.is_active ? 1 : 0.55 }}>
                <td>
                  <code className="dt-code">{d.code}</code>
                </td>
                <td>
                  <div className="dt-name">{d.name}</div>
                  {d.description && <div className="dt-desc">{d.description}</div>}
                </td>
                <td>
                  <div className="dt-exts">
                    {d.allowed_extensions.map(e => (
                      <span key={e} className="dt-ext-chip">{e}</span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--ink-500)' }}>{d.max_file_size_mb}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={`dt-flag-toggle ${d.is_common_document ? 'dt-flag-on' : 'dt-flag-off'}`}
                    title={d.is_common_document ? 'Click to remove common flag' : 'Click to mark as common'}
                    disabled={toggleCommon.isPending}
                    onClick={() => toggleCommon.mutate({ id: d.id, is_common_document: !d.is_common_document })}
                  >
                    {d.is_common_document ? 'Common' : 'Service'}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`aq-badge ${d.is_active ? 'aq-badge-done' : 'aq-badge-hold'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => setEditingDoc(d)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-400)' }}>
                  No document types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
