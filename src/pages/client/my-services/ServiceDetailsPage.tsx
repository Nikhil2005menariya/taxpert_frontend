import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";
import MilestoneBar from "../../../components/dashboard/MilestoneBar";
import StaffWorkflowControls from "../../../components/staff/StaffWorkflowControls";

type ServiceStatus = "pending" | "documents_required" | "under_review" | "in_progress" | "action_required" | "invoice_pending" | "completed" | "cancelled";

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Documents Required",
  under_review: "Under Review",
  in_progress: "In Progress",
  action_required: "Action Required",
  invoice_pending: "Invoice Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  uploaded: "Uploaded",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatEventType(eventType: string): string {
  const map: Record<string, string> = {
    document_approved:        "Document approved",
    document_rejected:        "Document rejected",
    document_uploaded:        "Document uploaded",
    status_changed:           "Status updated",
    note_added:               "Note added",
    reminder_sent:            "Reminder sent",
    payment_received:         "Payment received",
    service_created:          "Service created",
    deletion_requested:       "Deletion requested",
    deletion_rejected:        "Deletion request rejected",
    deletion_request_cancelled: "Deletion request cancelled",
    task_completed:           "Task completed",
    assignment_changed:       "Expert assigned",
  };
  return map[eventType] ?? eventType.replace(/_/g, " ");
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <span className="cl-status-icon cl-verified">✓</span>;
  if (status === "under_review") return <span className="cl-status-icon cl-uploaded">↺</span>;
  if (status === "uploaded") return <span className="cl-status-icon cl-uploaded">↑</span>;
  if (status === "rejected") return <span className="cl-status-icon cl-rejected">✕</span>;
  if (status === "expired") return <span className="cl-status-icon cl-rejected">!</span>;
  return <span className="cl-status-icon cl-pending">⏳</span>;
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

// ── Document row actions for staff ────────────────────────────────────────────
function StaffDocActions({ docId, status, onDone }: { docId: string; status: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (status !== "uploaded") return null;

  async function handleVerify() {
    setBusy(true); setErr(null);
    try {
      await apiClient.post(`/documents/${docId}/verify`);
      onDone();
    } catch (e: any) {
      setErr(e.response?.data?.error ?? "Failed");
    } finally { setBusy(false); }
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

// ── Remove Service ────────────────────────────────────────────────────────────
function RemoveServiceButton({ clientServiceId, hasDocuments, deletionRequested }: {
  clientServiceId: string;
  hasDocuments: boolean;
  deletionRequested: boolean;
}) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  async function handleRemove() {
    setLoading(true); setError(null);
    try {
      if (hasDocuments) {
        await apiClient.post(`/client-services/${clientServiceId}/request-deletion`);
        setConfirm(false);
        qc.invalidateQueries({ queryKey: ["client-service", clientServiceId] });
      } else {
        await apiClient.delete(`/client-services/${clientServiceId}`);
        navigate("/my-services");
      }
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Failed to process request");
    } finally { setLoading(false); }
  }

  async function handleCancelRequest() {
    setLoading(true); setError(null);
    try {
      await apiClient.post(`/client-services/${clientServiceId}/cancel-deletion`);
      qc.invalidateQueries({ queryKey: ["client-service", clientServiceId] });
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Failed");
    } finally { setLoading(false); }
  }

  if (deletionRequested) {
    return (
      <div className="cl-remove-requested">
        <span className="cl-remove-badge">⏳ Deletion requested — awaiting staff review</span>
        <button className="cl-remove-cancel-btn" onClick={handleCancelRequest} disabled={loading}>
          {loading ? "Cancelling…" : "Cancel Request"}
        </button>
        {error && <p className="cl-remove-error">{error}</p>}
      </div>
    );
  }

  if (!confirm) {
    return (
      <button className="cl-remove-trigger" onClick={() => setConfirm(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Remove Service
      </button>
    );
  }

  return (
    <div className="cl-remove-confirm">
      <p className="cl-remove-confirm-text">
        {hasDocuments
          ? "This service has documents. A deletion request will be sent to your Taxpert for approval."
          : "This service has no documents. It will be permanently removed."}
      </p>
      {error && <p className="cl-remove-error">{error}</p>}
      <div className="cl-remove-confirm-actions">
        <button className="cl-remove-confirm-btn" onClick={handleRemove} disabled={loading}>
          {loading ? "Processing…" : hasDocuments ? "Request Deletion" : "Remove Now"}
        </button>
        <button className="cl-remove-cancel" onClick={() => { setConfirm(false); setError(null); }} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
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
    <div className="cl-optional-row">
      <div>
        <span className="cl-optional-name">{template.name}</span>
        {template.description && <span className="cl-doc-status-text" style={{ marginLeft: "0.5rem" }}>{template.description}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {err && <span style={{ fontSize: "0.75rem", color: "var(--red-600)" }}>{err}</span>}
        <button onClick={handleAdd} disabled={busy} className="cl-add-optional-btn">
          {busy ? "Adding…" : "+ Add"}
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

  const isStaff = profile?.role !== "client" && profile?.role !== undefined;
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

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (error || !cs) {
    return (
      <div className="cl-shell">
        <Link to="/my-services" className="db-back-link">
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

  const docs = cs.client_documents ?? [];
  const total    = docs.length;
  const done     = docs.filter((d: any) => d.status === "approved" || d.status === "uploaded").length;
  const approved = docs.filter((d: any) => d.status === "approved").length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const status   = cs.status as ServiceStatus;

  const workspaceTasks   = workspace?.tasks ?? [];
  const workspaceEvents  = workspace?.events ?? [];
  const workspaceDueDates = workspace?.dueDates ?? [];

  const openTasks = workspaceTasks.filter((t: any) => t.status !== "done" && t.status !== "cancelled");
  const nextDueDates = workspaceDueDates.filter((d: any) => d.status === "open").slice(0, 4);
  const recentEvents = workspaceEvents.slice(0, 6);

  // Optional templates: not required, not already added
  const allTemplates: any[] = vaultData?.templates ?? [];
  const optionalTemplates = allTemplates.filter(
    (t: any) => !t.required && !docs.some((d: any) => d.template_id === t.id)
  );

  return (
    <div className="cl-shell">
      <Link to="/my-services" className="db-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back to services
      </Link>

      {/* Header */}
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
      {isClient && status === "invoice_pending" && cs.payment_status !== "paid" && (
        <div className="cl-pay-now-banner">
          <div className="cl-pay-now-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <div>
              <div className="cl-pay-now-title">Invoice pending</div>
              <div className="cl-pay-now-sub">Your service is ready. Complete payment to finalise.</div>
            </div>
          </div>
          {cs.service?.slug && (
            <Link to={`/invoices/${cs.id}`} className="btn btn-primary cl-pay-now-btn">Pay Now →</Link>
          )}
        </div>
      )}

      {/* Vault CTA banner */}
      {isClient && docs.some((d: any) => d.status === "pending" || d.status === "rejected") && (
        <Link to={`/vault?fy=${cs.fiscal_year ?? ""}&svc=${cs.id}`} className="cl-vault-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Upload your documents in the <strong>Tax Vault</strong> to proceed</span>
          <span className="cl-vault-banner-arrow">→</span>
        </Link>
      )}

      {/* Workspace: tasks + due dates */}
      {workspace && (
        <div className="cl-workspace-grid">
          <div className="cl-progress-card">
            <div className="cl-progress-top">
              <span className="cl-progress-label">Workspace tasks</span>
              <span className="cl-progress-fraction">
                {workspaceTasks.filter((t: any) => t.status === "done").length} of {workspaceTasks.length} completed
              </span>
            </div>
            {workspaceTasks.length === 0 ? (
              <div className="cl-workspace-empty">No structured tasks have been generated yet.</div>
            ) : (
              <div className="cl-workspace-stack">
                {workspaceTasks.map((task: any) => (
                  <div key={task.id} className="cl-workspace-item">
                    <div>
                      <div className="cl-doc-name">{task.title}</div>
                      {task.description && <div className="cl-doc-status-text">{task.description}</div>}
                    </div>
                    <span className={`cl-overall-status cl-status-${task.status === "done" ? "completed" : task.status === "blocked" ? "on_hold" : "in_progress"}`}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cl-progress-card">
            <div className="cl-progress-top">
              <span className="cl-progress-label">Service due dates</span>
              <span className="cl-progress-fraction">{nextDueDates.length} upcoming</span>
            </div>
            {nextDueDates.length === 0 ? (
              <div className="cl-workspace-empty">No service deadlines are currently scheduled.</div>
            ) : (
              <div className="cl-workspace-stack">
                {nextDueDates.map((dd: any) => (
                  <div key={dd.id} className="cl-workspace-item">
                    <div>
                      <div className="cl-doc-name">{dd.title}</div>
                      {dd.description && <div className="cl-doc-status-text">{dd.description}</div>}
                    </div>
                    <span className="cl-doc-status-text">{formatDate(dd.due_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document progress */}
      {total > 0 && (
        <div className="cl-progress-card">
          <div className="cl-progress-top">
            <span className="cl-progress-label">Document checklist</span>
            <span className="cl-progress-fraction">{done} of {total} uploaded · {approved} approved</span>
          </div>
          <div className="cl-progress-track">
            <div className="cl-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--green-600)" : "var(--gold-500)" }} />
          </div>
          <div className="cl-progress-steps">
            {[
              { label: "Pending",  count: docs.filter((d: any) => d.status === "pending" || d.status === "rejected" || d.status === "expired").length },
              { label: "Uploaded", count: docs.filter((d: any) => d.status === "uploaded" || d.status === "under_review").length },
              { label: "Approved", count: approved },
            ].map(s => (
              <div key={s.label} className="cl-progress-step">
                <span className="cl-step-count">{s.count}</span>
                <span className="cl-step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="cl-doc-list">
        <div className="cl-doc-list-header">
          <span className="cl-doc-list-title">Required documents</span>
          <span className="cl-doc-count">{total} items</span>
        </div>

        {docs.map((doc: any) => (
          <div key={doc.id} className={`cl-doc-row cl-doc-${doc.status}`}>
            <div className="cl-doc-left">
              <StatusIcon status={doc.status} />
              <div className="cl-doc-info">
                <div className="cl-doc-name">{doc.document_name}</div>
                <div className="cl-doc-status-text">{DOCUMENT_STATUS_LABELS[doc.status]}</div>
                {doc.notes && doc.status === "rejected" && (
                  <div className="cl-doc-rejection-note">Note: {doc.notes}</div>
                )}
              </div>
            </div>
            <div className="cl-doc-right">
              {(doc.status === "uploaded" || doc.status === "approved") && doc.file_path && (
                <div className="cl-uploaded-name">
                  <IconFile />
                  <span>File uploaded</span>
                </div>
              )}
              {/* Client actions */}
              {isClient && (doc.status === "pending" || doc.status === "rejected" || doc.status === "expired") && (
                <Link
                  to={`/vault?fy=${cs.fiscal_year ?? ""}&svc=${cs.id}`}
                  className="cl-upload-btn"
                >
                  {doc.status === "rejected" || doc.status === "expired" ? "Re-upload in Vault →" : "Upload in Vault →"}
                </Link>
              )}
              {/* Staff actions */}
              {isStaff && (
                <StaffDocActions docId={doc.id} status={doc.status} onDone={refreshService} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Optional / conditional documents */}
      {isClient && optionalTemplates.length > 0 && (
        <div className="cl-optional-section">
          <div className="cl-optional-header">
            <span className="cl-optional-title">Optional / conditional documents</span>
            <span className="cl-optional-sub">Add if applicable to your situation</span>
          </div>
          {optionalTemplates.map((t: any) => (
            <OptionalTemplateRow
              key={t.id}
              template={t}
              clientServiceId={cs.id}
              onAdded={refreshService}
            />
          ))}
        </div>
      )}

      {/* Remove Service (client only) */}
      {isClient && (
        <RemoveServiceButton
          clientServiceId={cs.id}
          hasDocuments={docs.length > 0}
          deletionRequested={!!cs.deletion_requested}
        />
      )}

      {/* Staff notes */}
      {cs.notes && (
        <div className="cl-staff-note">
          <span className="cl-staff-note-label">Taxpert note</span>
          <p>{cs.notes}</p>
        </div>
      )}

      {/* Activity timeline */}
      {workspace && (
        <div className="cl-progress-card">
          <div className="cl-progress-top">
            <span className="cl-progress-label">Activity timeline</span>
            <span className="cl-progress-fraction">Recent activity</span>
          </div>
          {recentEvents.length === 0 ? (
            <div className="cl-workspace-empty">No service events have been recorded yet.</div>
          ) : (
            <div className="cl-workspace-stack">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="cl-workspace-item">
                  <div>
                    <div className="cl-doc-name">{event.message}</div>
                    <div className="cl-doc-status-text">{formatEventType(String(event.event_type))}</div>
                  </div>
                  <span className="cl-doc-status-text">{formatDate(event.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          {openTasks.length > 0 && isStaff && (
            <div className="cl-workspace-footer">
              <Link to="/work-queue" className="btn btn-secondary">Review open tasks</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
