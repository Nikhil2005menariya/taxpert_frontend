import { useState, useEffect, useRef, useCallback } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees } from '../../shared/finance-utils';

// ── Constants ─────────────────────────────────────────────────

type Tab = 'docs' | 'timeline' | 'tasks' | 'notes' | 'workflow';

// Workflow pipeline order — used for the visual progress bar
const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: 'documents_required', label: 'Docs Required' },
  { key: 'documents_received', label: 'Docs Received' },
  { key: 'in_progress',        label: 'In Progress' },
  { key: 'under_review',       label: 'Under Review' },
  { key: 'invoice_pending',    label: 'Invoice Pending' },
  { key: 'completed',          label: 'Completed' },
];

const STATUS_BADGE: Record<string, string> = {
  pending:             'aq-badge-pending',
  documents_required:  'aq-badge-docs',
  documents_received:  'aq-badge-docs',
  in_progress:         'aq-badge-active',
  under_review:        'aq-badge-review',
  invoice_pending:     'aq-badge-invoice',
  completed:           'aq-badge-done',
  on_hold:             'aq-badge-hold',
  cancelled:           'aq-badge-hold',
};

const DOC_STATUS_BADGE: Record<string, string> = {
  pending:  'aq-badge-pending',
  uploaded: 'aq-badge-active',
  approved: 'aq-badge-done',
  rejected: 'aq-badge-hold',
};

const EVENT_ICON: Record<string, string> = {
  status_changed:                '🔄',
  document_approved:             '✅',
  document_rejected:             '❌',
  document_reupload_requested:   '🔁',
  optional_document_added:       '📎',
  texpert_assigned:              '👤',
  task_added:                    '📋',
  texpert_note:                  '📝',
  pinned_updated:                '📌',
  payout_recorded:               '💰',
  payment_captured:              '💳',
  default:                       '📋',
};

// ── Helpers ───────────────────────────────────────────────────

function badge(cls: string, label: string) {
  return <span className={`aq-badge ${cls}`}>{label.replace(/_/g, ' ')}</span>;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Reupload Modal ────────────────────────────────────────────

function ReuploadModal({ serviceId, docId, docName, onClose }: any) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const mut = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${serviceId}/reupload`, { documentId: docId, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Request Re-upload</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-600)' }}>
            Document: <strong>{docName}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Note to client (optional)</label>
            <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. The scan is blurry, please re-upload a clearer copy" />
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

// ── Reject Modal (final, with reason) ─────────────────────────

function RejectModal({ serviceId, docId, docName, onClose }: any) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${serviceId}/docs/${docId}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Reject Document (Final)</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <div className="tx-warn-box">
            <strong>This is a final rejection.</strong> The client cannot re-upload this slot. Use "Request Re-upload" if you want them to try again.
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-600)' }}>
            Document: <strong>{docName}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Reason for rejection *</label>
            <textarea className="form-input" rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. This document is not applicable to your filing — please ignore" required />
          </div>
          {mut.isError && <p className="aq-modal-error">{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary tx-danger-btn" disabled={mut.isPending || !reason.trim()} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Rejecting…' : 'Reject Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status change modal ───────────────────────────────────────

function StatusModal({ serviceId, targetStatus, onClose }: any) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => apiClient.patch(`/texpert/services/${serviceId}/status`, { status: targetStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  const label = targetStatus.replace(/_/g, ' ');
  return (
    <div className="aq-modal-overlay" onClick={onClose}>
      <div className="aq-modal" onClick={e => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h3 className="aq-modal-title">Change status</h3>
          <button className="aq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aq-modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-700)' }}>
            Move this service to <strong style={{ textTransform: 'capitalize' }}>{label}</strong>?
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--ink-400)' }}>The client will be notified by email.</p>
          {mut.isError && <p className="aq-modal-error">{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="aq-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Updating…' : `Move to ${label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workflow pipeline visualization ───────────────────────────

function WorkflowPipeline({ status }: { status: string }) {
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  const isOnHold = status === 'on_hold';

  return (
    <div className="tx-pipeline">
      {WORKFLOW_STEPS.map((step, i) => {
        const reached = !isOnHold && currentIdx >= i;
        const current = !isOnHold && currentIdx === i;
        return (
          <div key={step.key} className={`tx-pipeline-step ${reached ? 'tx-step-reached' : ''} ${current ? 'tx-step-current' : ''}`}>
            <div className="tx-step-dot">{reached ? '✓' : i + 1}</div>
            <div className="tx-step-label">{step.label}</div>
            {i < WORKFLOW_STEPS.length - 1 && <div className="tx-step-bar" />}
          </div>
        );
      })}
      {isOnHold && <div className="tx-pipeline-onhold">⏸ ON HOLD</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function TexpertServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('docs');

  const isTexpert = profile?.role === 'expert' || profile?.role === 'ca';

  // Modal state
  const [reuploadDoc,  setReuploadDoc]  = useState<{ id: string; name: string } | null>(null);
  const [rejectDoc,    setRejectDoc]    = useState<{ id: string; name: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<string | null>(null);

  // Inline form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docName, setDocName] = useState('');

  // Output docs state
  const [showOutputUpload, setShowOutputUpload] = useState(false);
  const [outputDocName,    setOutputDocName]    = useState('');
  const [outputDocDesc,    setOutputDocDesc]    = useState('');
  const [outputUploading,  setOutputUploading]  = useState(false);
  const [outputUploadErr,  setOutputUploadErr]  = useState<string | null>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [showLogNote, setShowLogNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Notes tab state — debounced auto-save
  const [scratchNotes, setScratchNotes] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState('');
  const [pinnedSaved, setPinnedSaved] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tx-service-detail', id],
    queryFn: async () => (await apiClient.get(`/texpert/services/${id}`)).data.data,
    enabled:         isTexpert && !!id,
    refetchInterval: 20_000,         // poll every 20s — picks up client deletion requests
    refetchOnWindowFocus: true,
  });

  // Sync state with fetched data
  useEffect(() => {
    if (data) {
      setScratchNotes(data.notes ?? '');
      setPinnedMsg(data.pinned_message ?? '');
    }
  }, [data?.notes, data?.pinned_message]);

  // Mutations
  const approve = useMutation({
    mutationFn: (docId: string) => apiClient.post(`/texpert/services/${id}/docs/${docId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });

  const addDoc = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${id}/doc-slots`, { documentName: docName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx-service-detail', id] });
      setDocName(''); setShowAddDoc(false);
    },
  });

  const addTask = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${id}/tasks`, {
      title: taskTitle, description: taskDesc || undefined, due_at: taskDue || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx-service-detail', id] });
      setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowAddTask(false);
    },
  });

  const updTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiClient.patch(`/texpert/services/${id}/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });

  const delTask = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/texpert/services/${id}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });

  // Deletion request: texpert can approve (cancels service) or reject (keeps it)
  const approveDeletion = useMutation({
    mutationFn: () => apiClient.post(`/client-services/${id}/approve-deletion`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });
  const rejectDeletion = useMutation({
    mutationFn: () => apiClient.post(`/client-services/${id}/reject-deletion`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });


  const logNote = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${id}/notes`, { message: noteText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx-service-detail', id] });
      setNoteText(''); setShowLogNote(false);
    },
  });

  const savePinned = useMutation({
    mutationFn: () => apiClient.patch(`/texpert/services/${id}/pinned`, { pinned_message: pinnedMsg }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx-service-detail', id] });
      setPinnedSaved(true);
      setTimeout(() => setPinnedSaved(false), 2000);
    },
  });

  const saveNotes = useMutation({
    mutationFn: (notes: string) => apiClient.patch(`/texpert/services/${id}/notes-field`, { notes }),
    onSuccess: () => {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    },
  });

  // Debounced auto-save for scratchpad notes
  function onNotesChange(val: string) {
    setScratchNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes.mutate(val), 800);
  }

  // Output doc upload handler
  const handleOutputUpload = useCallback(async (file: File) => {
    if (!outputDocName.trim()) { setOutputUploadErr('Enter a document name first'); return; }
    setOutputUploading(true); setOutputUploadErr(null);
    const form = new FormData();
    form.append('file', file);
    form.append('document_name', outputDocName.trim());
    if (outputDocDesc.trim()) form.append('description', outputDocDesc.trim());
    try {
      await apiClient.post(`/texpert/services/${id}/output-docs`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['tx-service-detail', id] });
      setOutputDocName(''); setOutputDocDesc(''); setShowOutputUpload(false);
    } catch (e: any) {
      setOutputUploadErr(e.response?.data?.error ?? 'Upload failed');
    } finally {
      setOutputUploading(false);
      if (outputFileRef.current) outputFileRef.current.value = '';
    }
  }, [outputDocName, outputDocDesc, id, qc]);

  const deleteOutputDoc = useMutation({
    mutationFn: (docId: string) => apiClient.delete(`/texpert/services/${id}/output-docs/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isTexpert) return <Navigate to="/dashboard" replace />;
  if (error || !data) return <div className="db-page-new"><div className="db-alert-error">Service not found or not assigned to you.</div></div>;

  const client    = data.client as any;
  const service   = data.service as any;
  const docs        = (data.client_documents ?? []) as any[];
  const outputDocs  = (data.output_documents ?? []) as any[];
  const events      = (data.service_events ?? []) as any[];
  const tasks       = (data.service_tasks ?? []) as any[];
  const payouts     = (data.payouts ?? []) as any[];
  const totalPaid = payouts.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

  const uploadedDocs = docs.filter(d => d.file_path || d.file_url).length;
  const pendingDocs  = docs.filter(d => !d.file_path && !d.file_url).length;
  const approvedDocs = docs.filter(d => d.status === 'approved').length;
  const reuploads    = docs.filter(d => d.reupload_requested).length;
  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  // Next status option for "advance" button
  const currentIdx  = WORKFLOW_STEPS.findIndex(s => s.key === data.status);
  const nextStep    = currentIdx >= 0 && currentIdx < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentIdx + 1] : null;
  const isCancelled = data.status === 'cancelled';

  return (
    <div className="db-page-new">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="db-page-header">
        <div>
          <div className="aq-back-link" onClick={() => navigate('/texpert/services')}>← My Services</div>
          <h1 className="db-page-title">{service?.name ?? 'Service'}</h1>
          <p className="db-page-sub">
            {data.fiscal_year && <span>{data.fiscal_year} · </span>}
            {badge(STATUS_BADGE[data.status] ?? 'aq-badge-pending', data.status)}
          </p>
        </div>
        {!isCancelled && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {nextStep && data.status !== 'on_hold' && (
              <button className="btn btn-primary" onClick={() => setStatusTarget(nextStep.key)}>
                Advance → {nextStep.label}
              </button>
            )}
            {data.status !== 'on_hold' && data.status !== 'completed' && (
              <button className="btn btn-secondary" onClick={() => setStatusTarget('on_hold')}>
                Mark On Hold
              </button>
            )}
            {data.status === 'on_hold' && (
              <button className="btn btn-primary" onClick={() => setStatusTarget('in_progress')}>
                Resume
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky Client Bar ──────────────────────────────── */}
      <div className="tx-client-bar">
        <div className="tx-client-name">
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-400)', letterSpacing: '0.06em' }}>CLIENT</span>
          <strong>{client?.first_name} {client?.last_name}</strong>
        </div>
        <div className="tx-client-meta">
          {client?.pan && <span><span className="tx-meta-label">PAN</span> <span className="aq-mono">{client.pan}</span></span>}
          {client?.mobile && <span><span className="tx-meta-label">Mobile</span> {client.mobile}</span>}
          {client?.email && <span><span className="tx-meta-label">Email</span> {client.email}</span>}
        </div>
        <div className="tx-client-payment">
          <span className="tx-meta-label">Payment</span>
          <span className={`aq-badge ${data.payment_status === 'paid' ? 'aq-badge-done' : 'aq-badge-pending'}`}>
            {data.payment_status ?? 'pending'}
          </span>
          {service?.price && <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--ink-500)' }}>{formatRupees(service.price)}</span>}
        </div>
      </div>

      {/* ── Cancelled notice ───────────────────────────────── */}
      {isCancelled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderLeft: '4px solid #94a3b8', borderRadius: '10px',
          padding: '0.9rem 1.1rem', color: '#475569', fontSize: '0.875rem', fontWeight: 500,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          This service has been cancelled. All actions are frozen — the record is read-only.
        </div>
      )}

      {/* ── Stats Strip ────────────────────────────────────── */}
      <div className="aq-stats-row">
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Documents</div>
          <div className="db-stat-card-value">{docs.length}</div>
          <div className="db-stat-card-sub">{approvedDocs} approved · {pendingDocs} pending</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Open Tasks</div>
          <div className="db-stat-card-value">{openTasks}</div>
          <div className="db-stat-card-sub">{tasks.filter(t => t.status === 'done').length} done</div>
        </div>
        <div className="db-stat-card-new">
          <div className="db-stat-card-label">Your Earnings</div>
          <div className="db-stat-card-value">{formatRupees(totalPaid)}</div>
          <div className="db-stat-card-sub">{payouts.length} payout{payouts.length !== 1 ? 's' : ''}</div>
        </div>
        {reuploads > 0 && (
          <div className="db-stat-card-new" style={{ borderColor: 'var(--gold-400)' }}>
            <div className="db-stat-card-label">Re-upload Pending</div>
            <div className="db-stat-card-value" style={{ color: 'var(--gold-600)' }}>{reuploads}</div>
          </div>
        )}
      </div>

      {/* ── Pinned message banner (if set) ─────────────────── */}
      {data.pinned_message && (
        <div className="tx-pinned-banner">
          <span style={{ fontSize: '1.2rem' }}>📌</span>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pinned for client</div>
            <div style={{ fontSize: '0.875rem', color: '#78350f', fontWeight: 500 }}>{data.pinned_message}</div>
          </div>
        </div>
      )}

      {/* ── Deletion request alert — always visible, above tabs ─ */}
      {data.deletion_requested && (
        <div className="tx-deletion-banner">
          <div className="tx-deletion-banner-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div className="tx-deletion-title">Client has requested service cancellation</div>
              <div className="tx-deletion-sub">
                Requested on {data.deletion_requested_at
                  ? new Date(data.deletion_requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'unknown date'}.
                Approving will set the status to <strong>cancelled</strong>.
              </div>
            </div>
          </div>
          <div className="tx-deletion-actions">
            <button
              className="tx-deletion-approve-btn"
              onClick={() => approveDeletion.mutate()}
              disabled={approveDeletion.isPending || rejectDeletion.isPending}
            >
              {approveDeletion.isPending ? 'Processing…' : 'Approve cancellation'}
            </button>
            <button
              className="tx-deletion-reject-btn"
              onClick={() => rejectDeletion.mutate()}
              disabled={approveDeletion.isPending || rejectDeletion.isPending}
            >
              {rejectDeletion.isPending ? 'Processing…' : 'Reject'}
            </button>
          </div>
          {(approveDeletion.isError || rejectDeletion.isError) && (
            <div className="tx-deletion-error">
              {((approveDeletion.error || rejectDeletion.error) as any)?.response?.data?.error ?? 'Something went wrong'}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="aq-tabs">
        {([
          ['docs',     `Documents (${docs.length})`],
          ['timeline', `Timeline (${events.length})`],
          ['tasks',    `Tasks (${tasks.length})`],
          ['notes',    'Notes'],
          ['workflow', 'Workflow'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={`aq-tab ${tab === t ? 'aq-tab-active' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Documents Tab ──────────────────────────────────── */}
      {tab === 'docs' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{uploadedDocs}/{docs.length} uploaded</span>
            {!isCancelled && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddDoc(v => !v)}>+ Add Document</button>
            )}
          </div>

          {showAddDoc && (
            <div className="asd-add-form">
              <input className="form-input" placeholder="Document name (e.g. Bank Statement Q4)"
                value={docName} onChange={e => setDocName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && docName.trim() && addDoc.mutate()} />
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
              <p className="db-empty-title">No documents</p>
              <p className="db-empty-desc">No document slots have been created for this service.</p>
            </div>
          ) : (
            <div className="asd-doc-list">
              {docs.map(doc => {
                const hasFile = !!(doc.file_path || doc.file_url);
                const url     = doc.signed_url || doc.file_url;
                return (
                  <div key={doc.id} className={`asd-doc-row${doc.reupload_requested ? ' asd-doc-row--reupload' : ''}`}>
                    <div className="asd-doc-info">
                      <div className="asd-doc-name">{doc.document_name}</div>
                      <div className="asd-doc-meta">
                        {badge(DOC_STATUS_BADGE[doc.status] ?? 'aq-badge-pending', doc.status ?? 'pending')}
                        {doc.reupload_requested && <span className="aq-badge aq-badge-docs">Re-upload requested</span>}
                        {doc.uploaded_at && <span className="asd-doc-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                        {!hasFile && <span className="asd-doc-date" style={{ color: 'var(--ink-400)' }}>Not uploaded yet</span>}
                      </div>
                      {doc.reupload_note && <div className="asd-doc-note">Note to client: {doc.reupload_note}</div>}
                    </div>
                    <div className="asd-doc-actions">
                      {hasFile && url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">View</a>
                      )}
                      {!isCancelled && hasFile && doc.status !== 'approved' && (
                        <button className="btn btn-sm btn-primary" disabled={approve.isPending}
                          onClick={() => approve.mutate(doc.id)}>
                          Approve
                        </button>
                      )}
                      {!isCancelled && hasFile && doc.status !== 'rejected' && !doc.reupload_requested && (
                        <button className="btn btn-sm btn-gold"
                          onClick={() => setReuploadDoc({ id: doc.id, name: doc.document_name })}>
                          Re-upload
                        </button>
                      )}
                      {!isCancelled && hasFile && doc.status !== 'rejected' && (
                        <button className="btn btn-sm tx-danger-btn"
                          onClick={() => setRejectDoc({ id: doc.id, name: doc.document_name })}>
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Output Documents Section ─────────────────────── */}
          <div style={{ marginTop: '1.75rem', borderTop: '1.5px solid var(--line, #e2e8f0)', paddingTop: '1.25rem' }}>
            <div className="asd-tab-header">
              <div>
                <span className="asd-tab-header-count" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ink-800)' }}>
                  Output Documents
                </span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--ink-400)' }}>
                  Documents you generate for this client
                </span>
              </div>
              {!isCancelled && (
                <button className="btn btn-sm btn-secondary" onClick={() => setShowOutputUpload(v => !v)}>
                  + Upload Output Doc
                </button>
              )}
            </div>

            {showOutputUpload && (
              <div className="asd-add-form">
                <input
                  className="form-input"
                  placeholder="Document name (e.g. ITR Filing Receipt, GST Certificate)"
                  value={outputDocName}
                  onChange={e => { setOutputDocName(e.target.value); setOutputUploadErr(null); }}
                />
                <input
                  className="form-input"
                  placeholder="Description (optional)"
                  value={outputDocDesc}
                  onChange={e => setOutputDocDesc(e.target.value)}
                />
                {outputUploadErr && <p className="aq-modal-error">{outputUploadErr}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!outputDocName.trim() || outputUploading}
                    onClick={() => outputFileRef.current?.click()}
                  >
                    {outputUploading ? 'Uploading…' : 'Choose file & upload'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setShowOutputUpload(false); setOutputDocName(''); setOutputDocDesc(''); setOutputUploadErr(null); }}>
                    Cancel
                  </button>
                </div>
                <input
                  ref={outputFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleOutputUpload(f); }}
                />
              </div>
            )}

            {outputDocs.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--ink-400)', fontSize: '0.85rem', textAlign: 'center', background: 'var(--surface-50, #f9fafb)', borderRadius: '0.5rem' }}>
                No output documents uploaded yet. Upload processed documents, certificates, or filings here.
              </div>
            ) : (
              <div className="asd-doc-list">
                {outputDocs.map((doc: any) => (
                  <div key={doc.id} className="asd-doc-row" style={{ borderLeft: '3px solid var(--green-400, #4ade80)' }}>
                    <div className="asd-doc-info">
                      <div className="asd-doc-name">{doc.document_name}</div>
                      <div className="asd-doc-meta">
                        <span className="aq-badge aq-badge-done">Output</span>
                        {doc.description && <span className="asd-doc-date">{doc.description}</span>}
                        {doc.uploaded_at && <span className="asd-doc-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                      </div>
                    </div>
                    <div className="asd-doc-actions">
                      {doc.signed_url && (
                        <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">View</a>
                      )}
                      <button
                        className="btn btn-sm tx-danger-btn"
                        disabled={deleteOutputDoc.isPending}
                        onClick={() => { if (window.confirm(`Delete "${doc.document_name}"?`)) deleteOutputDoc.mutate(doc.id); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Timeline Tab ───────────────────────────────────── */}
      {tab === 'timeline' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
            {!isCancelled && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowLogNote(v => !v)}>+ Log Internal Note</button>
            )}
          </div>

          {showLogNote && (
            <div className="asd-add-form">
              <textarea className="form-input" rows={2} placeholder="Internal note (only visible to staff)"
                value={noteText} onChange={e => setNoteText(e.target.value)} />
              {logNote.isError && <p className="aq-modal-error">{(logNote.error as any)?.response?.data?.error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowLogNote(false); setNoteText(''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={!noteText.trim() || logNote.isPending} onClick={() => logNote.mutate()}>
                  {logNote.isPending ? 'Saving…' : 'Save Note'}
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
              {events.map(ev => (
                <div key={ev.id} className="asd-event">
                  <div className="asd-event-icon">{EVENT_ICON[ev.event_type] ?? EVENT_ICON.default}</div>
                  <div className="asd-event-body">
                    <div className="asd-event-msg">{ev.message}</div>
                    <div className="asd-event-meta">
                      <span className="asd-event-type">{ev.event_type.replace(/_/g, ' ')}</span>
                      <span className="asd-event-time">{fmtDateTime(ev.created_at)}</span>
                      {ev.metadata?.is_internal && <span className="aq-badge aq-badge-pending" style={{ fontSize: '0.65rem' }}>internal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tasks Tab ──────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div>
          <div className="asd-tab-header">
            <span className="asd-tab-header-count">{openTasks} open · {tasks.filter(t => t.status === 'done').length} done</span>
            {!isCancelled && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddTask(v => !v)}>+ Add Task</button>
            )}
          </div>

          {showAddTask && (
            <div className="asd-add-form">
              <input className="form-input" placeholder="Task title *"
                value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <input className="form-input" placeholder="Description (optional)"
                value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
              <input className="form-input" type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} title="Due date" />
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
              <p className="db-empty-title">No tasks yet</p>
              <p className="db-empty-desc">Track your internal workflow here. Tasks are private to staff.</p>
            </div>
          ) : (
            <div className="asd-task-list">
              {tasks.map(task => (
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
                  {!isCancelled && (
                    <div className="asd-task-actions">
                      {task.status === 'todo' && (
                        <button className="btn btn-sm btn-secondary" disabled={updTask.isPending}
                          onClick={() => updTask.mutate({ taskId: task.id, status: 'in_progress' })}>
                          Start
                        </button>
                      )}
                      {task.status !== 'done' && task.status !== 'cancelled' && (
                        <button className="btn btn-sm btn-primary" disabled={updTask.isPending}
                          onClick={() => updTask.mutate({ taskId: task.id, status: 'done' })}>
                          ✓ Done
                        </button>
                      )}
                      <button className="btn btn-sm asd-task-delete-btn" disabled={delTask.isPending}
                        onClick={() => delTask.mutate(task.id)} title="Delete task">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notes Tab ──────────────────────────────────────── */}
      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pinned message — visible to client */}
          <div className="tx-notes-card">
            <div className="tx-notes-card-head">
              <span>📌 Pinned Message <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>· visible to client</span></span>
              {pinnedSaved && <span style={{ fontSize: '0.78rem', color: 'var(--green-600)' }}>✓ Saved</span>}
            </div>
            <input className="form-input" value={pinnedMsg}
              onChange={e => !isCancelled && setPinnedMsg(e.target.value)}
              readOnly={isCancelled}
              placeholder="e.g. Please upload bank statements for Q4. We need them by Friday."
              maxLength={200} style={isCancelled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} />
            {!isCancelled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-400)' }}>{pinnedMsg.length}/200 characters</span>
                <button className="btn btn-primary btn-sm" disabled={savePinned.isPending || pinnedMsg === (data.pinned_message ?? '')}
                  onClick={() => savePinned.mutate()}>
                  {savePinned.isPending ? 'Saving…' : 'Save Pinned Message'}
                </button>
              </div>
            )}
          </div>

          {/* Internal scratchpad — private */}
          <div className="tx-notes-card">
            <div className="tx-notes-card-head">
              <span>📝 Internal Notes <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>· private to staff</span></span>
              {notesSaved && <span style={{ fontSize: '0.78rem', color: 'var(--green-600)' }}>✓ Auto-saved</span>}
              {saveNotes.isPending && <span style={{ fontSize: '0.78rem', color: 'var(--ink-400)' }}>Saving…</span>}
            </div>
            <textarea className="form-input" rows={10} value={scratchNotes}
              onChange={e => !isCancelled && onNotesChange(e.target.value)}
              readOnly={isCancelled}
              placeholder="Your private notes. Auto-saves as you type."
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, ...(isCancelled ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} />
          </div>
        </div>
      )}

      {/* ── Workflow Tab ───────────────────────────────────── */}
      {tab === 'workflow' && (
        <div className="asd-section">
          <h3 className="asd-section-title">Current Status</h3>
          <WorkflowPipeline status={data.status} />

          {!isCancelled && (
            <>
              <h3 className="asd-section-title" style={{ marginTop: '2rem' }}>Manual Status Change</h3>
              <div className="tx-status-grid">
                {WORKFLOW_STEPS.map(s => (
                  <button key={s.key}
                    className={`tx-status-btn ${data.status === s.key ? 'tx-status-current' : ''}`}
                    disabled={data.status === s.key}
                    onClick={() => setStatusTarget(s.key)}>
                    {s.label}
                    {data.status === s.key && <span style={{ marginLeft: 6, fontSize: '0.7rem' }}>· Current</span>}
                  </button>
                ))}
                <button className="tx-status-btn tx-status-hold"
                  disabled={data.status === 'on_hold'}
                  onClick={() => setStatusTarget('on_hold')}>
                  On Hold
                  {data.status === 'on_hold' && <span style={{ marginLeft: 6, fontSize: '0.7rem' }}>· Current</span>}
                </button>
              </div>
            </>
          )}

          <h3 className="asd-section-title" style={{ marginTop: '2rem' }}>Service Metadata</h3>
          <div className="aq-profile-card">
            <div className="aq-profile-row"><span className="aq-profile-label">Created</span><span>{fmtDateTime(data.created_at)}</span></div>
            <div className="aq-profile-row"><span className="aq-profile-label">Last Updated</span><span>{fmtDateTime(data.updated_at)}</span></div>
            {data.assigned_texpert_at && (
              <div className="aq-profile-row"><span className="aq-profile-label">Assigned to You</span><span>{fmtDateTime(data.assigned_texpert_at)}</span></div>
            )}
            {data.payment_id && (
              <div className="aq-profile-row"><span className="aq-profile-label">Payment ID</span><span className="aq-mono">{data.payment_id}</span></div>
            )}
            {data.is_blocked && (
              <div className="aq-profile-row">
                <span className="aq-profile-label">Blocked</span>
                <span className="aq-badge aq-badge-hold">Yes{data.blocked_reason ? ` — ${data.blocked_reason}` : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      {reuploadDoc && (
        <ReuploadModal serviceId={id} docId={reuploadDoc.id} docName={reuploadDoc.name} onClose={() => setReuploadDoc(null)} />
      )}
      {rejectDoc && (
        <RejectModal serviceId={id} docId={rejectDoc.id} docName={rejectDoc.name} onClose={() => setRejectDoc(null)} />
      )}
      {statusTarget && (
        <StatusModal serviceId={id} targetStatus={statusTarget} onClose={() => setStatusTarget(null)} />
      )}

    </div>
  );
}
