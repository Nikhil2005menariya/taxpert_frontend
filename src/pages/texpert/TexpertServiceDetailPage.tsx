import { useState, useEffect, useRef, useCallback } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees } from '../../shared/finance-utils';

// ── Constants ─────────────────────────────────────────────────

type Tab = 'docs' | 'timeline' | 'tasks' | 'notes' | 'workflow';

const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: 'documents_required', label: 'Docs Required' },
  { key: 'documents_received', label: 'Docs Received' },
  { key: 'in_progress',        label: 'In Progress' },
  { key: 'under_review',       label: 'Under Review' },
  { key: 'payment',            label: 'Payment' },
  { key: 'completed',          label: 'Completed' },
];

const STATUS_TONE: Record<string, string> = {
  pending: 'adm-badge--neutral', documents_required: 'adm-badge--amber', documents_received: 'adm-badge--green',
  in_progress: 'adm-badge--blue', under_review: 'adm-badge--accent', payment: 'adm-badge--amber',
  completed: 'adm-badge--green', on_hold: 'adm-badge--neutral', cancelled: 'adm-badge--red',
  approved: 'adm-badge--green', rejected: 'adm-badge--red', uploaded: 'adm-badge--blue', paid: 'adm-badge--green',
  todo: 'adm-badge--neutral', done: 'adm-badge--green',
};

/* ── Icons ────────────────────────────────────────────────────── */
const Icon = {
  back:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  x:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  chevronD: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  check:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  alert:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>,
  ext:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></svg>,
  docs:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  timeline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  tasks:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  notes:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  flow:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 6h6a4 4 0 0 1 4 4v.5M7 18h6a4 4 0 0 0 4-4" /></svg>,
  pin:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>,
  pencil:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
};

function EventIcon({ type }: { type: string }) {
  let path: React.ReactNode = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>;
  switch (type) {
    case 'status_changed':              path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></>; break;
    case 'document_approved':           path = <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>; break;
    case 'document_rejected':           path = <><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></>; break;
    case 'document_reupload_requested': path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M12 8v5l3 2" /></>; break;
    case 'optional_document_added':     path = <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></>; break;
    case 'texpert_assigned':            path = <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>; break;
    case 'task_added':                  path = <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>; break;
    case 'texpert_note':                path = <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>; break;
    case 'pinned_updated':              path = <><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></>; break;
    case 'payout_recorded':
    case 'payment_captured':
    case 'payment_received':            path = <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>; break;
  }
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
}

// ── Helpers ───────────────────────────────────────────────────

function badge(status: string) {
  return <span className={`adm-badge ${STATUS_TONE[status] ?? 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{(status ?? 'pending').replace(/_/g, ' ')}</span>;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Modals ────────────────────────────────────────────────────

function ReuploadModal({ serviceId, docId, docName, onClose }: any) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const mut = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${serviceId}/reupload`, { documentId: docId, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Document</p>
            <h3 className="adm-modal-title">Request Re-upload</h3>
            <p className="adm-modal-sub">{docName}</p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Note to client <span className="adm-label-opt">(optional)</span></label>
            <textarea className="adm-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. The scan is blurry, please re-upload a clearer copy" />
          </div>
          {mut.isError && <p className="adm-modal-err">{Icon.alert}{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Sending…' : 'Request Re-upload'}</button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ serviceId, docId, docName, onClose }: any) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${serviceId}/docs/${docId}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Document</p>
            <h3 className="adm-modal-title">Reject Document (Final)</h3>
            <p className="adm-modal-sub">{docName}</p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-banner adm-banner--err" style={{ margin: 0 }}>{Icon.alert}<span><strong>This is a final rejection.</strong> The client cannot re-upload this slot — use “Request Re-upload” to let them try again.</span></div>
          <div className="adm-field">
            <label className="adm-label">Reason for rejection *</label>
            <textarea className="adm-textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. This document is not applicable to your filing — please ignore" required />
          </div>
          {mut.isError && <p className="adm-modal-err">{Icon.alert}{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--danger" disabled={mut.isPending || !reason.trim()} onClick={() => mut.mutate()}>{mut.isPending ? 'Rejecting…' : 'Reject Document'}</button>
        </div>
      </div>
    </div>
  );
}

function StatusModal({ serviceId, targetStatus, onClose }: any) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => apiClient.patch(`/texpert/services/${serviceId}/status`, { status: targetStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', serviceId] }); onClose(); },
  });
  const label = targetStatus.replace(/_/g, ' ');
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Workflow</p>
            <h3 className="adm-modal-title">Change status</h3>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--lp-ink)', margin: 0 }}>Move this service to <strong style={{ textTransform: 'capitalize' }}>{label}</strong>?</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--lp-ink-subtle)', margin: 0 }}>The client will be notified by email.</p>
          {mut.isError && <p className="adm-modal-err">{Icon.alert}{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={mut.isPending} onClick={() => mut.mutate()} style={{ textTransform: 'capitalize' }}>{mut.isPending ? 'Updating…' : `Move to ${label}`}</button>
        </div>
      </div>
    </div>
  );
}

// ── Workflow pipeline ─────────────────────────────────────────

function WorkflowPipeline({ status }: { status: string }) {
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  const isOnHold = status === 'on_hold';
  return (
    <div className="adm-pipe">
      {WORKFLOW_STEPS.map((step, i) => {
        const reached = !isOnHold && currentIdx >= i;
        const current = !isOnHold && currentIdx === i;
        return (
          <div key={step.key} className={`adm-pipe-step${reached ? ' is-reached' : ''}${current ? ' is-current' : ''}`}>
            <div className="adm-pipe-dot">{reached ? Icon.check : i + 1}</div>
            <div className="adm-pipe-label">{step.label}</div>
            {i < WORKFLOW_STEPS.length - 1 && <div className="adm-pipe-bar" />}
          </div>
        );
      })}
      {isOnHold && <div className="adm-pipe-hold">On Hold</div>}
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

  const [reuploadDoc,  setReuploadDoc]  = useState<{ id: string; name: string } | null>(null);
  const [rejectDoc,    setRejectDoc]    = useState<{ id: string; name: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<string | null>(null);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docName, setDocName] = useState('');

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

  const [scratchNotes, setScratchNotes] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState('');
  const [pinnedSaved, setPinnedSaved] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tx-service-detail', id],
    queryFn: async () => (await apiClient.get(`/texpert/services/${id}`)).data.data,
    enabled:         isTexpert && !!id,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data) {
      setScratchNotes(data.notes ?? '');
      setPinnedMsg(data.pinned_message ?? '');
    }
  }, [data?.notes, data?.pinned_message]);

  const approve = useMutation({
    mutationFn: (docId: string) => apiClient.post(`/texpert/services/${id}/docs/${docId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });
  const addDoc = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${id}/doc-slots`, { documentName: docName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }); setDocName(''); setShowAddDoc(false); },
  });
  const addTask = useMutation({
    mutationFn: () => apiClient.post(`/texpert/services/${id}/tasks`, { title: taskTitle, description: taskDesc || undefined, due_at: taskDue || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }); setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowAddTask(false); },
  });
  const updTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => apiClient.patch(`/texpert/services/${id}/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });
  const delTask = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/texpert/services/${id}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }),
  });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }); setNoteText(''); setShowLogNote(false); },
  });
  const savePinned = useMutation({
    mutationFn: () => apiClient.patch(`/texpert/services/${id}/pinned`, { pinned_message: pinnedMsg }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tx-service-detail', id] }); setPinnedSaved(true); setTimeout(() => setPinnedSaved(false), 2000); },
  });
  const saveNotes = useMutation({
    mutationFn: (notes: string) => apiClient.patch(`/texpert/services/${id}/notes-field`, { notes }),
    onSuccess: () => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); },
  });

  function onNotesChange(val: string) {
    setScratchNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes.mutate(val), 800);
  }

  const handleOutputUpload = useCallback(async (file: File) => {
    if (!outputDocName.trim()) { setOutputUploadErr('Enter a document name first'); return; }
    setOutputUploading(true); setOutputUploadErr(null);
    const form = new FormData();
    form.append('file', file);
    form.append('document_name', outputDocName.trim());
    if (outputDocDesc.trim()) form.append('description', outputDocDesc.trim());
    try {
      await apiClient.post(`/texpert/services/${id}/output-docs`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
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
  if (error || !data) return <div className="adm-root"><div className="adm-banner adm-banner--err">Service not found or not assigned to you.</div></div>;

  const client       = data.client as any;
  const service      = data.service as any;
  const docs         = (data.client_documents ?? []) as any[];
  const outputDocs   = (data.output_documents ?? []) as any[];
  const events       = (data.service_events ?? []) as any[];
  const tasks        = (data.service_tasks ?? []) as any[];
  const uploadedDocs = docs.filter(d => d.file_path || d.file_url).length;
  const pendingDocs  = docs.filter(d => !d.file_path && !d.file_url).length;
  const approvedDocs = docs.filter(d => d.status === 'approved').length;
  const reuploads    = docs.filter(d => d.reupload_requested).length;
  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;
  const doneTasks    = tasks.filter(t => t.status === 'done').length;

  const currentIdx  = WORKFLOW_STEPS.findIndex(s => s.key === data.status);
  const nextStep    = currentIdx >= 0 && currentIdx < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentIdx + 1] : null;
  const isCancelled = data.status === 'cancelled';

  // A service can only be completed once payment is confirmed — mirrors the backend gate.
  const paymentPaid      = data.payment_status === 'paid';
  const awaitingPayment  = data.status === 'payment' && !paymentPaid;
  const blockAdvance     = nextStep?.key === 'completed' && !paymentPaid;

  const TABS: [Tab, string, React.ReactNode][] = [
    ['docs', `Documents (${docs.length})`, Icon.docs],
    ['timeline', `Timeline (${events.length})`, Icon.timeline],
    ['tasks', `Tasks (${tasks.length})`, Icon.tasks],
    ['notes', 'Notes', Icon.notes],
    ['workflow', 'Workflow', Icon.flow],
  ];

  return (
    <div className="adm-root">
      {/* ── Hero ── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <button className="adm-back" onClick={() => navigate('/texpert/services')}>{Icon.back} My Services</button>
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Service</p>
            <h1 className="adm-hero-title">{service?.name ?? 'Service'}</h1>
            <p className="adm-hero-date">
              {data.fiscal_year && <span>{data.fiscal_year} · </span>}
              <span style={{ textTransform: 'capitalize' }}>{(data.status ?? '').replace(/_/g, ' ')}</span>
            </p>
          </div>
          {!isCancelled && (
            <div className="adm-hero-aside" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              {nextStep && data.status !== 'on_hold' && (
                <button
                  className="adm-btn adm-btn--accent"
                  disabled={blockAdvance}
                  title={blockAdvance ? 'Payment must be confirmed before completing' : undefined}
                  onClick={() => setStatusTarget(nextStep.key)}
                >
                  Advance → {nextStep.label}
                </button>
              )}
              {data.status !== 'on_hold' && data.status !== 'completed' && (
                <button className="adm-btn adm-btn--ghost" onClick={() => setStatusTarget('on_hold')} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: 'var(--lp-on-dark)' }}>Mark On Hold</button>
              )}
              {data.status === 'on_hold' && (
                <button className="adm-btn adm-btn--accent" onClick={() => setStatusTarget('in_progress')}>Resume</button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Client bar ── */}
      <div className="tx-clientbar">
        <div className="tx-cb-block">
          <span className="tx-cb-label">Client</span>
          <span className="tx-cb-name">{client?.first_name} {client?.last_name}</span>
        </div>
        <div className="tx-cb-sep" />
        {client?.pan && <div className="tx-cb-block"><span className="tx-cb-label">PAN</span><span className="tx-cb-val"><code className="adm-code">{client.pan}</code></span></div>}
        {client?.mobile && <div className="tx-cb-block"><span className="tx-cb-label">Mobile</span><span className="tx-cb-val">{client.mobile}</span></div>}
        {client?.email && <div className="tx-cb-block"><span className="tx-cb-label">Email</span><span className="tx-cb-val">{client.email}</span></div>}
        <div className="tx-cb-pay">
          <span className="tx-cb-label">Payment</span>
          {badge(data.payment_status === 'paid' ? 'paid' : 'pending')}
          {service?.price && <span className="adm-money">{formatRupees(service.price)}</span>}
        </div>
      </div>

      {/* ── Cancelled notice ── */}
      {isCancelled && (
        <div className="adm-banner adm-banner--muted" style={{ marginBottom: '1.25rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
          This service has been cancelled. All actions are frozen — the record is read-only.
        </div>
      )}

      {/* ── Pinned banner ── */}
      {data.pinned_message && (
        <div className="tx-pinned">
          <span className="tx-pinned-ico">{Icon.pin}</span>
          <div>
            <div className="tx-pinned-lbl">Pinned for client</div>
            <div className="tx-pinned-msg">{data.pinned_message}</div>
          </div>
        </div>
      )}

      {/* ── Deletion request ── */}
      {data.deletion_requested && (
        <div className="tx-del">
          <div className="tx-del-left">
            <span className="tx-del-ico">{Icon.alert}</span>
            <div>
              <div className="tx-del-title">Client has requested service cancellation</div>
              <div className="tx-del-sub">
                Requested on {data.deletion_requested_at ? new Date(data.deletion_requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown date'}.
                Approving will set the status to <strong>cancelled</strong>.
              </div>
            </div>
          </div>
          <div className="tx-del-actions">
            <button className="adm-btn adm-btn--danger" onClick={() => approveDeletion.mutate()} disabled={approveDeletion.isPending || rejectDeletion.isPending}>
              {approveDeletion.isPending ? 'Processing…' : 'Approve cancellation'}
            </button>
            <button className="adm-btn adm-btn--ghost" onClick={() => rejectDeletion.mutate()} disabled={approveDeletion.isPending || rejectDeletion.isPending}>
              {rejectDeletion.isPending ? 'Processing…' : 'Reject'}
            </button>
          </div>
          {(approveDeletion.isError || rejectDeletion.isError) && (
            <div className="tx-del-err">{((approveDeletion.error || rejectDeletion.error) as any)?.response?.data?.error ?? 'Something went wrong'}</div>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.docs}</span><span className="adm-stat-lbl">Documents</span></div>
          <div className="adm-stat-val">{docs.length}</div>
          <div className="adm-stat-sub">{approvedDocs} approved · {pendingDocs} pending</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.tasks}</span><span className="adm-stat-lbl">Open Tasks</span></div>
          <div className="adm-stat-val">{openTasks}</div>
          <div className="adm-stat-sub">{doneTasks} done</div>
        </div>
        {reuploads > 0 && (
          <div className="adm-stat" style={{ borderColor: 'var(--lp-accent)' }}>
            <div className="adm-stat-top"><span className="adm-stat-ico" style={{ color: 'var(--lp-accent)' }}>{Icon.alert}</span><span className="adm-stat-lbl">Re-upload Pending</span></div>
            <div className="adm-stat-val" style={{ color: 'var(--lp-accent)' }}>{reuploads}</div>
          </div>
        )}
      </div>

      {/* ── Awaiting payment notice ── */}
      {awaitingPayment && !isCancelled && (
        <div className="adm-banner adm-banner--amber" style={{ marginBottom: '1.25rem' }}>
          {Icon.alert}
          <span>Awaiting payment from the client. This service can be marked <strong>Completed</strong> only after payment is confirmed.</span>
        </div>
      )}

      {/* ── Tabs ── */}
      <nav className="adm-seg" role="tablist">
        {TABS.map(([t, label, ico]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`adm-seg-btn${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>{ico}{label}</button>
        ))}
      </nav>

      {/* ── Documents ── */}
      {tab === 'docs' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles"><h2 className="adm-panel-title">Documents<span className="adm-count">{uploadedDocs}/{docs.length}</span></h2></div>
            {!isCancelled && <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowAddDoc(v => !v)}>+ Add Document</button>}
          </div>

          {showAddDoc && (
            <div className="adm-addbar" style={{ marginBottom: '1.15rem' }}>
              <div className="adm-field" style={{ flex: 1, minWidth: 240 }}>
                <label className="adm-label">Document name</label>
                <input className="adm-input" placeholder="e.g. Bank Statement Q4" value={docName} onChange={e => setDocName(e.target.value)} onKeyDown={e => e.key === 'Enter' && docName.trim() && addDoc.mutate()} />
              </div>
              <button className="adm-btn adm-btn--ghost" onClick={() => { setShowAddDoc(false); setDocName(''); }}>Cancel</button>
              <button className="adm-btn adm-btn--accent" disabled={!docName.trim() || addDoc.isPending} onClick={() => addDoc.mutate()}>{addDoc.isPending ? 'Adding…' : 'Add Slot'}</button>
            </div>
          )}
          {addDoc.isError && <p className="adm-modal-err" style={{ marginBottom: '1rem' }}>{Icon.alert}{(addDoc.error as any)?.response?.data?.error}</p>}

          {docs.length === 0 ? (
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.docs}</span><p className="adm-empty-txt">No document slots have been created for this service.</p></div>
          ) : (
            <div className="adm-list">
              {docs.map(doc => {
                const hasFile = !!(doc.file_path || doc.file_url);
                const url     = doc.signed_url || doc.file_url;
                return (
                  <div key={doc.id} className={`adm-row${doc.reupload_requested ? ' adm-row--flag' : ''}`}>
                    <div className="adm-row-main">
                      <div className="adm-row-name">{doc.document_name}</div>
                      <div className="adm-row-meta">
                        {badge(doc.status ?? 'pending')}
                        {doc.reupload_requested && <span className="adm-badge adm-badge--amber"><span className="adm-badge-dot" />Re-upload requested</span>}
                        {doc.uploaded_at && <span className="adm-row-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                        {!hasFile && <span className="adm-row-date">Not uploaded yet</span>}
                      </div>
                      {doc.reupload_note && <div className="adm-row-note">Note to client: {doc.reupload_note}</div>}
                    </div>
                    <div className="adm-row-actions">
                      {hasFile && url && <a href={url} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--sm adm-btn--ghost">{Icon.ext} View</a>}
                      {!isCancelled && hasFile && doc.status !== 'approved' && <button className="adm-btn adm-btn--sm adm-btn--accent" disabled={approve.isPending} onClick={() => approve.mutate(doc.id)}>Approve</button>}
                      {!isCancelled && hasFile && doc.status !== 'rejected' && !doc.reupload_requested && <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setReuploadDoc({ id: doc.id, name: doc.document_name })}>Re-upload</button>}
                      {!isCancelled && hasFile && doc.status !== 'rejected' && <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setRejectDoc({ id: doc.id, name: doc.document_name })}>Reject</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Output documents */}
          <div style={{ marginTop: '1.75rem' }}>
            <div className="adm-sub-head">
              <div><h3 className="adm-sub-title">Output Documents</h3><p className="adm-sub-desc">Documents you generate for this client.</p></div>
              {!isCancelled && <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowOutputUpload(v => !v)}>+ Upload Output Doc</button>}
            </div>

            {showOutputUpload && (
              <div className="adm-addbar" style={{ marginBottom: '1.15rem', flexWrap: 'wrap' }}>
                <div className="adm-field" style={{ flex: '2 1 220px' }}>
                  <label className="adm-label">Document name</label>
                  <input className="adm-input" placeholder="e.g. ITR Filing Receipt, GST Certificate" value={outputDocName} onChange={e => { setOutputDocName(e.target.value); setOutputUploadErr(null); }} />
                </div>
                <div className="adm-field" style={{ flex: '2 1 220px' }}>
                  <label className="adm-label">Description <span className="adm-label-opt">(optional)</span></label>
                  <input className="adm-input" placeholder="Optional" value={outputDocDesc} onChange={e => setOutputDocDesc(e.target.value)} />
                </div>
                <button className="adm-btn adm-btn--accent" disabled={!outputDocName.trim() || outputUploading} onClick={() => outputFileRef.current?.click()}>{outputUploading ? 'Uploading…' : 'Choose file & upload'}</button>
                <button className="adm-btn adm-btn--ghost" onClick={() => { setShowOutputUpload(false); setOutputDocName(''); setOutputDocDesc(''); setOutputUploadErr(null); }}>Cancel</button>
                <input ref={outputFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleOutputUpload(f); }} />
              </div>
            )}
            {outputUploadErr && <p className="adm-modal-err" style={{ marginBottom: '1rem' }}>{Icon.alert}{outputUploadErr}</p>}

            {outputDocs.length === 0 ? (
              <div className="adm-empty-box" style={{ padding: '2rem 1rem' }}><p className="adm-empty-txt">No output documents yet. Upload processed documents, certificates, or filings here.</p></div>
            ) : (
              <div className="adm-list">
                {outputDocs.map((doc: any) => (
                  <div key={doc.id} className="adm-row" style={{ borderLeft: '3px solid var(--lp-green)' }}>
                    <div className="adm-row-main">
                      <div className="adm-row-name">{doc.document_name}</div>
                      <div className="adm-row-meta">
                        <span className="adm-badge adm-badge--green"><span className="adm-badge-dot" />Output</span>
                        {doc.description && <span className="adm-row-date">{doc.description}</span>}
                        {doc.uploaded_at && <span className="adm-row-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                      </div>
                    </div>
                    <div className="adm-row-actions">
                      {doc.signed_url && <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--sm adm-btn--ghost">{Icon.ext} View</a>}
                      <button className="adm-btn adm-btn--sm adm-btn--danger" disabled={deleteOutputDoc.isPending} onClick={() => { if (window.confirm(`Delete "${doc.document_name}"?`)) deleteOutputDoc.mutate(doc.id); }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Timeline ── */}
      {tab === 'timeline' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles"><h2 className="adm-panel-title">Timeline<span className="adm-count">{events.length}</span></h2></div>
            {!isCancelled && <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowLogNote(v => !v)}>+ Log Internal Note</button>}
          </div>

          {showLogNote && (
            <div className="adm-addbar" style={{ marginBottom: '1.15rem', alignItems: 'stretch' }}>
              <div className="adm-field" style={{ flex: 1, minWidth: 240 }}>
                <label className="adm-label">Internal note <span className="adm-label-opt">(staff only)</span></label>
                <textarea className="adm-textarea" rows={2} value={noteText} onChange={e => setNoteText(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button className="adm-btn adm-btn--ghost" onClick={() => { setShowLogNote(false); setNoteText(''); }}>Cancel</button>
                <button className="adm-btn adm-btn--accent" disabled={!noteText.trim() || logNote.isPending} onClick={() => logNote.mutate()}>{logNote.isPending ? 'Saving…' : 'Save Note'}</button>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.timeline}</span><p className="adm-empty-txt">Actions on this service will appear here.</p></div>
          ) : (
            <div className="adm-tl">
              {events.map(ev => (
                <div key={ev.id} className="adm-tl-item">
                  <div className="adm-tl-ico"><EventIcon type={ev.event_type} /></div>
                  <div className="adm-tl-body">
                    <div className="adm-tl-msg">{ev.message}</div>
                    <div className="adm-tl-meta">
                      <span className="adm-tl-type">{ev.event_type.replace(/_/g, ' ')}</span>
                      <span className="adm-tl-time">{fmtDateTime(ev.created_at)}</span>
                      {ev.metadata?.is_internal && <span className="adm-badge adm-badge--neutral"><span className="adm-badge-dot" />internal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles"><h2 className="adm-panel-title">Tasks<span className="adm-count">{openTasks} open</span></h2></div>
            {!isCancelled && <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowAddTask(v => !v)}>+ Add Task</button>}
          </div>

          {showAddTask && (
            <div className="adm-addbar" style={{ marginBottom: '1.15rem', flexWrap: 'wrap' }}>
              <div className="adm-field" style={{ flex: '2 1 200px' }}>
                <label className="adm-label">Title *</label>
                <input className="adm-input" placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              </div>
              <div className="adm-field" style={{ flex: '2 1 200px' }}>
                <label className="adm-label">Description</label>
                <input className="adm-input" placeholder="Optional" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Due</label>
                <input className="adm-input adm-input--date" type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button className="adm-btn adm-btn--ghost" onClick={() => { setShowAddTask(false); setTaskTitle(''); setTaskDesc(''); setTaskDue(''); }}>Cancel</button>
                <button className="adm-btn adm-btn--accent" disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate()}>{addTask.isPending ? 'Adding…' : 'Add Task'}</button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.tasks}</span><p className="adm-empty-txt">Track your internal workflow here. Tasks are private to staff.</p></div>
          ) : (
            <div className="adm-list">
              {tasks.map(task => (
                <div key={task.id} className="adm-row">
                  <div className="adm-row-main">
                    <div className="adm-row-name" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--lp-ink-faint)' : undefined }}>{task.title}</div>
                    {task.description && <div className="adm-row-desc">{task.description}</div>}
                    <div className="adm-row-meta">
                      {badge(task.status)}
                      {task.due_at && <span className="adm-row-date">Due {fmtDate(task.due_at)}</span>}
                      {task.completed_at && <span className="adm-row-date">Done {fmtDate(task.completed_at)}</span>}
                    </div>
                  </div>
                  {!isCancelled && (
                    <div className="adm-row-actions">
                      {task.status === 'todo' && <button className="adm-btn adm-btn--sm adm-btn--ghost" disabled={updTask.isPending} onClick={() => updTask.mutate({ taskId: task.id, status: 'in_progress' })}>Start</button>}
                      {task.status !== 'done' && task.status !== 'cancelled' && <button className="adm-btn adm-btn--sm adm-btn--accent" disabled={updTask.isPending} onClick={() => updTask.mutate({ taskId: task.id, status: 'done' })}>Done</button>}
                      <button className="adm-btn adm-btn--sm adm-btn--danger" disabled={delTask.isPending} onClick={() => delTask.mutate(task.id)} title="Delete task">{Icon.x}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Notes ── */}
      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section className="adm-panel">
            <div className="tx-notes-head">
              <span className="tx-notes-title">{Icon.pin} Pinned Message <span className="tx-notes-opt">· visible to client</span></span>
              {pinnedSaved && <span className="tx-saved">{Icon.check} Saved</span>}
            </div>
            <input className="adm-input" value={pinnedMsg} onChange={e => !isCancelled && setPinnedMsg(e.target.value)} readOnly={isCancelled}
              placeholder="e.g. Please upload bank statements for Q4. We need them by Friday." maxLength={200} style={isCancelled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} />
            {!isCancelled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <span className="tx-charcount">{pinnedMsg.length}/200 characters</span>
                <button className="adm-btn adm-btn--accent adm-btn--sm" disabled={savePinned.isPending || pinnedMsg === (data.pinned_message ?? '')} onClick={() => savePinned.mutate()}>{savePinned.isPending ? 'Saving…' : 'Save Pinned Message'}</button>
              </div>
            )}
          </section>

          <section className="adm-panel">
            <div className="tx-notes-head">
              <span className="tx-notes-title">{Icon.pencil} Internal Notes <span className="tx-notes-opt">· private to staff</span></span>
              {notesSaved && <span className="tx-saved">{Icon.check} Auto-saved</span>}
              {saveNotes.isPending && <span className="tx-charcount">Saving…</span>}
            </div>
            <textarea className="adm-textarea" rows={10} value={scratchNotes} onChange={e => !isCancelled && onNotesChange(e.target.value)} readOnly={isCancelled}
              placeholder="Your private notes. Auto-saves as you type." style={{ lineHeight: 1.6, ...(isCancelled ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} />
          </section>
        </div>
      )}

      {/* ── Workflow ── */}
      {tab === 'workflow' && (
        <section className="adm-panel">
          <div className="adm-sub-head"><h3 className="adm-sub-title">Current Status</h3></div>
          <WorkflowPipeline status={data.status} />

          {!isCancelled && (
            <>
              <div className="adm-sub-head" style={{ marginTop: '2rem' }}><h3 className="adm-sub-title">Manual Status Change</h3></div>
              <div className="adm-status-grid">
                {WORKFLOW_STEPS.map(s => {
                  const blockComplete = s.key === 'completed' && !paymentPaid;
                  return (
                    <button
                      key={s.key}
                      className={`adm-status-btn${data.status === s.key ? ' is-current' : ''}`}
                      disabled={data.status === s.key || blockComplete}
                      title={blockComplete ? 'Payment must be confirmed before completing' : undefined}
                      onClick={() => setStatusTarget(s.key)}
                    >
                      {s.label}{data.status === s.key && <span className="adm-status-cur">· Current</span>}
                    </button>
                  );
                })}
                <button className="adm-status-btn adm-status-btn--hold" disabled={data.status === 'on_hold'} onClick={() => setStatusTarget('on_hold')}>
                  On Hold{data.status === 'on_hold' && <span className="adm-status-cur">· Current</span>}
                </button>
              </div>
            </>
          )}

          <div className="adm-sub-head" style={{ marginTop: '2rem' }}><h3 className="adm-sub-title">Service Metadata</h3></div>
          <div className="adm-kv">
            <div className="adm-kv-row"><span className="adm-kv-label">Created</span><span className="adm-kv-val">{fmtDateTime(data.created_at)}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">Last Updated</span><span className="adm-kv-val">{fmtDateTime(data.updated_at)}</span></div>
            {data.assigned_texpert_at && <div className="adm-kv-row"><span className="adm-kv-label">Assigned to You</span><span className="adm-kv-val">{fmtDateTime(data.assigned_texpert_at)}</span></div>}
            {data.payment_id && <div className="adm-kv-row"><span className="adm-kv-label">Payment ID</span><span className="adm-kv-val"><code className="adm-code">{data.payment_id}</code></span></div>}
            {data.is_blocked && <div className="adm-kv-row"><span className="adm-kv-label">Blocked</span><span className="adm-kv-val"><span className="adm-badge adm-badge--red"><span className="adm-badge-dot" />Yes{data.blocked_reason ? ` — ${data.blocked_reason}` : ''}</span></span></div>}
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {reuploadDoc && <ReuploadModal serviceId={id} docId={reuploadDoc.id} docName={reuploadDoc.name} onClose={() => setReuploadDoc(null)} />}
      {rejectDoc && <RejectModal serviceId={id} docId={rejectDoc.id} docName={rejectDoc.name} onClose={() => setRejectDoc(null)} />}
      {statusTarget && <StatusModal serviceId={id} targetStatus={statusTarget} onClose={() => setStatusTarget(null)} />}
    </div>
  );
}
