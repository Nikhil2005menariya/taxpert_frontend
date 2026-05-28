import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../api/client";

// Fetches a signed URL from the backend then opens it in a new tab.
// Direct links to /api/documents/:id/download don't work because the browser
// sends no Authorization header.
function ViewDocButton({ documentId, isCommon = false }: { documentId: string; isCommon?: boolean }) {
  const [loading, setLoading] = useState(false);
  async function handleView() {
    setLoading(true);
    try {
      const path = isCommon
        ? `/common-documents/${documentId}/download`
        : `/documents/${documentId}/download`;
      const { data } = await apiClient.get(path);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Could not load document");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button onClick={handleView} disabled={loading} className="vault-view-link">
      {loading ? "…" : "View"}
    </button>
  );
}

const SERVICE_STATUS_SHORT_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Docs Needed",
  under_review: "Reviewing",
  in_progress: "In Progress",
  action_required: "Action Needed",
  completed: "Done",
  cancelled: "Cancelled",
};

const SERVICE_STATUS_STYLES: Record<string, { fg: string; bg: string }> = {
  pending:            { fg: "#b45309", bg: "#fef3c7" },
  documents_required: { fg: "#b45309", bg: "#fef3c7" },
  under_review:       { fg: "#1d4ed8", bg: "#dbeafe" },
  in_progress:        { fg: "#1d4ed8", bg: "#dbeafe" },
  action_required:    { fg: "#be123c", bg: "#ffe4e6" },
  completed:          { fg: "#15803d", bg: "#dcfce7" },
  cancelled:          { fg: "#6b7280", bg: "#f3f4f6" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}

function isCommonDocAvailable(templateName: string, commonDocs: any[]): boolean {
  const tn = normalize(templateName);
  return commonDocs.some(cd => {
    const cdType = normalize(cd.documentType);
    const cdName = normalize(cd.documentName);
    return tn === cdName || tn.includes(cdType) || cdType.includes(tn) ||
      (tn.length >= 3 && cdName.startsWith(tn.slice(0, Math.floor(tn.length * 0.75))));
  });
}

// ── Icons ─────────────────────────────────────────────────────

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill={open ? "var(--gold-500)" : "none"}
      stroke={open ? "var(--gold-600)" : "currentColor"}
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function FileIcon({ status }: { status: string }) {
  const color = status === "approved" ? "var(--green-600)"
    : status === "uploaded" || status === "under_review" ? "var(--gold-600)"
    : status === "rejected" ? "var(--danger)"
    : "var(--ink-400)";
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="vault-folder-arrow" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

// ── Upload button (single document) ───────────────────────────

function ChecklistUploadButton({
  clientServiceId, documentId, documentName, templateId, status,
  onUploaded, label
}: {
  clientServiceId: string; documentId?: string; documentName: string; templateId?: string;
  status: string; onUploaded: () => void; label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("serviceId", clientServiceId);
    form.append("documentName", documentName);
    if (documentId) form.append("documentId", documentId);
    if (templateId) form.append("templateId", templateId);
    form.append("documentType", documentName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase());

    try {
      await apiClient.post("/vault/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        className="btn btn-secondary db-btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ whiteSpace: "nowrap" }}
      >
        {uploading ? "Uploading…" : label ? label : status === "rejected" ? "Re-upload" : "Upload"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>{error}</span>}
    </div>
  );
}

// ── Vault Upload (any doc for a service) ──────────────────────

function VaultUpload({ serviceId, templates, onUploaded }: {
  serviceId: string; templates: any[]; onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customName, setCustomName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const name = selectedTemplate
      ? templates.find(t => t.id === selectedTemplate)?.name ?? customName
      : customName;
    if (!name) { setError("Choose a document type first"); return; }

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("serviceId", serviceId);
    form.append("documentName", name);
    if (selectedTemplate) form.append("templateId", selectedTemplate);
    form.append("documentType", name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase());

    try {
      await apiClient.post("/vault/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOpen(false);
      setSelectedTemplate("");
      setCustomName("");
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary db-btn-sm" onClick={() => setOpen(true)}>
        + Upload Document
      </button>
    );
  }

  return (
    <div style={{ background: "var(--ink-50)", border: "1px solid var(--line-soft)", borderRadius: "0.5rem", padding: "1rem", minWidth: "260px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Upload a document</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)", lineHeight: 1 }}>✕</button>
      </div>
      <select
        value={selectedTemplate}
        onChange={e => { setSelectedTemplate(e.target.value); setCustomName(""); }}
        className="form-input"
        style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}
      >
        <option value="">Select document type…</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.required ? " *" : ""}</option>)}
        <option value="__custom">Other (custom name)</option>
      </select>
      {selectedTemplate === "__custom" && (
        <input
          className="form-input"
          placeholder="Document name"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}
        />
      )}
      {error && <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        className="btn btn-primary"
        style={{ width: "100%", fontSize: "0.875rem" }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading || (!selectedTemplate && !customName)}
      >
        {uploading ? "Uploading…" : "Choose file & upload"}
      </button>
    </div>
  );
}

// ── Common Doc Upload ─────────────────────────────────────────

const COMMON_DOC_TYPES: Record<string, string> = {
  pan: "PAN Card",
  aadhaar: "Aadhaar",
  dsc: "DSC",
  bank_proof: "Bank Proof",
  form16: "Form 16",
  form26as: "Form 26AS",
};

function VaultCommonUpload({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!docType) { setError("Select document type first"); return; }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", docType);

    try {
      await apiClient.post("/vault/common-upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOpen(false);
      setDocType("");
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary db-btn-sm" onClick={() => setOpen(true)}>
        + Upload Common Doc
      </button>
    );
  }

  return (
    <div style={{ background: "var(--ink-50)", border: "1px solid var(--line-soft)", borderRadius: "0.5rem", padding: "1rem", minWidth: "260px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Upload common document</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)", lineHeight: 1 }}>✕</button>
      </div>
      <select
        value={docType}
        onChange={e => setDocType(e.target.value)}
        className="form-input"
        style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}
      >
        <option value="">Select document type…</option>
        {Object.entries(COMMON_DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {error && <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        className="btn btn-primary"
        style={{ width: "100%", fontSize: "0.875rem" }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !docType}
      >
        {uploading ? "Uploading…" : "Choose file & upload"}
      </button>
    </div>
  );
}

function CommonDocUpdateButton({ documentType, onUploaded }: { documentType: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);

    try {
      await apiClient.post("/vault/common-upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        className="btn btn-secondary db-btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ whiteSpace: "nowrap" }}
      >
        {uploading ? "Uploading…" : "Update"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>{error}</span>}
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────

function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--ink-400)", marginBottom: "1.5rem" }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {i > 0 && <span>/</span>}
          {item.href ? (
            <Link to={item.href} style={{ color: "var(--gold-600)", fontWeight: 500 }}>{item.label}</Link>
          ) : (
            <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ── Top-level view ────────────────────────────────────────────

function VaultTopLevel() {
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["vault-groups"],
    queryFn: async () => {
      const { data } = await apiClient.get("/vault/groups");
      return data.data ?? [];
    },
  });

  const { data: commonDocs = [], isLoading: commonLoading } = useQuery({
    queryKey: ["vault-common-docs"],
    queryFn: async () => {
      const { data } = await apiClient.get("/vault/common-documents");
      return data.data ?? [];
    },
  });

  if (groupsLoading || commonLoading) {
    return <div className="page-loader"><div className="page-loader-ring" /></div>;
  }

  const activeFY = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  })();

  return (
    <div className="db-page-new">
      <Breadcrumb items={[{ label: "Vault" }]} />
      <div className="vault-top-header">
        <div>
          <h1 className="db-page-title">Your Tax Vault</h1>
          <p className="db-page-sub">Every document, every year — organized and always accessible.</p>
        </div>
      </div>

      <div className="vault-folder-grid">
        {/* Common docs folder */}
        <Link to="/vault?common=1" className="vault-folder-card vault-folder-common">
          <div className="vault-folder-icon"><FolderIcon /></div>
          <div className="vault-folder-body">
            <div className="vault-folder-name">Common Docs</div>
            <div className="vault-folder-meta">PAN · Aadhaar · DSC · Bank Proof</div>
            <div className="vault-folder-count">
              {commonDocs.length} document{commonDocs.length !== 1 ? "s" : ""}
            </div>
          </div>
          <ChevronRight />
        </Link>

        {/* FY folders */}
        {groups.map((g: any) => {
          const isCurrent = g.fy === activeFY;
          return (
            <Link key={g.fy} to={`/vault?fy=${g.fy}`} className="vault-folder-card vault-folder-fy">
              <div className="vault-folder-icon"><FolderIcon open={isCurrent} /></div>
              <div className="vault-folder-body">
                <div className="vault-folder-name">
                  FY {g.fy}
                  {isCurrent && <span className="vault-current-badge">Current</span>}
                </div>
                <div className="vault-folder-meta">
                  {g.services.length} service{g.services.length !== 1 ? "s" : ""}
                </div>
                <div className="vault-folder-count">
                  {g.services.reduce((s: number, x: any) => s + x.docsUploaded, 0)} /
                  {g.services.reduce((s: number, x: any) => s + x.docsTotal, 0)} docs uploaded
                </div>
              </div>
              <ChevronRight />
            </Link>
          );
        })}

        {!groups.length && (
          <div className="vault-empty">
            <div className="db-empty-icon">🗄️</div>
            <p className="vault-empty-text">No services yet. Use <strong>+ Add Service</strong> in the top-right to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FY-level view ─────────────────────────────────────────────

function VaultFYView({ fy }: { fy: string }) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["vault-groups"],
    queryFn: async () => {
      const { data } = await apiClient.get("/vault/groups");
      return data.data ?? [];
    },
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;

  const fyGroup = groups.find((g: any) => g.fy === fy);

  return (
    <div className="db-page-new">
      <Breadcrumb items={[
        { label: "Vault", href: "/vault" },
        { label: `FY ${fy}` },
      ]} />
      <div className="vault-top-header">
        <div>
          <h1 className="db-page-title">FY {fy}</h1>
          <p className="db-page-sub">{fyGroup?.services.length ?? 0} service{fyGroup?.services.length !== 1 ? "s" : ""} in this financial year.</p>
        </div>
      </div>

      {!fyGroup?.services.length ? (
        <div className="vault-empty">
          <p className="vault-empty-text">No services found for FY {fy}.</p>
        </div>
      ) : (
        <div className="vault-folder-grid">
          {fyGroup.services.map((svc: any) => {
            const tone = SERVICE_STATUS_STYLES[svc.status] ?? SERVICE_STATUS_STYLES.pending;
            const pct = svc.docsTotal > 0 ? Math.round((svc.docsUploaded / svc.docsTotal) * 100) : 0;
            return (
              <Link key={svc.clientServiceId} to={`/vault?fy=${fy}&svc=${svc.clientServiceId}`} className="vault-service-card">
                <div className="vault-service-top">
                  <div>
                    <div className="vault-service-category">{svc.serviceCategory}</div>
                    <div className="vault-service-name">{svc.serviceName}</div>
                  </div>
                  <span className="vault-service-status" style={{ background: tone.bg, color: tone.fg }}>
                    {SERVICE_STATUS_SHORT_LABELS[svc.status] ?? svc.status}
                  </span>
                </div>
                <div className="vault-service-progress-wrap">
                  <div className="vault-service-progress-track">
                    <div className="vault-service-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--green-600)" : "var(--gold-500)" }} />
                  </div>
                  <span className="vault-service-progress-label">{svc.docsUploaded}/{svc.docsTotal} docs</span>
                </div>
                <ChevronRight />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Service-level view ────────────────────────────────────────

function VaultServiceView({ fy, svcId }: { fy: string; svcId: string }) {
  const qc = useQueryClient();

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ["vault-service", svcId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vault/service/${svcId}`);
      return data.data;
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["vault-service", svcId] });
    qc.invalidateQueries({ queryKey: ["vault-groups"] });
  }

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (error || !detail) {
    return (
      <div className="db-page-new">
        <Breadcrumb items={[{ label: "Vault", href: "/vault" }, { label: `FY ${fy}`, href: `/vault?fy=${fy}` }, { label: "Not found" }]} />
        <div className="vault-empty"><p className="vault-empty-text">Service not found or you don't have access.</p></div>
      </div>
    );
  }

  const docs = detail.documents ?? [];
  const templates = detail.templates ?? [];
  const commonDocs = detail.commonDocs ?? [];

  const inputDocs  = docs.filter((d: any) => d.status === "pending" || d.status === "uploaded" || d.status === "rejected" || d.status === "under_review");
  const finalDocs  = docs.filter((d: any) => d.status === "approved");

  const isTemplateCompleted = (t: any) => {
    const hasUploadedDoc = docs.some((d: any) => 
      (d.status === "uploaded" || d.status === "under_review" || d.status === "approved") &&
      (d.templateId === t.id || normalize(d.documentName) === normalize(t.name))
    );
    const inCommon = isCommonDocAvailable(t.name, commonDocs);
    return hasUploadedDoc || inCommon;
  };

  const pendingTemplates = templates.filter((t: any) => !isTemplateCompleted(t));
  const allDone = templates.length > 0 && pendingTemplates.length === 0;

  const tone = SERVICE_STATUS_STYLES[detail.status] ?? SERVICE_STATUS_STYLES.pending;

  return (
    <div className="db-page-new">
      <Breadcrumb items={[
        { label: "Vault", href: "/vault" },
        { label: `FY ${fy}`, href: `/vault?fy=${fy}` },
        { label: detail.serviceName },
      ]} />

      <div className="vault-service-header">
        <div>
          <h1 className="db-page-title">{detail.serviceName}</h1>
          <p className="db-page-sub">
            FY {detail.fy} ·{" "}
            <span style={{ background: tone.bg, color: tone.fg, padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.8rem" }}>
              {SERVICE_STATUS_SHORT_LABELS[detail.status] ?? detail.status}
            </span>
          </p>
        </div>
      </div>

      <div className="vault-service-layout">
        {/* Left: documents */}
        <div className="vault-docs-area">
          {/* Input folder */}
          <div className="vault-folder-section">
            <div className="vault-folder-section-header">
              <FolderIcon open />
              <span>Input</span>
              <span className="vault-folder-badge">{inputDocs.length}</span>
            </div>
            {inputDocs.length === 0 ? (
              <div className="vault-folder-empty">No documents uploaded yet. Upload using the button above.</div>
            ) : (
              <div className="vault-doc-list">
                {inputDocs.map((doc: any) => (
                  <div key={doc.id} className="vault-doc-row">
                    <FileIcon status={doc.status} />
                    <div className="vault-doc-info">
                      <span className="vault-doc-name">{doc.documentName}</span>
                      {doc.status === "rejected" && doc.notes && (
                        <span className="vault-doc-rejection-note">Rejected: {doc.notes}</span>
                      )}
                      {doc.uploadedAt && (
                        <span className="vault-doc-date">Uploaded {fmtDate(doc.uploadedAt)}</span>
                      )}
                    </div>
                    <span className="vault-doc-status" style={
                      doc.status === "approved" ? { color: "var(--green-600)" }
                      : doc.status === "rejected" ? { color: "var(--danger)" }
                      : doc.status === "uploaded" || doc.status === "under_review" ? { color: "var(--gold-600)" }
                      : { color: "var(--ink-400)" }
                    }>
                      {doc.status === "approved" ? "✓ Approved"
                       : doc.status === "uploaded" ? "↑ Uploaded"
                       : doc.status === "under_review" ? "Under Review"
                       : doc.status === "rejected" ? "✕ Rejected"
                       : "⏳ Pending"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {doc.fileUrl && <ViewDocButton documentId={doc.id} />}
                      {(doc.status === "pending" || doc.status === "rejected") && (
                        <ChecklistUploadButton
                          clientServiceId={detail.clientServiceId}
                          documentId={doc.id}
                          documentName={doc.documentName}
                          templateId={doc.templateId}
                          status={doc.status}
                          onUploaded={refresh}
                        />
                      )}
                      {(doc.status === "uploaded" || doc.status === "under_review" || doc.status === "approved") && (
                        <ChecklistUploadButton
                          clientServiceId={detail.clientServiceId}
                          documentId={doc.id}
                          documentName={doc.documentName}
                          templateId={doc.templateId}
                          status={doc.status}
                          onUploaded={refresh}
                          label="Update"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final folder */}
          {finalDocs.length > 0 && (
            <div className="vault-folder-section">
              <div className="vault-folder-section-header">
                <FolderIcon />
                <span>Final</span>
                <span className="vault-folder-badge">{finalDocs.length}</span>
              </div>
              <div className="vault-doc-list">
                {finalDocs.map((doc: any) => (
                  <div key={doc.id} className="vault-doc-row">
                    <FileIcon status="approved" />
                    <div className="vault-doc-info">
                      <span className="vault-doc-name">{doc.documentName}</span>
                      {doc.uploadedAt && (
                        <span className="vault-doc-date">Approved {fmtDate(doc.uploadedAt)}</span>
                      )}
                    </div>
                    <span className="vault-doc-status" style={{ color: "var(--green-600)" }}>✓ Approved</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {doc.fileUrl && <ViewDocButton documentId={doc.id} />}
                      <ChecklistUploadButton
                        clientServiceId={detail.clientServiceId}
                        documentId={doc.id}
                        documentName={doc.documentName}
                        templateId={doc.templateId}
                        status={doc.status}
                        onUploaded={refresh}
                        label="Update"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: required docs panel */}
        {templates.length > 0 && (
          <aside className="vault-required-panel">
            <div className="vault-panel-header">
              <span className="vault-panel-title">Required Documents</span>
              <span className="vault-panel-count">{templates.length - pendingTemplates.length}/{templates.length}</span>
            </div>

            {allDone ? (
              <div className="vault-panel-done">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m20 7-11 11-5-5"/>
                </svg>
                <span>All required documents are uploaded.</span>
              </div>
            ) : (
              <div className="vault-panel-progress">
                <div className="vault-panel-track">
                  <div className="vault-panel-fill" style={{
                    width: `${templates.length > 0 ? Math.round(((templates.length - pendingTemplates.length) / templates.length) * 100) : 0}%`
                  }} />
                </div>
              </div>
            )}

            <div className="vault-panel-list">
              {templates.map((t: any) => {
                const isDone = isTemplateCompleted(t);
                const inCommon = isCommonDocAvailable(t.name, commonDocs);
                return (
                  <div key={t.id} className={`vault-panel-item${isDone ? " vault-panel-item-done" : ""}`}>
                    <div className="vault-panel-check">
                      {isDone
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m20 7-11 11-5-5"/></svg>
                        : <div className="vault-panel-dot" />
                      }
                    </div>
                    <div className="vault-panel-name-wrap">
                      <span className="vault-panel-name">{t.name}</span>
                      {t.description && (
                        <span className="vault-panel-hint">{t.description}</span>
                      )}
                    </div>
                    {inCommon ? (
                      <span className="vault-panel-common-badge">In Common Docs</span>
                    ) : t.required && !isDone ? (
                      <span className="vault-panel-req">Required</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Link to={`/my-services/${detail.clientServiceId}`} className="vault-panel-link">
              View full checklist →
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── Common docs view ──────────────────────────────────────────

function VaultCommonDocsView() {
  const qc = useQueryClient();

  const { data: commonDocs = [], isLoading } = useQuery({
    queryKey: ["vault-common-docs"],
    queryFn: async () => {
      const { data } = await apiClient.get("/vault/common-documents");
      return data.data ?? [];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["vault-common-docs"] });
  }

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;

  return (
    <div className="db-page-new">
      <Breadcrumb items={[
        { label: "Vault", href: "/vault" },
        { label: "Common Docs" },
      ]} />
      <div className="vault-top-header">
        <div>
          <h1 className="db-page-title">Common Documents</h1>
          <p className="db-page-sub">PAN, Aadhaar, DSC, and Bank Proof shared across all your services.</p>
        </div>
        <VaultCommonUpload onUploaded={refresh} />
      </div>

      {!commonDocs.length ? (
        <div className="vault-empty">
          <div className="db-empty-icon">📂</div>
          <p className="vault-empty-text">No common documents uploaded yet.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: "0.5rem" }}>
            Upload PAN, Aadhaar, DSC, or Bank Proof and they will appear here.
          </p>
        </div>
      ) : (
        <div className="vault-doc-list" style={{ marginTop: "1.5rem" }}>
          {commonDocs.map((d: any) => (
            <div key={d.id} className="vault-doc-row">
              <FileIcon status="approved" />
              <div className="vault-doc-info">
                <span className="vault-doc-name">{COMMON_DOC_TYPES[d.documentType] ?? d.documentType}</span>
                {d.documentName && <span className="vault-doc-date">{d.documentName}</span>}
              </div>
              <span className="vault-doc-status" style={{ color: "var(--green-600)" }}>✓ Uploaded</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {d.fileUrl && <ViewDocButton documentId={d.id} isCommon={true} />}
                <CommonDocUpdateButton documentType={d.documentType} onUploaded={refresh} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main router ───────────────────────────────────────────────

export default function VaultPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const fy = searchParams.get("fy");
  const svc = searchParams.get("svc");
  const common = searchParams.get("common");

  // Backfill sync: on every vault page load, propagate any existing common docs
  // into pending service-doc rows so users don't see stale "Pending" states.
  useEffect(() => {
    apiClient.post("/vault/sync").then(() => {
      // Refresh all vault queries so the UI picks up the newly synced statuses
      qc.invalidateQueries({ queryKey: ["vault-service"] });
      qc.invalidateQueries({ queryKey: ["vault-groups"] });
    }).catch(() => {
      // Non-critical — silently ignore sync errors
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (common === "1") return <VaultCommonDocsView />;
  if (fy && svc)       return <VaultServiceView fy={fy} svcId={svc} />;
  if (fy)              return <VaultFYView fy={fy} />;
  return <VaultTopLevel />;
}
