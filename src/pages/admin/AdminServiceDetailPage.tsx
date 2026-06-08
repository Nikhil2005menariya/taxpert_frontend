import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type DetailTab = 'docs' | 'timeline' | 'tasks' | 'payment' | 'workflow' | 'settings';

const STATUS_OPTIONS = [
  'documents_required', 'documents_received', 'in_progress',
  'under_review', 'payment', 'completed', 'on_hold', 'cancelled',
];

const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: 'documents_required', label: 'Docs Required' },
  { key: 'documents_received', label: 'Docs Received' },
  { key: 'in_progress',        label: 'In Progress' },
  { key: 'under_review',       label: 'Under Review' },
  { key: 'payment',            label: 'Payment' },
  { key: 'completed',          label: 'Completed' },
];

const STATUS_TONE: Record<string, string> = {
  pending: 'adm-badge--neutral',
  documents_required: 'adm-badge--amber',
  documents_received: 'adm-badge--green',
  in_progress: 'adm-badge--blue',
  under_review: 'adm-badge--accent',
  payment: 'adm-badge--amber',
  completed: 'adm-badge--green',
  on_hold: 'adm-badge--neutral',
  cancelled: 'adm-badge--red',
  approved: 'adm-badge--green',
  rejected: 'adm-badge--red',
  uploaded: 'adm-badge--blue',
  paid: 'adm-badge--green',
  failed: 'adm-badge--red',
  refunded: 'adm-badge--accent',
  done: 'adm-badge--green',
};

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  chevronD: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>,
  docs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  timeline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  tasks: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  pay: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  flow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 6h6a4 4 0 0 1 4 4v.5M7 18h6a4 4 0 0 0 4-4" /></svg>,
  cog: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  ext: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></svg>,
};

function EventIcon({ type }: { type: string }) {
  let path = <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />;
  if (type === 'status_changed') path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></>;
  else if (type === 'document_approved') path = <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>;
  else if (type === 'document_rejected') path = <><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></>;
  else if (type === 'document_reupload_requested') path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /></>;
  else if (type === 'optional_document_added') path = <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></>;
  else if (type === 'texpert_assigned') path = <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>;
  else if (type === 'payout_recorded' || type === 'payment_received' || type === 'payment_captured') path = <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>;
  else if (type === 'task_added') path = <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>;
  else if (type === 'admin_note') path = <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>;
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
}

function badge(status: string) {
  return <span className={`adm-badge ${STATUS_TONE[status] ?? 'adm-badge--neutral'}`}><span className="adm-badge-dot" />{(status ?? 'pending').replace(/_/g, ' ')}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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

function ReuploadModal({ docName, docId, serviceId, onClose }: { docName: string; docId: string; serviceId: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => apiClient.patch(`/admin/client-services/${serviceId}/docs/${docId}`, { action: 'reupload', note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', serviceId] }); onClose(); },
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
            <textarea className="adm-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Explain what's wrong or what's needed…" />
          </div>
          {mut.isError && <p className="adm-modal-err">{Icon.alert}{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Sending…' : 'Request Re-upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchReuploadModal({ docIds, serviceId, onClose, onDone }: { docIds: string[]; serviceId: string; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const n = docIds.length;

  const mut = useMutation({
    mutationFn: () => apiClient.patch(`/admin/client-services/${serviceId}/docs/batch`, { action: 'reupload', docIds, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', serviceId] }); onDone(); onClose(); },
  });

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Documents</p>
            <h3 className="adm-modal-title">Request Re-upload</h3>
            <p className="adm-modal-sub">{n} document{n !== 1 ? 's' : ''} selected · the client gets one notification</p>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Note to client <span className="adm-label-opt">(optional)</span></label>
            <textarea className="adm-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Explain what's wrong or what's needed for these documents…" />
          </div>
          {mut.isError && <p className="adm-modal-err">{Icon.alert}{(mut.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Sending…' : `Request Re-upload (${n})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignTexpertModal({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const [texpertId, setTexpertId] = useState('');
  const qc = useQueryClient();

  const { data: taxperts } = useQuery({
    queryKey: ['taxperts-active'],
    queryFn: async () => (await apiClient.get('/admin/taxperts/active')).data.data ?? [],
  });

  const assign = useMutation({
    mutationFn: () => apiClient.post('/admin/assign', { clientServiceId: serviceId, texpertId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', serviceId] }); onClose(); },
  });

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div>
            <p className="adm-modal-eyebrow">— Assignment</p>
            <h3 className="adm-modal-title">Assign / Reassign Taxpert</h3>
          </div>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">{Icon.x}</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-field">
            <label className="adm-label">Select Taxpert</label>
            <div className="adm-select-wrap">
              <select className="adm-select" value={texpertId} onChange={e => setTexpertId(e.target.value)}>
                <option value="">— Choose a Taxpert —</option>
                {(taxperts ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
              <span className="adm-select-ico">{Icon.chevronD}</span>
            </div>
          </div>
          {assign.isError && <p className="adm-modal-err">{Icon.alert}{(assign.error as any)?.response?.data?.error}</p>}
        </div>
        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn--accent" disabled={!texpertId || assign.isPending} onClick={() => assign.mutate()}>
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

  const [reuploadDoc, setReuploadDoc] = useState<{ id: string; name: string } | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docNames, setDocNames] = useState<string[]>(['']);

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showBatchReupload, setShowBatchReupload] = useState(false);

  const [showLogNote, setShowLogNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');

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

  const addToQueue = useMutation({
    mutationFn: () => apiClient.post('/admin/queue', { clientServiceId: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const updateService = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/admin/client-services/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setSettingsDirty(false); },
  });

  const docAction = useMutation({
    mutationFn: ({ docId, action }: { docId: string; action: string }) =>
      apiClient.patch(`/admin/client-services/${id}/docs/${docId}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const addDocs = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/docs/batch`, {
      document_names: docNames.map(s => s.trim()).filter(Boolean),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setDocNames(['']); setShowAddDoc(false); },
  });

  // Bulk approve / reject across the selected uploaded documents (one notification).
  const batchDocAction = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' }) =>
      apiClient.patch(`/admin/client-services/${id}/docs/batch`, { action, docIds: [...selectedDocs] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setSelectedDocs(new Set()); },
  });

  const logNote = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/events`, { message: noteText }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setNoteText(''); setShowLogNote(false); },
  });

  const addTask = useMutation({
    mutationFn: () => apiClient.post(`/admin/client-services/${id}/tasks`, {
      title: taskTitle, description: taskDesc || undefined, due_at: taskDue || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }); setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowAddTask(false); },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiClient.patch(`/admin/client-services/${id}/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/admin/client-services/${id}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-detail', id] }),
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (error || !data) return <div className="adm-root"><div className="adm-banner adm-banner--err">Service not found.</div></div>;

  const client      = data.client as any;
  const service     = data.service as any;
  const texpert     = data.assigned_texpert as any;
  const docs: any[] = data.client_documents ?? [];
  const outputDocs: any[] = data.output_documents ?? [];
  const events: any[] = data.service_events ?? [];
  const tasks: any[] = data.service_tasks ?? [];
  const uploadedDocs = docs.filter(d => d.file_path || d.file_url).length;
  const pendingDocs = docs.filter(d => !d.file_path && !d.file_url).length;
  const reuploads = docs.filter(d => d.reupload_requested).length;

  // Only uploaded docs can be approved/rejected/re-upload-requested → selectable.
  const selectableDocs = docs.filter((d: any) => !!(d.file_path || d.file_url));
  const selectedDocObjs = selectableDocs.filter((d: any) => selectedDocs.has(d.id));
  const validSelected = selectedDocObjs.map((d: any) => d.id);
  const allSelected = selectableDocs.length > 0 && validSelected.length === selectableDocs.length;

  // Only offer an action when at least one selected doc isn't already in that state.
  const canBatchApprove  = selectedDocObjs.some((d: any) => d.status !== 'approved');
  const canBatchReject   = selectedDocObjs.some((d: any) => d.status !== 'rejected');
  const canBatchReupload = selectedDocObjs.some((d: any) => !d.reupload_requested);
  const toggleDoc = (docId: string) =>
    setSelectedDocs(prev => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  const toggleAllDocs = () =>
    setSelectedDocs(allSelected ? new Set() : new Set(selectableDocs.map((d: any) => d.id)));

  const openTasks = tasks.filter((t: any) => t.status !== 'done' && t.status !== 'cancelled').length;
  const doneTasks = tasks.filter((t: any) => t.status === 'done').length;

  function initSettings() {
    setSettingsStatus(data.status ?? '');
    setSettingsNotes(data.notes ?? '');
    setSettingsPinned(data.pinned_message ?? '');
    setSettingsBlocked(data.is_blocked ?? false);
    setSettingsBlockedReason(data.blocked_reason ?? '');
    setSettingsDirty(true);
  }

  const TABS: [DetailTab, string, React.ReactNode][] = [
    ['docs', `Documents (${docs.length})`, Icon.docs],
    ['timeline', `Timeline (${events.length})`, Icon.timeline],
    ['tasks', `Tasks (${tasks.length})`, Icon.tasks],
    ['payment', 'Payment', Icon.pay],
    ['workflow', 'Workflow', Icon.flow],
    ['settings', 'Settings', Icon.cog],
  ];

  return (
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <button className="adm-back" onClick={() => navigate(`/admin/users/client/${client?.id}`)}>
          {Icon.back} {client?.first_name} {client?.last_name}
        </button>
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Service</p>
            <h1 className="adm-hero-title">{service?.name ?? 'Service Detail'}</h1>
            <p className="adm-hero-date">
              {data.fiscal_year && <span>{data.fiscal_year} · </span>}
              <span style={{ textTransform: 'capitalize' }}>{(data.status ?? '').replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className="adm-hero-aside" style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!texpert && !['completed', 'cancelled'].includes(data.status) && (
              <button className="adm-btn adm-btn--ghost" onClick={() => addToQueue.mutate()} disabled={addToQueue.isPending} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: 'var(--lp-on-dark)' }}>
                {addToQueue.isPending ? 'Adding…' : addToQueue.isError ? 'Failed — retry' : 'Add to Queue'}
              </button>
            )}
            <button className="adm-btn adm-btn--accent" onClick={() => setShowAssign(true)}>
              {texpert ? 'Reassign Taxpert' : 'Assign Taxpert'}
            </button>
          </div>
        </div>
      </header>

      {/* Stats overview */}
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.docs}</span><span className="adm-stat-lbl">Documents</span></div>
          <div className="adm-stat-val">{docs.length}</div>
          <div className="adm-stat-sub">{uploadedDocs} uploaded · {pendingDocs} pending</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.pay}</span><span className="adm-stat-lbl">Payment</span></div>
          <div className="adm-stat-val" style={{ fontSize: '1.05rem', textTransform: 'capitalize' }}>{(data.payment_status ?? 'pending').replace(/_/g, ' ')}</div>
          {service?.price && <div className="adm-stat-sub">₹{(service.price / 100).toLocaleString('en-IN')}</div>}
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.tasks}</span><span className="adm-stat-lbl">Taxpert</span></div>
          <div className="adm-stat-val" style={{ fontSize: '1.05rem' }}>{texpert ? `${texpert.first_name} ${texpert.last_name}` : 'Unassigned'}</div>
          {texpert && <div className="adm-stat-sub">{texpert.email}</div>}
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.tasks}</span><span className="adm-stat-lbl">Tasks</span></div>
          <div className="adm-stat-val">{openTasks}</div>
          <div className="adm-stat-sub">{doneTasks} done</div>
        </div>
        {reuploads > 0 && (
          <div className="adm-stat" style={{ borderColor: 'var(--lp-accent)' }}>
            <div className="adm-stat-top"><span className="adm-stat-ico">{Icon.alert}</span><span className="adm-stat-lbl">Re-upload Pending</span></div>
            <div className="adm-stat-val" style={{ color: 'var(--lp-accent)' }}>{reuploads}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className="adm-seg" role="tablist">
        {TABS.map(([t, label, ico]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`adm-seg-btn${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {ico}{label}
          </button>
        ))}
      </nav>

      {/* ── Documents ── */}
      {tab === 'docs' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles">
              <h2 className="adm-panel-title">Documents<span className="adm-count">{docs.length}</span></h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectableDocs.length > 0 && (
                <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={toggleAllDocs}>
                  {allSelected ? 'Clear selection' : 'Select all uploaded'}
                </button>
              )}
              <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowAddDoc(v => !v)}>+ Add Documents</button>
            </div>
          </div>

          {showAddDoc && (
            <div className="adm-multiadd">
              <label className="adm-label">Document names</label>
              {docNames.map((name, i) => (
                <div key={i} className="adm-multiadd-row">
                  <input
                    className="adm-input"
                    placeholder="e.g. Bank Statement Q2"
                    value={name}
                    autoFocus={i === docNames.length - 1}
                    onChange={e => setDocNames(arr => arr.map((v, j) => (j === i ? e.target.value : v)))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); setDocNames(arr => [...arr, '']); }
                    }}
                  />
                  {docNames.length > 1 && (
                    <button className="adm-multiadd-del" title="Remove" onClick={() => setDocNames(arr => arr.filter((_, j) => j !== i))}>{Icon.x}</button>
                  )}
                </div>
              ))}
              <button className="adm-multiadd-more" onClick={() => setDocNames(arr => [...arr, ''])}>+ Add another</button>
              <div className="adm-multiadd-foot">
                <button className="adm-btn adm-btn--ghost" onClick={() => { setShowAddDoc(false); setDocNames(['']); }}>Cancel</button>
                <button
                  className="adm-btn adm-btn--accent"
                  disabled={docNames.filter(s => s.trim()).length === 0 || addDocs.isPending}
                  onClick={() => addDocs.mutate()}
                >
                  {addDocs.isPending ? 'Adding…' : `Add ${docNames.filter(s => s.trim()).length || ''} slot${docNames.filter(s => s.trim()).length !== 1 ? 's' : ''}`.trim()}
                </button>
              </div>
            </div>
          )}
          {addDocs.isError && <p className="adm-modal-err" style={{ marginBottom: '1rem' }}>{Icon.alert}{(addDocs.error as any)?.response?.data?.error}</p>}

          {/* Bulk action bar */}
          {validSelected.length > 0 && (
            <div className="adm-batchbar">
              <span className="adm-batchbar-count">{validSelected.length} selected</span>
              <div className="adm-batchbar-actions">
                {canBatchApprove && <button className="adm-btn adm-btn--sm adm-btn--accent" disabled={batchDocAction.isPending} onClick={() => batchDocAction.mutate({ action: 'approve' })}>Approve</button>}
                {canBatchReject && <button className="adm-btn adm-btn--sm adm-btn--ghost" disabled={batchDocAction.isPending} onClick={() => batchDocAction.mutate({ action: 'reject' })}>Reject</button>}
                {canBatchReupload && <button className="adm-btn adm-btn--sm adm-btn--danger" disabled={batchDocAction.isPending} onClick={() => setShowBatchReupload(true)}>Request re-upload</button>}
                <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setSelectedDocs(new Set())}>Clear</button>
              </div>
            </div>
          )}
          {batchDocAction.isError && <p className="adm-modal-err" style={{ marginBottom: '1rem' }}>{Icon.alert}{(batchDocAction.error as any)?.response?.data?.error}</p>}

          {docs.length === 0 ? (
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.docs}</span><p className="adm-empty-txt">No document slots have been created for this service.</p></div>
          ) : (
            <div className="adm-list">
              {docs.map((doc: any) => {
                const hasFile = !!(doc.file_path || doc.file_url);
                const isSel = selectedDocs.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`adm-row${doc.reupload_requested ? ' adm-row--flag' : ''}${isSel ? ' adm-row--selected' : ''}${hasFile ? ' adm-row--clickable' : ''}`}
                    onClick={hasFile ? () => toggleDoc(doc.id) : undefined}
                  >
                    {hasFile ? (
                      <label className="adm-checkbox" title="Select for bulk action">
                        <input type="checkbox" checked={isSel} readOnly tabIndex={-1} />
                        <span className="adm-checkbox-box" aria-hidden="true" />
                      </label>
                    ) : (
                      <span className="adm-checkbox adm-checkbox--placeholder" aria-hidden="true" />
                    )}
                    <div className="adm-row-main">
                      <div className="adm-row-name">{doc.document_name}</div>
                      <div className="adm-row-meta">
                        {badge(doc.status ?? 'pending')}
                        {doc.reupload_requested && <span className="adm-badge adm-badge--amber"><span className="adm-badge-dot" />Re-upload requested</span>}
                        {doc.uploaded_at && <span className="adm-row-date">Uploaded {fmtDate(doc.uploaded_at)}</span>}
                        {!hasFile && <span className="adm-row-date">Not uploaded</span>}
                      </div>
                      {doc.reupload_note && <div className="adm-row-note">Note: {doc.reupload_note}</div>}
                    </div>
                    <div className="adm-row-actions" onClick={e => e.stopPropagation()}>
                      {hasFile && <a href={doc.signed_url || doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--sm adm-btn--ghost">{Icon.ext} View</a>}
                      {hasFile && doc.status !== 'approved' && (
                        <button className="adm-btn adm-btn--sm adm-btn--accent" disabled={docAction.isPending} onClick={() => docAction.mutate({ docId: doc.id, action: 'approve' })}>Approve</button>
                      )}
                      {hasFile && doc.status !== 'rejected' && (
                        <button className="adm-btn adm-btn--sm adm-btn--ghost" disabled={docAction.isPending} onClick={() => docAction.mutate({ docId: doc.id, action: 'reject' })}>Reject</button>
                      )}
                      {hasFile && !doc.reupload_requested && (
                        <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => setReuploadDoc({ id: doc.id, name: doc.document_name })}>Re-upload</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {outputDocs.length > 0 && (
            <div style={{ marginTop: '1.75rem' }}>
              <div className="adm-sub-head"><div><h3 className="adm-sub-title">Output Documents</h3><p className="adm-sub-desc">Generated by Taxpert · {outputDocs.length} file{outputDocs.length !== 1 ? 's' : ''}</p></div></div>
              <div className="adm-list">
                {outputDocs.map((doc: any) => (
                  <div key={doc.id} className="adm-row" style={{ borderLeft: '3px solid var(--lp-green)' }}>
                    <div className="adm-row-main">
                      <div className="adm-row-name">{doc.document_name}</div>
                      <div className="adm-row-meta">
                        <span className="adm-badge adm-badge--green"><span className="adm-badge-dot" />Output</span>
                        {doc.description && <span className="adm-row-date">{doc.description}</span>}
                        {doc.uploader_name && <span className="adm-row-date">By {doc.uploader_name}</span>}
                        {doc.uploaded_at && <span className="adm-row-date">{fmtDate(doc.uploaded_at)}</span>}
                      </div>
                    </div>
                    <div className="adm-row-actions">
                      {doc.signed_url && <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--sm adm-btn--ghost">{Icon.ext} View</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Timeline ── */}
      {tab === 'timeline' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div className="adm-panel-titles"><h2 className="adm-panel-title">Timeline<span className="adm-count">{events.length}</span></h2></div>
            <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowLogNote(v => !v)}>+ Log Note</button>
          </div>

          {showLogNote && (
            <div className="adm-addbar" style={{ marginBottom: '1.15rem', alignItems: 'stretch' }}>
              <div className="adm-field" style={{ flex: 1, minWidth: 240 }}>
                <label className="adm-label">Internal note</label>
                <textarea className="adm-textarea" rows={2} placeholder="e.g. Called client, confirmed documents will arrive by Friday" value={noteText} onChange={e => setNoteText(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button className="adm-btn adm-btn--ghost" onClick={() => { setShowLogNote(false); setNoteText(''); }}>Cancel</button>
                <button className="adm-btn adm-btn--accent" disabled={!noteText.trim() || logNote.isPending} onClick={() => logNote.mutate()}>{logNote.isPending ? 'Logging…' : 'Log Note'}</button>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.timeline}</span><p className="adm-empty-txt">Actions on this service will appear here.</p></div>
          ) : (
            <div className="adm-tl">
              {events.map((ev: any) => (
                <div key={ev.id} className="adm-tl-item">
                  <div className="adm-tl-ico"><EventIcon type={ev.event_type} /></div>
                  <div className="adm-tl-body">
                    <div className="adm-tl-msg">{ev.message}</div>
                    <div className="adm-tl-meta">
                      <span className="adm-tl-type">{ev.event_type.replace(/_/g, ' ')}</span>
                      <span className="adm-tl-time">{fmtDateTime(ev.created_at)}</span>
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
            <div className="adm-panel-titles"><h2 className="adm-panel-title">Tasks<span className="adm-count">{tasks.length}</span></h2></div>
            <button className="adm-btn adm-btn--sm adm-btn--ghost" onClick={() => setShowAddTask(v => !v)}>+ Add Task</button>
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
            <div className="adm-empty-box"><span className="adm-empty-ico">{Icon.tasks}</span><p className="adm-empty-txt">Add tasks to track work items for this service.</p></div>
          ) : (
            <div className="adm-list">
              {tasks.map((task: any) => (
                <div key={task.id} className="adm-row">
                  <div className="adm-row-main">
                    <div className="adm-row-name" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--lp-ink-faint)' : undefined }}>{task.title}</div>
                    {task.description && <div className="adm-row-desc">{task.description}</div>}
                    <div className="adm-row-meta">
                      {badge(task.status === 'in_progress' ? 'in_progress' : task.status)}
                      {task.due_at && <span className="adm-row-date">Due {fmtDate(task.due_at)}</span>}
                      {task.completed_at && <span className="adm-row-date">Done {fmtDate(task.completed_at)}</span>}
                    </div>
                  </div>
                  <div className="adm-row-actions">
                    {task.status === 'todo' && (
                      <button className="adm-btn adm-btn--sm adm-btn--ghost" disabled={updateTask.isPending} onClick={() => updateTask.mutate({ taskId: task.id, status: 'in_progress' })}>Start</button>
                    )}
                    {task.status !== 'done' && task.status !== 'cancelled' && (
                      <button className="adm-btn adm-btn--sm adm-btn--accent" disabled={updateTask.isPending} onClick={() => updateTask.mutate({ taskId: task.id, status: 'done' })}>Done</button>
                    )}
                    <button className="adm-btn adm-btn--sm adm-btn--danger" disabled={deleteTask.isPending} onClick={() => deleteTask.mutate(task.id)} title="Delete task">{Icon.x}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Payment ── */}
      {tab === 'payment' && (
        <section className="adm-panel">
          <div className="adm-sub-head"><h3 className="adm-sub-title">Payment Information</h3></div>
          <div className="adm-kv">
            <div className="adm-kv-row"><span className="adm-kv-label">Status</span><span className="adm-kv-val">{badge(data.payment_status ?? 'pending')}</span></div>
            {service?.price && <div className="adm-kv-row"><span className="adm-kv-label">Service Price</span><span className="adm-kv-val"><span className="adm-money">₹{(service.price / 100).toLocaleString('en-IN')}</span></span></div>}
            {data.razorpay_order_id && <div className="adm-kv-row"><span className="adm-kv-label">Razorpay Order</span><span className="adm-kv-val"><code className="adm-code">{data.razorpay_order_id}</code></span></div>}
            {data.payment_id && <div className="adm-kv-row"><span className="adm-kv-label">Payment ID</span><span className="adm-kv-val"><code className="adm-code">{data.payment_id}</code></span></div>}
          </div>
        </section>
      )}

      {/* ── Workflow ── */}
      {tab === 'workflow' && (
        <section className="adm-panel">
          <div className="adm-sub-head"><h3 className="adm-sub-title">Current Status</h3></div>
          <WorkflowPipeline status={data.status} />

          {!texpert && !['completed', 'cancelled'].includes(data.status) && (
            <div className="adm-banner adm-banner--err" style={{ marginTop: '1.25rem' }}>{Icon.alert}Assign a Taxpert before updating the workflow status — use the Assign Taxpert button at the top.</div>
          )}
          {data.status === 'payment' && data.payment_status !== 'paid' && (
            <div className="adm-banner adm-banner--err" style={{ marginTop: '1rem' }}>{Icon.alert}Awaiting payment. The service can be marked Completed only after payment is confirmed.</div>
          )}

          {data.status !== 'cancelled' && (
            <>
              <div className="adm-sub-head" style={{ marginTop: '2rem' }}><h3 className="adm-sub-title">Manual Status Change</h3></div>
              {updateService.isError && <p className="adm-modal-err">{Icon.alert}{(updateService.error as any)?.response?.data?.error ?? 'Failed to update status'}</p>}
              <div className="adm-status-grid">
                {WORKFLOW_STEPS.map(s => {
                  const isCurrent = data.status === s.key;
                  const blockComplete = s.key === 'completed' && data.payment_status !== 'paid';
                  return (
                    <button key={s.key} className={`adm-status-btn${isCurrent ? ' is-current' : ''}`}
                      disabled={!texpert || isCurrent || blockComplete || updateService.isPending}
                      title={!texpert ? 'Assign a Taxpert first' : blockComplete ? 'Payment must be confirmed before completing' : undefined}
                      onClick={() => updateService.mutate({ status: s.key })}>
                      {s.label}{isCurrent && <span className="adm-status-cur">· Current</span>}
                    </button>
                  );
                })}
                <button className="adm-status-btn adm-status-btn--hold"
                  disabled={!texpert || data.status === 'on_hold' || updateService.isPending}
                  title={!texpert ? 'Assign a Taxpert first' : undefined}
                  onClick={() => updateService.mutate({ status: 'on_hold' })}>
                  On Hold{data.status === 'on_hold' && <span className="adm-status-cur">· Current</span>}
                </button>
              </div>
            </>
          )}

          <div className="adm-sub-head" style={{ marginTop: '2rem' }}><h3 className="adm-sub-title">Service Metadata</h3></div>
          <div className="adm-kv">
            <div className="adm-kv-row"><span className="adm-kv-label">Created</span><span className="adm-kv-val">{fmtDateTime(data.created_at)}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">Last Updated</span><span className="adm-kv-val">{fmtDateTime(data.updated_at)}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">Payment</span><span className="adm-kv-val">{badge(data.payment_status ?? 'pending')}</span></div>
            {data.payment_id && <div className="adm-kv-row"><span className="adm-kv-label">Payment ID</span><span className="adm-kv-val"><code className="adm-code">{data.payment_id}</code></span></div>}
            {data.is_blocked && <div className="adm-kv-row"><span className="adm-kv-label">Blocked</span><span className="adm-kv-val"><span className="adm-badge adm-badge--red"><span className="adm-badge-dot" />Yes{data.blocked_reason ? ` — ${data.blocked_reason}` : ''}</span></span></div>}
          </div>
        </section>
      )}

      {/* ── Settings ── */}
      {tab === 'settings' && (
        <section className="adm-panel">
          <div className="adm-sub-head"><h3 className="adm-sub-title">Service Controls</h3></div>
          {!settingsDirty ? (
            <div className="adm-kv">
              <div className="adm-kv-row"><span className="adm-kv-label">Status</span><span className="adm-kv-val">{badge(data.status)}</span></div>
              <div className="adm-kv-row"><span className="adm-kv-label">Fiscal Year</span><span className="adm-kv-val">{data.fiscal_year ?? '—'}</span></div>
              <div className="adm-kv-row"><span className="adm-kv-label">Notes</span><span className="adm-kv-val">{data.notes ?? '—'}</span></div>
              <div className="adm-kv-row"><span className="adm-kv-label">Pinned Message</span><span className="adm-kv-val">{data.pinned_message ?? '—'}</span></div>
              <div className="adm-kv-row"><span className="adm-kv-label">Blocked</span><span className="adm-kv-val"><span className={`adm-badge ${data.is_blocked ? 'adm-badge--red' : 'adm-badge--green'}`}><span className="adm-badge-dot" />{data.is_blocked ? 'Yes' : 'No'}</span></span></div>
              {data.blocked_reason && <div className="adm-kv-row"><span className="adm-kv-label">Block Reason</span><span className="adm-kv-val">{data.blocked_reason}</span></div>}
              <div className="adm-kv-row"><span className="adm-kv-label">Created</span><span className="adm-kv-val">{fmtDate(data.created_at)}</span></div>
              <div className="adm-kv-row"><span className="adm-kv-label">Last Updated</span><span className="adm-kv-val">{fmtDate(data.updated_at)}</span></div>
              <div className="adm-kv-row" style={{ borderBottom: 'none' }}><span className="adm-kv-label" /><span className="adm-kv-val"><button className="adm-btn adm-btn--accent adm-btn--sm" onClick={initSettings}>Edit</button></span></div>
            </div>
          ) : (
            <div className="adm-form" style={{ maxWidth: 560 }}>
              <div className="adm-field">
                <label className="adm-label">Status</label>
                <div className="adm-select-wrap">
                  <select className="adm-select" value={settingsStatus} onChange={e => setSettingsStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  <span className="adm-select-ico">{Icon.chevronD}</span>
                </div>
              </div>
              <div className="adm-field">
                <label className="adm-label">Internal Notes</label>
                <textarea className="adm-textarea" rows={3} value={settingsNotes} onChange={e => setSettingsNotes(e.target.value)} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Pinned Message <span className="adm-label-opt">(shown to client)</span></label>
                <input className="adm-input" value={settingsPinned} onChange={e => setSettingsPinned(e.target.value)} placeholder="e.g. Awaiting GST portal access from client" />
              </div>
              <label className="adm-check">
                <input type="checkbox" checked={settingsBlocked} onChange={e => setSettingsBlocked(e.target.checked)} />
                Mark as Blocked
              </label>
              {settingsBlocked && (
                <div className="adm-field">
                  <label className="adm-label">Block Reason</label>
                  <input className="adm-input" value={settingsBlockedReason} onChange={e => setSettingsBlockedReason(e.target.value)} placeholder="Why is this service blocked?" />
                </div>
              )}
              {updateService.isError && <p className="adm-modal-err">{Icon.alert}{(updateService.error as any)?.response?.data?.error}</p>}
              {updateService.isSuccess && <p className="adm-banner adm-banner--ok" style={{ margin: 0 }}>{Icon.check}Saved successfully.</p>}
              <div className="adm-savebar" style={{ justifyContent: 'flex-start' }}>
                <button className="adm-btn adm-btn--ghost" onClick={() => setSettingsDirty(false)}>Cancel</button>
                <button className="adm-submit" disabled={updateService.isPending} onClick={() => updateService.mutate({
                  status: settingsStatus, notes: settingsNotes, pinned_message: settingsPinned,
                  is_blocked: settingsBlocked, blocked_reason: settingsBlockedReason,
                })}>
                  {updateService.isPending ? <><span className="adm-submit-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          <div className="adm-sub-head" style={{ marginTop: '2rem' }}><h3 className="adm-sub-title">Client Information</h3></div>
          <div className="adm-kv">
            <div className="adm-kv-row"><span className="adm-kv-label">Name</span><span className="adm-kv-val">{client?.first_name} {client?.last_name}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">Email</span><span className="adm-kv-val">{client?.email}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">Mobile</span><span className="adm-kv-val">{client?.mobile ?? '—'}</span></div>
            <div className="adm-kv-row"><span className="adm-kv-label">PAN</span><span className="adm-kv-val"><code className="adm-code">{client?.pan ?? '—'}</code></span></div>
          </div>
        </section>
      )}

      {/* Modals */}
      {reuploadDoc && <ReuploadModal docId={reuploadDoc.id} docName={reuploadDoc.name} serviceId={id!} onClose={() => setReuploadDoc(null)} />}
      {showBatchReupload && <BatchReuploadModal docIds={validSelected} serviceId={id!} onClose={() => setShowBatchReupload(false)} onDone={() => setSelectedDocs(new Set())} />}
      {showAssign && <AssignTexpertModal serviceId={id!} onClose={() => setShowAssign(false)} />}
    </div>
  );
}
