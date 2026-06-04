import { useState } from "react";
import type { ReactNode } from "react";
import Loader from "../../../components/ui/Loader";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";
import MilestoneBar from "../../../components/dashboard/MilestoneBar";
import StaffWorkflowControls from "../../../components/staff/StaffWorkflowControls";
import BinButton from "../../../components/ui/BinButton";
import PayButton from "../../../components/ui/PayButton";
import DownloadButton from "../../../components/ui/DownloadButton";
import UploadButton from "../../../components/ui/UploadButton";

type ServiceStatus = "pending" | "documents_required" | "under_review" | "in_progress" | "action_required" | "payment" | "completed" | "cancelled";

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Documents Required",
  documents_received: "Documents Received",
  under_review: "Under Review",
  in_progress: "In Progress",
  action_required: "Action Required",
  payment: "Payment",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

// Internal event types — never shown to clients
const INTERNAL_EVENTS = new Set([
  'texpert_note', 'pinned_updated', 'task_added',
  'payout_recorded', 'assignment_changed',
]);

function isInternalEvent(event: any): boolean {
  if (INTERNAL_EVENTS.has(event.event_type)) return true;
  if (event.metadata?.is_internal) return true;
  return false;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Premium icon set (no emojis / bare arrow glyphs) ──────────
const P: Record<string, ReactNode> = {
  check:     <path d="M20 6 9 17l-5-5" />,
  clock:     <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  x:         <path d="M18 6 6 18M6 6l12 12" />,
  alert:     <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></>,
  file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  fileCheck: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9.5 14.5 2 2 3.5-3.5" /></>,
  upload:    <><path d="M12 15V3M8 7l4-4 4 4" /><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /></>,
  download:  <><path d="M12 3v12M8 11l4 4 4-4" /><path d="M3 21h18" /></>,
  plus:      <path d="M12 5v14M5 12h14" />,
  refresh:   <><path d="M21 8a9 9 0 0 0-15-3.7L3 7" /><path d="M3 3v4h4" /><path d="M3 16a9 9 0 0 0 15 3.7L21 17" /><path d="M21 21v-4h-4" /></>,
  trash:     <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
  card:      <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></>,
  flag:      <path d="M4 22V4h13l-2 4 2 4H4" />,
  spark:     <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1" />,
  checklist: <><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="m8 11 2 2 4-4M8 16h6" /></>,
  layers:    <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /></>,
  pause:     <path d="M9 5v14M15 5v14" />,
  inbox:     <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" /></>,
};
function Svg({ k, sw = 1.8 }: { k: string; sw?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{P[k]}</svg>;
}

// Document status → premium icon + tone + label
const DOC_META: Record<string, { key: string; tone: string; label: string }> = {
  approved:     { key: "check", tone: "green", label: "Approved" },
  uploaded:     { key: "file",  tone: "ink",   label: "Uploaded" },
  under_review: { key: "eye",   tone: "amber", label: "Under review" },
  rejected:     { key: "x",     tone: "red",   label: "Rejected" },
  expired:      { key: "alert", tone: "amber", label: "Expired" },
  pending:      { key: "clock", tone: "faint", label: "Awaiting upload" },
};

// Activity event → premium icon + tone + label
const EVENT_META: Record<string, { label: string; key: string; tone: string }> = {
  document_approved:           { label: "Document approved",         key: "check",   tone: "green" },
  document_rejected:           { label: "Document rejected",         key: "x",       tone: "red" },
  document_uploaded:           { label: "Document uploaded",         key: "upload",  tone: "accent" },
  document_reupload_requested: { label: "Re-upload requested",       key: "refresh", tone: "amber" },
  optional_document_added:     { label: "Document slot added",       key: "plus",    tone: "ink" },
  status_changed:              { label: "Status updated",            key: "flag",    tone: "ink" },
  deletion_requested:          { label: "Deletion requested",        key: "trash",   tone: "red" },
  deletion_rejected:           { label: "Deletion request rejected", key: "x",       tone: "ink" },
  deletion_request_cancelled:  { label: "Deletion cancelled",        key: "x",       tone: "ink" },
  payment_received:            { label: "Payment received",          key: "card",    tone: "green" },
  service_created:             { label: "Service created",           key: "spark",   tone: "accent" },
};

function taskState(status: string): "done" | "active" | "blocked" | "pending" {
  if (status === "done") return "done";
  if (status === "in_progress") return "active";
  if (status === "blocked") return "blocked";
  return "pending";
}
const TASK_LABEL: Record<string, string> = { done: "Done", active: "In progress", blocked: "Blocked", pending: "Pending" };

// ── Output doc view (fetches fresh signed URL) ────────────────────────────────
function OutputDocViewButton({ docId }: { docId: string }) {
  const [loading, setLoading] = useState(false);
  async function handleView() {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/documents/output/${docId}/download`);
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Could not load document');
    } finally { setLoading(false); }
  }
  return <DownloadButton onClick={handleView} loading={loading} />;
}

// ── Staff doc approve/reject ───────────────────────────────────────────────────
function StaffDocActions({ docId, status, onDone }: { docId: string; status: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (status !== "uploaded") return null;

  async function handleVerify() {
    setBusy(true); setErr(null);
    try {
      await apiClient.patch(`/documents/${docId}/verify`, { action: "approve" });
      onDone();
    } catch (e: any) { setErr(e.response?.data?.error ?? "Failed"); } finally { setBusy(false); }
  }

  async function handleReject() {
    const notes = window.prompt("Enter rejection reason:");
    if (!notes) return;
    setBusy(true); setErr(null);
    try {
      await apiClient.post(`/documents/${docId}/reject`, { notes });
      onDone();
    } catch (e: any) {
      setErr(e.response?.data?.error ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="cl-verify-actions">
      {err && <span style={{ fontSize: "0.75rem", color: "var(--red-600)" }}>{err}</span>}
      <button onClick={handleVerify} disabled={busy} className="cl-verify-btn">Approve</button>
      <button onClick={handleReject} disabled={busy} className="cl-reject-btn">Reject</button>
    </div>
  );
}

// ── Inline doc upload (mirrors VaultPage ChecklistUploadButton) ──────────────
function DocUploadButton({ doc, clientServiceId, onUploaded }: {
  doc: any; clientServiceId: string; onUploaded: () => void;
}) {
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("serviceId", clientServiceId);
    form.append("documentName", doc.document_name);
    if (doc.id) form.append("documentId", doc.id);
    form.append("documentType", doc.document_name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase());
    await apiClient.post("/vault/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    onUploaded();
  }
  const label = doc.status === "rejected" || doc.status === "expired" ? "Re-upload" : "Upload";
  return <UploadButton label={label} upload={upload} />;
}

// ── Remove Service — header button + modal ────────────────────────────────────
function RemoveServiceButton({ clientServiceId, hasTexpert, deletionRequested }: {
  clientServiceId: string;
  hasTexpert: boolean;
  deletionRequested: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Approval is required once a Taxpert is assigned (they own the work).
  // While no Taxpert is assigned, the client removes the service directly — even with docs.
  const needsApproval = hasTexpert;

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (needsApproval) {
        await apiClient.post(`/client-services/${clientServiceId}/request-deletion`);
      } else {
        await apiClient.delete(`/client-services/${clientServiceId}`);
      }
    },
    onSuccess: () => {
      if (needsApproval) {
        qc.invalidateQueries({ queryKey: ["client-service", clientServiceId] });
        setOpen(false);
      } else {
        qc.invalidateQueries({ queryKey: ["client-services"] });
        navigate("/client/services");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.post(`/client-services/${clientServiceId}/cancel-deletion`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-service", clientServiceId] }),
  });

  // Deletion already requested — show amber badge + cancel link
  if (deletionRequested) {
    return (
      <div className="cl-deletion-badge">
        <span className="cl-deletion-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <line x1="5" y1="2" x2="19" y2="2"/><line x1="5" y1="22" x2="19" y2="22"/>
            <path d="M17 2v4.172a2 2 0 0 1-.586 1.414L12 12"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12"/>
            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12"/><path d="M7 22v-4.172a2 2 0 0 1 .586-1.414L12 12"/>
          </svg>
          Deletion pending
        </span>
        <button
          className="cl-deletion-cancel-link"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? (
            "Cancelling…"
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancel request
            </>
          )}
        </button>
        {cancelMutation.isError && (
          <span className="cl-deletion-err">
            {(cancelMutation.error as any)?.response?.data?.error ?? "Failed"}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <BinButton onClick={() => setOpen(true)} title="Remove service" />

      {open && (
        <div className="cl-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <span className="cl-modal-title">Remove this service?</span>
              <button className="cl-modal-close" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="cl-modal-body">
              {needsApproval ? (
                <p>A Taxpert is assigned to this service. A <strong>deletion request</strong> will be sent to your Taxpert (or an admin) for review and approval. You can cancel the request at any time before it's processed.</p>
              ) : (
                <p>This service will be <strong>permanently removed</strong> immediately. This cannot be undone.</p>
              )}
              {removeMutation.isError && (
                <p style={{ color: "var(--red-600)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  {(removeMutation.error as any)?.response?.data?.error ?? "Something went wrong"}
                </p>
              )}
            </div>
            <div className="cl-modal-footer">
              <button
                className="cl-modal-danger-btn"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending
                  ? "Processing…"
                  : needsApproval ? "Request Deletion" : "Remove Now"}
              </button>
              <button className="cl-modal-cancel-btn" onClick={() => setOpen(false)} disabled={removeMutation.isPending}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Optional document row ─────────────────────────────────────────────────────
function OptionalTemplateRow({ template, clientServiceId, onAdded }: {
  template: { id: string; name: string; description?: string };
  clientServiceId: string;
  onAdded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAdd() {
    setBusy(true); setErr(null);
    try {
      await apiClient.post("/documents/add-optional", { clientServiceId, templateId: template.id });
      onAdded();
    } catch (e: any) {
      setErr(e.response?.data?.error ?? "Failed to add");
    } finally { setBusy(false); }
  }

  return (
    <div className="sv-opt">
      <div className="sv-opt-body">
        <span className="sv-opt-name">{template.name}</span>
        {template.description && <span className="sv-opt-desc">{template.description}</span>}
      </div>
      <div className="sv-opt-action">
        {err && <span className="sv-opt-err">{err}</span>}
        <button onClick={handleAdd} disabled={busy} className="sv-btn sv-btn--ghost">
          {busy ? "Adding…" : <><Svg k="plus" sw={2} /> Add</>}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ServiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

  const isStaff  = profile?.role !== "client" && profile?.role !== undefined;
  const isClient = !isStaff;

  const { data: cs, error, isLoading } = useQuery({
    queryKey: ["client-service", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/client-services/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const { data: workspace } = useQuery({
    queryKey: ["service-workspace", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/operations/workspace/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const { data: vaultData } = useQuery({
    queryKey: ["vault-service", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vault/service/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  function refreshService() {
    qc.invalidateQueries({ queryKey: ["client-service", id] });
    qc.invalidateQueries({ queryKey: ["service-workspace", id] });
    qc.invalidateQueries({ queryKey: ["vault-service", id] });
  }

  if (isLoading) return <div className="page-loader"><Loader /></div>;
  if (error || !cs) {
    return (
      <div className="cl-shell">
        <Link to="/client/services" className="db-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to services
        </Link>
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--red-600)" }}>
          <p style={{ marginBottom: "1rem" }}>Could not load service details.</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const docs    = cs.client_documents ?? [];
  const total   = docs.length;
  const done    = docs.filter((d: any) => d.status === "approved" || d.status === "uploaded").length;
  const approved = docs.filter((d: any) => d.status === "approved").length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const status  = cs.status as ServiceStatus;

  const workspaceTasks    = workspace?.tasks    ?? [];
  const workspaceEvents   = workspace?.events   ?? [];

  const openTasks   = workspaceTasks.filter((t: any) => t.status !== "done" && t.status !== "cancelled");

  // Filter internal events — client only sees public-facing events
  const clientEvents = isClient
    ? workspaceEvents.filter((e: any) => !isInternalEvent(e))
    : workspaceEvents;

  const allTemplates: any[] = vaultData?.templates ?? [];
  const optionalTemplates = allTemplates.filter(
    (t: any) => !t.required && !docs.some((d: any) => d.template_id === t.id)
  );

  return (
    <div className="cl-shell">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="cl-header-row">
        <Link to="/client/services" className="db-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to services
        </Link>
        {isClient && (
          <RemoveServiceButton
            clientServiceId={cs.id}
            hasTexpert={!!cs.assigned_texpert_id}
            deletionRequested={!!cs.deletion_requested}
          />
        )}
      </div>

      <div className="cl-header">
        <div>
          <span className="cl-category">{cs.service?.category}</span>
          <h1 className="cl-service-name">{cs.service?.name}</h1>
          {cs.status_updated_at && (
            <span className="cl-last-updated">Last updated {formatDate(cs.status_updated_at)}</span>
          )}
        </div>
        <span className={`cl-overall-status cl-status-${status}`}>
          {SERVICE_STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Milestone bar */}
      <MilestoneBar status={status} />

      {/* Staff workflow controls */}
      {isStaff && (
        <StaffWorkflowControls
          clientServiceId={cs.id}
          clientUserId={cs.user_id}
          status={status}
          paymentStatus={cs.payment_status}
          deletionRequested={cs.deletion_requested}
        />
      )}

      {/* Pay Now banner */}
      {isClient && status === "payment" && cs.payment_status !== "paid" && (
        <div className="cl-pay-now-banner">
          <div className="cl-pay-now-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <div>
              <div className="cl-pay-now-title">Payment due</div>
              <div className="cl-pay-now-sub">Your service is ready. Complete payment to finalise.</div>
            </div>
          </div>
          {cs.service?.slug && (
            <PayButton to={`/client/invoices/${cs.id}`} label="Pay now" />
          )}
        </div>
      )}

      {/* Vault CTA banner */}
      {isClient && docs.some((d: any) => d.status === "pending" || d.status === "rejected") && (
        <Link to={`/client/vault?fy=${cs.fiscal_year ?? ""}&svc=${cs.id}`} className="cl-vault-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Upload your documents in the <strong>Tax Vault</strong> to proceed</span>
          <span className="cl-vault-banner-arrow">→</span>
        </Link>
      )}

      {/* Pinned message from texpert */}
      {isClient && cs.pinned_message && (
        <div className="cl-pinned-message">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--gold-600)' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <div className="cl-pinned-label">Message from your Taxpert</div>
            <div className="cl-pinned-text">{cs.pinned_message}</div>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="cl-tab-bar">
        <button
          className={`cl-tab${activeTab === 'overview' ? ' cl-tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`cl-tab${activeTab === 'activity' ? ' cl-tab-active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
          {clientEvents.length > 0 && <span className="cl-tab-count">{clientEvents.length}</span>}
        </button>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="sv-overview">

          {/* Workspace tasks */}
          {workspace && workspaceTasks.length > 0 && (
            <section className="sv-panel">
              <div className="sv-panel-head">
                <span className="sv-panel-title"><span className="sv-panel-title-ico"><Svg k="checklist" /></span>Workspace tasks</span>
                <span className="sv-panel-meta">{workspaceTasks.filter((t: any) => t.status === "done").length} / {workspaceTasks.length} done</span>
              </div>
              <ol className="sv-tasks">
                {workspaceTasks.map((task: any) => {
                  const st = taskState(task.status);
                  return (
                    <li key={task.id} className={`sv-task is-${st}`}>
                      <span className="sv-task-ico">
                        {st === "done" ? <Svg k="check" sw={2.4} />
                          : st === "blocked" ? <Svg k="pause" sw={2} />
                          : st === "active" ? <span className="sv-pulse" />
                          : <span className="sv-hollow" />}
                      </span>
                      <div className="sv-task-body">
                        <div className="sv-task-title">{task.title}</div>
                        {task.description && <div className="sv-task-desc">{task.description}</div>}
                      </div>
                      <span className="sv-task-state">{TASK_LABEL[st]}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Documents */}
          {total > 0 && (
            <section className="sv-panel">
              <div className="sv-panel-head">
                <span className="sv-panel-title"><span className="sv-panel-title-ico"><Svg k="layers" /></span>Documents</span>
                <span className="sv-panel-meta">{done}/{total} uploaded · {approved} approved</span>
              </div>

              <div className="sv-docs-progress">
                <div className="sv-ring">
                  <svg viewBox="0 0 76 76">
                    <defs>
                      <linearGradient id="svGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#e85220" />
                        <stop offset="100%" stopColor="#cf440f" />
                      </linearGradient>
                    </defs>
                    <circle className="sv-ring-track" cx="38" cy="38" r="33" />
                    <circle className="sv-ring-prog" cx="38" cy="38" r="33"
                      strokeDasharray={2 * Math.PI * 33}
                      strokeDashoffset={2 * Math.PI * 33 * (1 - pct / 100)} />
                  </svg>
                  <span className="sv-ring-num">{pct}%</span>
                </div>
                <div className="sv-docs-summary">
                  <div className="sv-stat"><span className="sv-stat-num">{docs.filter((d: any) => ["pending", "rejected", "expired"].includes(d.status)).length}</span><span className="sv-stat-label">Pending</span></div>
                  <div className="sv-stat"><span className="sv-stat-num">{docs.filter((d: any) => ["uploaded", "under_review"].includes(d.status)).length}</span><span className="sv-stat-label">In review</span></div>
                  <div className="sv-stat"><span className="sv-stat-num">{approved}</span><span className="sv-stat-label">Approved</span></div>
                </div>
              </div>

              <div className="sv-doclist">
                {docs.map((doc: any) => {
                  const m = DOC_META[doc.status] ?? DOC_META.pending;
                  return (
                    <div key={doc.id} className="sv-doc">
                      <span className={`sv-doc-ico sv-ico--${m.tone}`}><Svg k={m.key} sw={m.key === "check" ? 2.4 : 1.8} /></span>
                      <div className="sv-doc-body">
                        <div className="sv-doc-name">{doc.document_name}</div>
                        <div className="sv-doc-status">{m.label}</div>
                        {doc.notes && doc.status === "rejected" && <div className="sv-doc-note">Reason: {doc.notes}</div>}
                        {doc.reupload_requested && doc.reupload_note && <div className="sv-doc-note sv-doc-note--amber">Re-upload requested: {doc.reupload_note}</div>}
                      </div>
                      <div className="sv-doc-right">
                        {(doc.status === "uploaded" || doc.status === "approved") && doc.file_path && (
                          <span className="sv-doc-uploaded"><Svg k="check" sw={2.4} /> File uploaded</span>
                        )}
                        {isClient && (doc.status === "pending" || doc.status === "rejected" || doc.status === "expired") && (
                          <DocUploadButton doc={doc} clientServiceId={cs.id} onUploaded={refreshService} />
                        )}
                        {isStaff && <StaffDocActions docId={doc.id} status={doc.status} onDone={refreshService} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Optional documents */}
          {isClient && optionalTemplates.length > 0 && (
            <section className="sv-panel">
              <div className="sv-panel-head">
                <span className="sv-panel-title"><span className="sv-panel-title-ico"><Svg k="plus" /></span>Optional documents</span>
                <span className="sv-panel-meta">Add if applicable</span>
              </div>
              <div className="sv-optlist">
                {optionalTemplates.map((t: any) => (
                  <OptionalTemplateRow key={t.id} template={t} clientServiceId={cs.id} onAdded={refreshService} />
                ))}
              </div>
            </section>
          )}

          {/* Output documents from Taxpert */}
          {(cs.output_documents ?? []).length > 0 && (
            <section className="sv-panel sv-panel--out">
              <div className="sv-panel-head">
                <span className="sv-panel-title"><span className="sv-panel-title-ico sv-ico--green"><Svg k="inbox" /></span>Documents from your Taxpert</span>
                <span className="sv-panel-meta">{(cs.output_documents ?? []).length} file{(cs.output_documents ?? []).length !== 1 ? "s" : ""}</span>
              </div>
              <div className="sv-doclist">
                {(cs.output_documents ?? []).map((doc: any) => (
                  <div key={doc.id} className="sv-doc">
                    <span className="sv-doc-ico sv-ico--green"><Svg k="fileCheck" /></span>
                    <div className="sv-doc-body">
                      <div className="sv-doc-name">{doc.document_name}</div>
                      {doc.description && <div className="sv-doc-status">{doc.description}</div>}
                      {doc.uploaded_at && <div className="sv-doc-status">Ready {formatDate(doc.uploaded_at)}</div>}
                    </div>
                    <div className="sv-doc-right">
                      {doc.signed_url ? (
                        <DownloadButton href={doc.signed_url} />
                      ) : (
                        <OutputDocViewButton docId={doc.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Activity Tab ──────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="sv-activity">
          {clientEvents.length === 0 ? (
            <div className="sv-empty">
              <span className="sv-empty-ico"><Svg k="clock" sw={1.5} /></span>
              <p>No activity recorded yet for this service.</p>
            </div>
          ) : (
            <div className="sv-feed">
              {clientEvents.map((event: any) => {
                const m = EVENT_META[event.event_type] ?? { label: event.event_type.replace(/_/g, " "), key: "flag", tone: "ink" };
                return (
                  <div key={event.id} className="sv-event">
                    <span className={`sv-event-ico sv-ico--${m.tone}`}><Svg k={m.key} sw={m.key === "check" ? 2.4 : 1.8} /></span>
                    <div className="sv-event-body">
                      <div className="sv-event-msg">{event.message}</div>
                      <div className="sv-event-meta">
                        <span className="sv-event-type">{m.label}</span>
                        <span className="sv-event-sep" />
                        <span className="sv-event-time">{formatDate(event.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {openTasks.length > 0 && isStaff && (
            <div style={{ marginTop: "20px" }}>
              <Link to="/work-queue" className="sv-btn sv-btn--ghost">Review open tasks</Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
