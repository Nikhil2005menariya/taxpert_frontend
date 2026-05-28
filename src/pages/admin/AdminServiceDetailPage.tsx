import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type DetailTab = 'docs' | 'timeline' | 'tasks' | 'payment' | 'settings';

const STATUS_OPTIONS = [
  'documents_required', 'documents_received', 'in_progress',
  'under_review', 'invoice_pending', 'completed', 'on_hold', 'cancelled',
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'aq-badge-pending',
  documents_required: 'aq-badge-docs',
  documents_received: 'aq-badge-docs',
  in_progress: 'aq-badge-active',
  under_review: 'aq-badge-review',
  invoice_pending: 'aq-badge-invoice',
  completed: 'aq-badge-done',
  on_hold: 'aq-badge-hold',
  cancelled: 'aq-badge-hold',
  approved: 'aq-badge-done',
  rejected: 'aq-badge-hold',
  uploaded: 'aq-badge-active',
};

const DOC_STATUS_BADGE: Record<string, string> = {
  pending: 'aq-badge-pending',
  uploaded: 'aq-badge-active',
  approved: 'aq-badge-done',
  rejected: 'aq-badge-hold',
};

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'aq-badge-pending',
  paid: 'aq-badge-done',
  failed: 'aq-badge-hold',
  refunded: 'aq-badge-review',
};

const EVENT_ICON: Record<string, string> = {
  status_changed: '🔄',
  document_approved: '✅',
  document_rejected: '❌',
  document_reupload_requested: '🔁',
  optional_document_added: '📎',
  texpert_assigned: '👤',
  payout_recorded: '💰',
  task_added: '📋',
  admin_note: '📝',
  default: '📋',
};

function badge(cls: string, label: string) {
  return <span className={`aq-badge ${cls}`}>{label.replace(/_/g, ' ')}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ReuploadModal({
  docName, docId, serviceId, onClose,
}: { docName: string; docId: string; serviceId: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => apiClient.patch(`/admin/client-services/${serviceId}/docs/${docId}`, { action: 'reupload', note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', serviceId] }); onClose(); },
  });

  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Request Re-upload</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-600)', marginBottom: '1rem' }}>
            Document: <strong>{docName}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Note to client (optional)</label>
            <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Explain what's wrong or what's needed…" />
          </div>
          {mut.isError && <p className="aq-modal-error">{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Sending…' : 'Request Re-upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignTexpertModal({
  serviceId, onClose,
}: { serviceId: string; onClose: () => void }) {
  const [texpertId, setTexpertId] = useState('');
  const qc = useQueryClient();

  const { data: taxperts } = useQuery({
    queryKey: ['taxperts-active'],
    queryFn: async () => (await apiClient.get('/admin/taxperts/active')).data.data ?? [],
  });

  const assign = useMutation({
    mutationFn: () => apiClient.post('/admin/assign', { clientServiceId: serviceId, texpertId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-detail', serviceId] });
      onClose();
    },
  });

  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Assign / Reassign Taxpert</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <div className="form-group">
            <label className="form-label">Select Taxpert</label>
            <select className="form-input" value={texpertId} onChange={e => setTexpertId(e.target.value)}>
              <option value="">-- Choose a Taxpert --</option>
              {(taxperts ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          {assign.isError && <p className="aq-modal-error">{(assign.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!texpertId || assign.isPending} onClick={() => assign.mutate()}>
            {assign.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<DetailTab>('docs');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Modal state
  const [reuploadDoc, setReuploadDoc] = useState<{ id: string; name: string } | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  // Add-doc form
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docName, setDocName] = useState('');

  // Log-note form
  const [showLogNote, setShowLogNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Add-task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');

  // Payout form
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Settings form
  const [settingsStatus, setSettingsStatus] = useState('');
  const [settingsNotes, setSettingsNotes] = useState('');
  const [settingsPinned, setSettingsPinned] = useState('');
  const [settingsBlocked, setSettingsBlocked] = useState(false);
  const [settingsBlockedReason, setSettingsBlockedReason] = useState('');
  const [settingsDirty, setSettingsDirty] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-service-detail', id],
    queryFn: async () => (await apiClient.get(`/admin/client-services/${id}`)).data.data,
    enabled: isAdmin && !!id,
  });

  // Mutations
  const updateService = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/admin/client-services/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setSettingsDirty(false); },
  });

  const docAction = useMutation({
    mutationFn: ({ docId, action }: { docId: string; action: string }) =>
      apiClient.patch(`/admin/client-services/${id}/docs/${docId}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const addDoc = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/docs`, { document_name: docName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-detail', id] });
      setDocName(''); setShowAddDoc(false);
    },
  });

  const logNote = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/events`, { message: noteText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-detail', id] });
      setNoteText(''); setShowLogNote(false);
    },
  });

  const addTask = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/tasks`, {
      title: taskTitle,
      description: taskDesc || undefined,
      due_at: taskDue || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-detail', id] });
      setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowAddTask(false);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiClient.patch(`/admin/client-services/${id}/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) =>
      apiClient.delete(`/admin/client-services/${id}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const addPayout = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/payouts`, {
      amount_rupees: Number(payoutAmount),
      notes: payoutNotes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-detail', id] });
      setPayoutAmount(''); setPayoutNotes(''); setShowAddPayout(false);
    },
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (error || !data) return <div className="db-page-new"><div className="db-alert-error">Service not found.</div></div>;

  const client = data.client as any;
  const service = data.service as any;
  const texpert = data.assigned_texpert as any;
  const docs: any[] = data.client_documents ?? [];
  const events: any[] = data.service_events ?? [];
  const tasks: any[] = data.service_tasks ?? [];
  const payouts: any[] = data.payouts ?? [];

  const uploadedDocs = docs.filter(d => d.file_path || d.file_url).length;
  const pendingDocs = docs.filter(d => !d.file_path && !d.file_url).length;
  const reuploads = docs.filter(d => d.reupload_requested).length;
  const totalPayoutPaise = payouts.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  function initSettings() {
    setSettingsStatus(data.status ?? '');
    setSettingsNotes(data.notes ?? '');
    setSettingsPinned(data.pinned_message ?? '');
    setSettingsBlocked(data.is_blocked ?? false);
    setSettingsBlockedReason(data.blocked_reason ?? '');
    setSettingsDirty(true);
  }

  return (
    <div className="db-page-new">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <div className="aq-back-link" onClick={() => navigate(`/admin/clients/${client?.id}`)}>
            ← {client?.first_name} {client?.last_name}
          </div>
          <h1 className="db-page-title">{service?.name ?? 'Service Detail'}</h1>
          <p className="db-page-sub">
            {data.fiscal_year && <span>{data.fiscal_year} · </span>}
            {badge(STATUS_BADGE[data.status] ?? 'aq-badge-pending', data.status)}
          </p>
        </div>
        <div className="aq-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowAssign(true)}>
            {texpert ? 'Reassign Taxpert' : 'Assign Taxpert'}
          </button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Documents</div>
          <div className="db-stat-card-value">{docs.length}</div>
          <div className="db-stat-card-sub">{uploadedDocs} uploaded · {pendingDocs} pending</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Payment</div>
          <div className="db-stat-card-value" style={{ textTransform: 'capitalize' }}>
            {(data.payment_status ?? 'pending').replace(/_/g, ' ')}
          </div>
          {service?.price && <div className="db-stat-card-sub">₹{(service.price / 100).toLocaleString('en-IN')}</div>}
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Taxpert</div>
          <div className="db-stat-card-value" style={{ fontSize: '1rem' }}>
            {texpert ? `${texpert.first_name} ${texpert.last_name}` : 'Unassigned'}
          </div>
          {texpert && <div className="db-stat-card-sub">{texpert.email}</div>}
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Tasks</div>
          <div className="db-stat-card-value">{tasks.filter((t: any) => t.status !== 'done' && t.status !== 'cancelled').length}</div>
          <div className="db-stat-card-sub">{tasks.filter((t: any) => t.status === 'done').length} done</div>
        </div>
        {reuploads > 0 && (
          <div className="db-stat-card-new" style={{ borderColor: 'var(--gold-400)' }}>
            <div className="db-stat-card-label">Re-upload Pending</div>
            <div className="db-stat-card-value" style={{ color: 'var(--gold-600)' }}>{reuploads}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="aq-tabs">
        {([
          ['docs', `Documents (${docs.length})`],
          ['timeline', `Timeline (${events.length})`],
          ['tasks', `Tasks (${tasks.length})`],
          ['payment', 'Payment'],
          ['settings', 'Settings'],
        ] as [DetailTab, string][]).map(([t, label]) => (
          <button key={t} className={`aq-tab ${tab === t ? 'aq-tab-active' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Documents ── */}
      {tab === 'docs' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAddDoc(v => !v)}>
              + Add Document
            </button>
          </div>

          {showAddDoc && (
            <div className="asd-add-form">
              <input
                className="form-input"
                placeholder="Document name (e.g. Bank Statement Q2)"
                value={docName}
                onChange={e => setDocName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && docName.trim() && addDoc.mutate()}
              />
              {addDoc.isError && <p className="aq-modal-error">{(addDoc.error as any)?.response?.data?.error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddDoc(false); setDocName(''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={!docName.trim() || addDoc.isPending} onClick={() => addDoc.mutate()}>
                  {addDoc.isPending ? 'Adding…' : 'Add Slot'}
                </button>
              </div>
            </div>
          )}

          {docs.length === 0 ? (
            <div className="db-empty-card">
              <p className="db-empty-title">No documents yet</p>
              <p className="db-empty-desc">No document slots have been created for this service.</p>
            </div>
          ) : (
            <div className="asd-doc-list">
              {docs.map((doc: any) => {
                const hasFile = !!(doc.file_path || doc.file_url);
                return (
                  <div key={doc.id} className={`asd-doc-row${doc.reupload_requested ? ' asd-doc-row--reupload' : ''}`}>
                    <div className="asd-doc-info">
                      <div className="asd-doc-name">{doc.document_name}</div>
                      <div className="asd-doc-meta">
                        {badge(DOC_STATUS_BADGE[doc.status] ?? 'aq-badge-pending', doc.status ?? 'pending')}
                        {doc.reupload_requested && <span className="aq-badge aq-badge-docs">Re-upload requested</span>}
                        {doc.uploaded_at && <span className="asd-doc-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                        {!hasFile && <span className="asd-doc-date" style={{ color: 'var(--ink-400)' }}>Not uploaded</span>}
                      </div>
                      {doc.reupload_note && <div className="asd-doc-note">Note: {doc.reupload_note}</div>}
                    </div>
                    <div className="asd-doc-actions">
                      {hasFile && (
                        <a
                          href={doc.signed_url || doc.file_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                        >
                          View
                        </a>
                      )}
                      {hasFile && doc.status !== 'approved' && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={docAction.isPending}
                          onClick={() => docAction.mutate({ docId: doc.id, action: 'approve' })}
                        >
                          Approve
                        </button>
                      )}
                      {hasFile && doc.status !== 'rejected' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={docAction.isPending}
                          onClick={() => docAction.mutate({ docId: doc.id, action: 'reject' })}
                        >
                          Reject
                        </button>
                      )}
                      {hasFile && !doc.reupload_requested && (
                        <button
                          className="btn btn-sm btn-gold"
                          onClick={() => setReuploadDoc({ id: doc.id, name: doc.document_name })}
                        >
                          Re-upload
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {tab === 'timeline' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowLogNote(v => !v)}>
              + Log Note
            </button>
          </div>

          {showLogNote && (
            <div className="asd-add-form">
              <textarea
                className="form-input"
                rows={2}
                placeholder="Internal note (e.g. 'Called client, confirmed documents will arrive by Friday')"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              {logNote.isError && <p className="aq-modal-error">{(logNote.error as any)?.response?.data?.error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowLogNote(false); setNoteText(''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={!noteText.trim() || logNote.isPending} onClick={() => logNote.mutate()}>
                  {logNote.isPending ? 'Logging…' : 'Log Note'}
                </button>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="db-empty-card">
              <p className="db-empty-title">No events yet</p>
              <p className="db-empty-desc">Actions on this service will appear here.</p>
            </div>
          ) : (
            <div className="asd-timeline">
              {events.map((ev: any) => (
                <div key={ev.id} className="asd-event">
                  <div className="asd-event-icon">
                    {EVENT_ICON[ev.event_type] ?? EVENT_ICON.default}
                  </div>
                  <div className="asd-event-body">
                    <div className="asd-event-msg">{ev.message}</div>
                    <div className="asd-event-meta">
                      <span className="asd-event-type">{ev.event_type.replace(/_/g, ' ')}</span>
                      <span className="asd-event-time">{fmtDateTime(ev.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAddTask(v => !v)}>
              + Add Task
            </button>
          </div>

          {showAddTask && (
            <div className="asd-add-form">
              <input
                className="form-input"
                placeholder="Task title *"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Description (optional)"
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
              />
              <input
                className="form-input"
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                title="Due date (optional)"
              />
              {addTask.isError && <p className="aq-modal-error">{(addTask.error as any)?.response?.data?.error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddTask(false); setTaskTitle(''); setTaskDesc(''); setTaskDue(''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate()}>
                  {addTask.isPending ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="db-empty-card">
              <p className="db-empty-title">No tasks</p>
              <p className="db-empty-desc">Add tasks to track work items for this service.</p>
            </div>
          ) : (
            <div className="asd-task-list">
              {tasks.map((task: any) => (
                <div key={task.id} className="asd-task-row">
                  <div className="asd-task-status-dot" data-status={task.status} />
                  <div className="asd-task-info">
                    <div className="asd-task-title" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--ink-400)' : undefined }}>
                      {task.title}
                    </div>
                    {task.description && <div className="asd-task-desc">{task.description}</div>}
                    <div className="asd-task-meta">
                      {badge(task.status === 'done' ? 'aq-badge-done' : task.status === 'in_progress' ? 'aq-badge-active' : 'aq-badge-pending', task.status)}
                      {task.due_at && <span className="asd-doc-date">Due {fmtDate(task.due_at)}</span>}
                      {task.completed_at && <span className="asd-doc-date">Done {fmtDate(task.completed_at)}</span>}
                    </div>
                  </div>
                  <div className="asd-task-actions">
                    {task.status === 'todo' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={updateTask.isPending}
                        onClick={() => updateTask.mutate({ taskId: task.id, status: 'in_progress' })}
                      >
                        Start
                      </button>
                    )}
                    {task.status !== 'done' && task.status !== 'cancelled' && (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={updateTask.isPending}
                        onClick={() => updateTask.mutate({ taskId: task.id, status: 'done' })}
                        title="Mark done"
                      >
                        ✓ Done
                      </button>
                    )}
                    <button
                      className="btn btn-sm asd-task-delete-btn"
                      disabled={deleteTask.isPending}
                      onClick={() => deleteTask.mutate(task.id)}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payment ── */}
      {tab === 'payment' && (
        <div className="asd-section">
          <h3 className="asd-section-title">Payment Information</h3>
          <div className="aq-profile-card" style={{ marginBottom: '1.5rem' }}>
            <div className="aq-profile-row">
              <span className="aq-profile-label">Status</span>
              <span>{badge(PAYMENT_BADGE[data.payment_status] ?? 'aq-badge-pending', data.payment_status ?? 'pending')}</span>
            </div>
            {service?.price && (
              <div className="aq-profile-row">
                <span className="aq-profile-label">Service Price</span>
                <span>₹{(service.price / 100).toLocaleString('en-IN')}</span>
              </div>
            )}
            {data.razorpay_order_id && (
              <div className="aq-profile-row">
                <span className="aq-profile-label">Razorpay Order</span>
                <span className="aq-mono">{data.razorpay_order_id}</span>
              </div>
            )}
            {data.payment_id && (
              <div className="aq-profile-row">
                <span className="aq-profile-label">Payment ID</span>
                <span className="aq-mono">{data.payment_id}</span>
              </div>
            )}
          </div>

          <div className="asd-tab-header" style={{ marginBottom: '0.75rem' }}>
            <h3 className="asd-section-title" style={{ margin: 0 }}>Taxpert Payouts</h3>
            {texpert && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddPayout(v => !v)}>
                + Record Payout
              </button>
            )}
          </div>

          {!texpert && (
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-400)', marginBottom: '1rem' }}>
              Assign a taxpert first to record a payout.
            </p>
          )}

          {showAddPayout && (
            <div className="asd-add-form" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  placeholder="Payment reference, bank transfer ID…"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                />
              </div>
              {addPayout.isError && <p className="aq-modal-error">{(addPayout.error as any)?.response?.data?.error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddPayout(false); setPayoutAmount(''); setPayoutNotes(''); }}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!payoutAmount || Number(payoutAmount) <= 0 || addPayout.isPending}
                  onClick={() => addPayout.mutate()}
                >
                  {addPayout.isPending ? 'Recording…' : 'Record Payout'}
                </button>
              </div>
            </div>
          )}

          {payouts.length === 0 ? (
            <div className="db-empty-card" style={{ padding: '1.5rem' }}>
              <p className="db-empty-desc">No payouts recorded for this service.</p>
            </div>
          ) : (
            <>
              <div className="asd-payout-total">
                Total paid: <strong>₹{(totalPayoutPaise / 100).toLocaleString('en-IN')}</strong>
              </div>
              <div className="aq-table-wrap">
                <table className="aq-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Paid At</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p: any) => (
                      <tr key={p.id}>
                        <td>₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                        <td>{fmtDate(p.paid_at)}</td>
                        <td>{p.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Settings ── */}
      {tab === 'settings' && (
        <div className="asd-section">
          <h3 className="asd-section-title">Service Controls</h3>
          {!settingsDirty ? (
            <div className="aq-profile-card" style={{ marginBottom: '1.5rem' }}>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Status</span>
                <span>{badge(STATUS_BADGE[data.status] ?? 'aq-badge-pending', data.status)}</span>
              </div>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Fiscal Year</span>
                <span>{data.fiscal_year ?? '—'}</span>
              </div>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Notes</span>
                <span>{data.notes ?? '—'}</span>
              </div>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Pinned Message</span>
                <span>{data.pinned_message ?? '—'}</span>
              </div>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Blocked</span>
                <span className={`aq-badge ${data.is_blocked ? 'aq-badge-hold' : 'aq-badge-done'}`}>
                  {data.is_blocked ? 'Yes' : 'No'}
                </span>
              </div>
              {data.blocked_reason && (
                <div className="aq-profile-row">
                  <span className="aq-profile-label">Block Reason</span>
                  <span>{data.blocked_reason}</span>
                </div>
              )}
              <div className="aq-profile-row">
                <span className="aq-profile-label">Created</span>
                <span>{fmtDate(data.created_at)}</span>
              </div>
              <div className="aq-profile-row">
                <span className="aq-profile-label">Last Updated</span>
                <span>{fmtDate(data.updated_at)}</span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={initSettings}>Edit</button>
              </div>
            </div>
          ) : (
            <div className="aq-notify-card" style={{ maxWidth: '560px' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={settingsStatus} onChange={e => setSettingsStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Internal Notes</label>
                <textarea className="form-input" rows={3} value={settingsNotes} onChange={e => setSettingsNotes(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pinned Message <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>(shown to client)</span></label>
                <input className="form-input" value={settingsPinned} onChange={e => setSettingsPinned(e.target.value)}
                  placeholder="e.g. Awaiting GST portal access from client" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="svc-blocked" checked={settingsBlocked} onChange={e => setSettingsBlocked(e.target.checked)} />
                <label htmlFor="svc-blocked" className="form-label" style={{ marginBottom: 0 }}>Mark as Blocked</label>
              </div>
              {settingsBlocked && (
                <div className="form-group">
                  <label className="form-label">Block Reason</label>
                  <input className="form-input" value={settingsBlockedReason} onChange={e => setSettingsBlockedReason(e.target.value)}
                    placeholder="Why is this service blocked?" />
                </div>
              )}
              {updateService.isError && (
                <p className="aq-modal-error">{(updateService.error as any)?.response?.data?.error}</p>
              )}
              {updateService.isSuccess && (
                <p style={{ color: 'var(--green-600)', fontSize: '0.875rem' }}>Saved successfully.</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setSettingsDirty(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={updateService.isPending}
                  onClick={() => updateService.mutate({
                    status: settingsStatus,
                    notes: settingsNotes,
                    pinned_message: settingsPinned,
                    is_blocked: settingsBlocked,
                    blocked_reason: settingsBlockedReason,
                  })}
                >
                  {updateService.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          <h3 className="asd-section-title" style={{ marginTop: '2rem' }}>Client Information</h3>
          <div className="aq-profile-card">
            <div className="aq-profile-row">
              <span className="aq-profile-label">Name</span>
              <span>{client?.first_name} {client?.last_name}</span>
            </div>
            <div className="aq-profile-row">
              <span className="aq-profile-label">Email</span>
              <span>{client?.email}</span>
            </div>
            <div className="aq-profile-row">
              <span className="aq-profile-label">Mobile</span>
              <span>{client?.mobile ?? '—'}</span>
            </div>
            <div className="aq-profile-row">
              <span className="aq-profile-label">PAN</span>
              <span className="aq-mono">{client?.pan ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {reuploadDoc && (
        <ReuploadModal
          docId={reuploadDoc.id}
          docName={reuploadDoc.name}
          serviceId={id!}
          onClose={() => setReuploadDoc(null)}
        />
      )}
      {showAssign && (
        <AssignTexpertModal serviceId={id!} onClose={() => setShowAssign(false)} />
      )}
    </div>
  );
}
