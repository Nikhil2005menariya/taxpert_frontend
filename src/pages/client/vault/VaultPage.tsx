import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import Loader from "../../../components/ui/Loader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../api/client";
import UploadButton from "../../../components/ui/UploadButton";
import DownloadButton from "../../../components/ui/DownloadButton";

// ── Premium icon set ──────────────────────────────────────────
const ICONS: Record<string, ReactNode> = {
  folder:    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  fileCheck: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9.5 14.5 2 2 3.5-3.5" /></>,
  check:     <path d="M20 6 9 17l-5-5" />,
  clock:     <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  x:         <path d="M18 6 6 18M6 6l12 12" />,
  eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  upload:    <><path d="M12 15V3M8 7l4-4 4 4" /><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /></>,
  download:  <><path d="M12 3v12M8 11l4 4 4-4" /><path d="M3 21h18" /></>,
  plus:      <path d="M12 5v14M5 12h14" />,
  chevron:   <path d="m9 18 6-6-6-6" />,
  id:        <><rect x="2" y="5" width="20" height="14" rx="2.5" /><circle cx="8.5" cy="11.5" r="2" /><path d="M14 10h4M14 14h4M5.2 16.5a2.5 2.5 0 0 1 5 0" /></>,
  vault:     <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3.2" /><path d="M12 8.8V7M12 17v-1.8M15.2 12H17M7 12h1.8" /></>,
  inbox:     <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" /></>,
  archive:   <><rect x="2" y="4" width="20" height="5" rx="1.5" /><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" /></>,
};
function Ico({ k, sw = 1.8 }: { k: string; sw?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{ICONS[k]}</svg>;
}

// ── Status helpers ────────────────────────────────────────────
const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Docs needed",
  under_review: "Reviewing",
  in_progress: "In progress",
  action_required: "Action needed",
  completed: "Done",
  cancelled: "Cancelled",
};
const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  pending:            { fg: "#a96a16", bg: "#f6ecd6" },
  documents_required: { fg: "#a96a16", bg: "#f6ecd6" },
  under_review:       { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  in_progress:        { fg: "var(--lp-ink-muted)", bg: "var(--lp-surface-2)" },
  action_required:    { fg: "var(--lp-accent-strong)", bg: "var(--lp-accent-soft)" },
  completed:          { fg: "var(--lp-green)", bg: "var(--lp-green-soft)" },
  cancelled:          { fg: "var(--lp-ink-faint)", bg: "var(--lp-surface-2)" },
};
// Document status → premium icon + tone + label
const DOC_META: Record<string, { key: string; tone: string; label: string }> = {
  approved:     { key: "check", tone: "green", label: "Approved" },
  uploaded:     { key: "file",  tone: "ink",   label: "Uploaded" },
  under_review: { key: "eye",   tone: "amber", label: "Under review" },
  rejected:     { key: "x",     tone: "red",   label: "Rejected" },
  pending:      { key: "clock", tone: "faint", label: "Pending" },
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

// ── View / download buttons ───────────────────────────────────
function ViewDocButton({ documentId, isCommon = false }: { documentId: string; isCommon?: boolean }) {
  const [loading, setLoading] = useState(false);
  async function handleView() {
    setLoading(true);
    try {
      const path = isCommon ? `/common-documents/${documentId}/download` : `/documents/${documentId}/download`;
      const { data } = await apiClient.get(path);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Could not load document");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button onClick={handleView} disabled={loading} className="sv-btn sv-btn--ghost sv-btn--sm">
      {loading ? <span className="vlt-spin vlt-spin--ink" /> : <><Ico k="eye" /> View</>}
    </button>
  );
}

function VaultOutputDocViewButton({ docId, signedUrl }: { docId: string; signedUrl?: string | null }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (signedUrl) { window.open(signedUrl, "_blank", "noopener,noreferrer"); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/documents/output/${docId}/download`);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.response?.data?.error ?? "Could not load document");
    } finally { setLoading(false); }
  }
  return <DownloadButton onClick={handle} loading={loading} />;
}

// ── Simple upload button (for "Update") ───────────────────────
function SimpleUploadButton({ label, upload }: { label: string; upload: (file: File) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  async function handle(file: File) {
    setBusy(true); setErr(null);
    try { await upload(file); } catch (e: any) { setErr(e?.response?.data?.error ?? "Upload failed"); } finally { setBusy(false); }
  }
  return (
    <span className="vlt-upbtn-wrap">
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      <button className="sv-btn sv-btn--ghost sv-btn--sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <span className="vlt-spin vlt-spin--ink" /> : <><Ico k="upload" /> {label}</>}
      </button>
      {err && <span className="vlt-err">{err}</span>}
    </span>
  );
}

// ── Single-document upload ────────────────────────────────────
function ChecklistUploadButton({
  clientServiceId, documentId, documentName, templateId, status, onUploaded, label,
}: {
  clientServiceId: string; documentId?: string; documentName: string; templateId?: string;
  status: string; onUploaded: () => void; label?: string;
}) {
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("serviceId", clientServiceId);
    form.append("documentName", documentName);
    if (documentId) form.append("documentId", documentId);
    if (templateId) form.append("templateId", templateId);
    form.append("documentType", documentName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase());
    await apiClient.post("/vault/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    onUploaded();
  }
  // "Update" (existing uploaded/approved docs) is a simple button;
  // first-time Upload / Re-upload uses the animated draw button.
  if (label === "Update") return <SimpleUploadButton label="Update" upload={upload} />;
  return <UploadButton label={status === "rejected" ? "Re-upload" : "Upload"} upload={upload} />;
}

// ── Common doc upload ─────────────────────────────────────────
const COMMON_DOC_TYPES: Record<string, string> = {
  pan: "PAN Card", aadhaar: "Aadhaar", dsc: "DSC", bank_proof: "Bank Proof", form16: "Form 16", form26as: "Form 26AS",
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
      await apiClient.post("/vault/common-upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setOpen(false); setDocType(""); onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return <button className="sv-btn" onClick={() => setOpen(true)}><Ico k="plus" /> Upload common doc</button>;
  }
  return (
    <div className="vlt-uploader">
      <div className="vlt-uploader-head">
        <span className="vlt-uploader-title">Upload common document</span>
        <button className="vlt-uploader-close" onClick={() => setOpen(false)} aria-label="Close"><Ico k="x" sw={2} /></button>
      </div>
      <select value={docType} onChange={e => setDocType(e.target.value)} className="vlt-select">
        <option value="">Select document type…</option>
        {Object.entries(COMMON_DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {error && <div className="vlt-err">{error}</div>}
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <button className="sv-btn vlt-uploader-cta" onClick={() => inputRef.current?.click()} disabled={uploading || !docType}>
        {uploading ? "Uploading…" : "Choose file & upload"}
      </button>
    </div>
  );
}

function CommonDocUpdateButton({ documentType, onUploaded }: { documentType: string; onUploaded: () => void }) {
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    await apiClient.post("/vault/common-upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    onUploaded();
  }
  return <SimpleUploadButton label="Update" upload={upload} />;
}

// ── Breadcrumb ────────────────────────────────────────────────
function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="vlt-crumbs">
      {items.map((item, i) => (
        <span key={i} className="vlt-crumb">
          {i > 0 && <Ico k="chevron" sw={1.9} />}
          {item.href ? <Link to={item.href}>{item.label}</Link> : <span className="vlt-crumb-cur">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

function PageHead({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub: string; action?: ReactNode }) {
  return (
    <header className="vlt-head">
      <div>
        <span className="vlt-eyebrow">{eyebrow}</span>
        <h1 className="vlt-title">{title}</h1>
        <p className="vlt-sub">{sub}</p>
      </div>
      {action}
    </header>
  );
}

// ── Document row ──────────────────────────────────────────────
function DocRow({ status, name, meta, note, actions }: {
  status: string; name: string; meta?: ReactNode; note?: ReactNode; actions?: ReactNode;
}) {
  const m = DOC_META[status] ?? DOC_META.pending;
  return (
    <div className="vlt-doc">
      <span className={`sv-doc-ico sv-ico--${m.tone}`}><Ico k={m.key} sw={m.key === "check" ? 2.4 : 1.8} /></span>
      <div className="vlt-doc-body">
        <span className="vlt-doc-name">{name}</span>
        <span className="vlt-doc-meta">{m.label}{meta ? <> · {meta}</> : null}</span>
        {note && <span className="vlt-doc-note">{note}</span>}
      </div>
      {actions && <div className="vlt-doc-actions">{actions}</div>}
    </div>
  );
}

// ── Top-level view ────────────────────────────────────────────
function VaultTopLevel() {
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["vault-groups"],
    queryFn: async () => { const { data } = await apiClient.get("/vault/groups"); return data.data ?? []; },
  });
  const { data: commonDocs = [], isLoading: commonLoading } = useQuery({
    queryKey: ["vault-common-docs"],
    queryFn: async () => { const { data } = await apiClient.get("/vault/common-documents"); return data.data ?? []; },
  });

  if (groupsLoading || commonLoading) return <div className="page-loader"><Loader /></div>;

  const activeFY = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  })();

  return (
    <div className="vlt-page">
      <Breadcrumb items={[{ label: "Vault" }]} />
      <PageHead eyebrow="Document vault" title="Your Tax Vault" sub="Every document, every year — organized and always accessible." />

      <div className="vlt-grid">
        <Link to="/client/vault?common=1" className="vlt-folder vlt-folder--common">
          <span className="vlt-folder-ico"><Ico k="id" /></span>
          <div className="vlt-folder-body">
            <div className="vlt-folder-name">Common Docs</div>
            <div className="vlt-folder-meta">PAN · Aadhaar · DSC · Bank Proof</div>
            <div className="vlt-folder-count">{commonDocs.length} document{commonDocs.length !== 1 ? "s" : ""}</div>
          </div>
          <span className="vlt-folder-arrow"><Ico k="chevron" sw={2} /></span>
        </Link>

        {groups.map((g: any) => {
          const isCurrent = g.fy === activeFY;
          const up = g.services.reduce((s: number, x: any) => s + x.docsUploaded, 0);
          const tot = g.services.reduce((s: number, x: any) => s + x.docsTotal, 0);
          return (
            <Link key={g.fy} to={`/client/vault?fy=${g.fy}`} className="vlt-folder">
              <span className="vlt-folder-ico"><Ico k="folder" /></span>
              <div className="vlt-folder-body">
                <div className="vlt-folder-name">FY {g.fy}{isCurrent && <span className="vlt-current">Current</span>}</div>
                <div className="vlt-folder-meta">{g.services.length} service{g.services.length !== 1 ? "s" : ""}</div>
                <div className="vlt-folder-count">{up} / {tot} docs uploaded</div>
              </div>
              <span className="vlt-folder-arrow"><Ico k="chevron" sw={2} /></span>
            </Link>
          );
        })}

        {!groups.length && (
          <div className="vlt-empty" style={{ gridColumn: "1 / -1" }}>
            <span className="vlt-empty-ico"><Ico k="archive" sw={1.6} /></span>
            <p>No services yet. Use <strong>Add Service</strong> in the top-right to begin.</p>
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
    queryFn: async () => { const { data } = await apiClient.get("/vault/groups"); return data.data ?? []; },
  });

  if (isLoading) return <div className="page-loader"><Loader /></div>;
  const fyGroup = groups.find((g: any) => g.fy === fy);

  return (
    <div className="vlt-page">
      <Breadcrumb items={[{ label: "Vault", href: "/client/vault" }, { label: `FY ${fy}` }]} />
      <PageHead eyebrow="Financial year" title={`FY ${fy}`} sub={`${fyGroup?.services.length ?? 0} service${fyGroup?.services.length !== 1 ? "s" : ""} in this financial year.`} />

      {!fyGroup?.services.length ? (
        <div className="vlt-empty">
          <span className="vlt-empty-ico"><Ico k="folder" sw={1.6} /></span>
          <p>No services found for FY {fy}.</p>
        </div>
      ) : (
        <div className="vlt-grid">
          {fyGroup.services.map((svc: any) => {
            const tone = STATUS_TONE[svc.status] ?? STATUS_TONE.pending;
            const pct = svc.docsTotal > 0 ? Math.round((svc.docsUploaded / svc.docsTotal) * 100) : 0;
            return (
              <Link key={svc.clientServiceId} to={`/client/vault?fy=${fy}&svc=${svc.clientServiceId}`} className="vlt-svc">
                <div className="vlt-svc-top">
                  <div>
                    <div className="vlt-svc-cat">{svc.serviceCategory}</div>
                    <div className="vlt-svc-name">{svc.serviceName}</div>
                  </div>
                  <span className="vlt-status" style={{ background: tone.bg, color: tone.fg }}>
                    {SERVICE_STATUS_LABELS[svc.status] ?? svc.status}
                  </span>
                </div>
                <div className="vlt-prog">
                  <div className="vlt-prog-track"><div className={`vlt-prog-fill${pct === 100 ? " is-done" : ""}`} style={{ width: `${pct}%` }} /></div>
                  <span className="vlt-prog-label">{svc.docsUploaded}/{svc.docsTotal} docs</span>
                </div>
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
    queryFn: async () => { const { data } = await apiClient.get(`/vault/service/${svcId}`); return data.data; },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["vault-service", svcId] });
    qc.invalidateQueries({ queryKey: ["vault-groups"] });
  }

  if (isLoading) return <div className="page-loader"><Loader /></div>;
  if (error || !detail) {
    return (
      <div className="vlt-page">
        <Breadcrumb items={[{ label: "Vault", href: "/client/vault" }, { label: `FY ${fy}`, href: `/client/vault?fy=${fy}` }, { label: "Not found" }]} />
        <div className="vlt-empty"><span className="vlt-empty-ico"><Ico k="x" sw={1.6} /></span><p>Service not found or you don't have access.</p></div>
      </div>
    );
  }

  const docs       = detail.documents       ?? [];
  const templates  = detail.templates       ?? [];
  const commonDocs = detail.commonDocs      ?? [];
  const outputDocs = detail.outputDocuments ?? [];

  const inputDocs = docs.filter((d: any) => d.status === "pending" || d.status === "uploaded" || d.status === "rejected" || d.status === "under_review");
  const finalDocs = docs.filter((d: any) => d.status === "approved");

  const isTemplateCompleted = (t: any) => {
    const hasUploadedDoc = docs.some((d: any) =>
      (d.status === "uploaded" || d.status === "under_review" || d.status === "approved") &&
      (d.templateId === t.id || normalize(d.documentName) === normalize(t.name)));
    return hasUploadedDoc || isCommonDocAvailable(t.name, commonDocs);
  };
  const pendingTemplates = templates.filter((t: any) => !isTemplateCompleted(t));
  const allDone = templates.length > 0 && pendingTemplates.length === 0;
  const reqPct = templates.length > 0 ? Math.round(((templates.length - pendingTemplates.length) / templates.length) * 100) : 0;
  const tone = STATUS_TONE[detail.status] ?? STATUS_TONE.pending;

  return (
    <div className="vlt-page">
      <Breadcrumb items={[{ label: "Vault", href: "/client/vault" }, { label: `FY ${fy}`, href: `/client/vault?fy=${fy}` }, { label: detail.serviceName }]} />
      <header className="vlt-head">
        <div>
          <span className="vlt-eyebrow">FY {detail.fy}</span>
          <h1 className="vlt-title">{detail.serviceName}</h1>
          <div className="vlt-sub">
            <span className="vlt-status" style={{ background: tone.bg, color: tone.fg }}>{SERVICE_STATUS_LABELS[detail.status] ?? detail.status}</span>
          </div>
        </div>
      </header>

      <div className="vlt-layout">
        <div className="vlt-docs">
          {/* Input */}
          <section className="vlt-section">
            <div className="vlt-section-head">
              <span className="vlt-section-ico"><Ico k="upload" /></span>
              <span className="vlt-section-title">Uploaded</span>
              <span className="vlt-section-badge">{inputDocs.length}</span>
            </div>
            {inputDocs.length === 0 ? (
              <div className="vlt-section-empty">No documents pending — everything here is approved.</div>
            ) : (
              <div className="vlt-doclist">
                {inputDocs.map((doc: any) => (
                  <DocRow
                    key={doc.id}
                    status={doc.status}
                    name={doc.documentName}
                    meta={doc.uploadedAt ? `Uploaded ${fmtDate(doc.uploadedAt)}` : undefined}
                    note={doc.status === "rejected" && doc.notes ? `Rejected: ${doc.notes}` : undefined}
                    actions={<>
                      {doc.fileUrl && <ViewDocButton documentId={doc.id} />}
                      {(doc.status === "pending" || doc.status === "rejected") && (
                        <ChecklistUploadButton clientServiceId={detail.clientServiceId} documentId={doc.id} documentName={doc.documentName} templateId={doc.templateId} status={doc.status} onUploaded={refresh} />
                      )}
                      {(doc.status === "uploaded" || doc.status === "under_review" || doc.status === "approved") && (
                        <ChecklistUploadButton clientServiceId={detail.clientServiceId} documentId={doc.id} documentName={doc.documentName} templateId={doc.templateId} status={doc.status} onUploaded={refresh} label="Update" />
                      )}
                    </>}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Final (approved) */}
          {finalDocs.length > 0 && (
            <section className="vlt-section">
              <div className="vlt-section-head">
                <span className="vlt-section-ico sv-ico--green"><Ico k="check" sw={2.4} /></span>
                <span className="vlt-section-title">Approved</span>
                <span className="vlt-section-badge">{finalDocs.length}</span>
              </div>
              <div className="vlt-doclist">
                {finalDocs.map((doc: any) => (
                  <DocRow
                    key={doc.id}
                    status="approved"
                    name={doc.documentName}
                    meta={doc.uploadedAt ? `Approved ${fmtDate(doc.uploadedAt)}` : undefined}
                    actions={<>
                      {doc.fileUrl && <ViewDocButton documentId={doc.id} />}
                      <ChecklistUploadButton clientServiceId={detail.clientServiceId} documentId={doc.id} documentName={doc.documentName} templateId={doc.templateId} status={doc.status} onUploaded={refresh} label="Update" />
                    </>}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Output from Taxpert */}
          {outputDocs.length > 0 && (
            <section className="vlt-section vlt-section--out">
              <div className="vlt-section-head">
                <span className="vlt-section-ico sv-ico--green"><Ico k="inbox" /></span>
                <span className="vlt-section-title">From your Taxpert</span>
                <span className="vlt-section-badge sv-ico--green">{outputDocs.length}</span>
              </div>
              <div className="vlt-doclist">
                {outputDocs.map((doc: any) => (
                  <div key={doc.id} className="vlt-doc">
                    <span className="sv-doc-ico sv-ico--green"><Ico k="fileCheck" /></span>
                    <div className="vlt-doc-body">
                      <span className="vlt-doc-name">{doc.document_name}</span>
                      <span className="vlt-doc-meta">{doc.description ? doc.description : "Ready"}{doc.uploaded_at ? ` · ${fmtDate(doc.uploaded_at)}` : ""}</span>
                    </div>
                    <div className="vlt-doc-actions">
                      <VaultOutputDocViewButton docId={doc.id} signedUrl={doc.signed_url} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Required docs panel */}
        {templates.length > 0 && (
          <aside className="vlt-panel">
            <div className="vlt-panel-head">
              <span className="vlt-panel-title">Required documents</span>
              <span className="vlt-panel-count">{templates.length - pendingTemplates.length}/{templates.length}</span>
            </div>

            {allDone ? (
              <div className="vlt-panel-done"><Ico k="check" sw={2.4} /> All required documents uploaded.</div>
            ) : (
              <div className="vlt-panel-bar"><div className="vlt-panel-bar-fill" style={{ width: `${reqPct}%` }} /></div>
            )}

            <div className="vlt-panel-list">
              {templates.map((t: any) => {
                const isDone = isTemplateCompleted(t);
                const inCommon = isCommonDocAvailable(t.name, commonDocs);
                return (
                  <div key={t.id} className={`vlt-req${isDone ? " is-done" : ""}`}>
                    <span className="vlt-req-check">{isDone ? <Ico k="check" sw={2.6} /> : <span className="vlt-req-dot" />}</span>
                    <div className="vlt-req-body">
                      <span className="vlt-req-name">{t.name}</span>
                      {t.description && <span className="vlt-req-hint">{t.description}</span>}
                    </div>
                    {inCommon ? <span className="vlt-req-badge vlt-req-badge--common">Common</span>
                      : t.required && !isDone ? <span className="vlt-req-badge vlt-req-badge--req">Required</span> : null}
                  </div>
                );
              })}
            </div>

            <Link to={`/client/services/${detail.clientServiceId}`} className="vlt-panel-link">View full checklist <Ico k="chevron" sw={2} /></Link>
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
    queryFn: async () => { const { data } = await apiClient.get("/vault/common-documents"); return data.data ?? []; },
  });
  function refresh() { qc.invalidateQueries({ queryKey: ["vault-common-docs"] }); }

  if (isLoading) return <div className="page-loader"><Loader /></div>;

  return (
    <div className="vlt-page">
      <Breadcrumb items={[{ label: "Vault", href: "/client/vault" }, { label: "Common Docs" }]} />
      <PageHead
        eyebrow="Shared documents"
        title="Common Documents"
        sub="PAN, Aadhaar, DSC, and Bank Proof shared across all your services."
        action={<VaultCommonUpload onUploaded={refresh} />}
      />

      {!commonDocs.length ? (
        <div className="vlt-empty">
          <span className="vlt-empty-ico"><Ico k="id" sw={1.6} /></span>
          <p>No common documents uploaded yet.</p>
          <p className="vlt-empty-hint">Upload PAN, Aadhaar, DSC, or Bank Proof and they will appear here.</p>
        </div>
      ) : (
        <section className="vlt-section">
          <div className="vlt-doclist">
            {commonDocs.map((d: any) => (
              <div key={d.id} className="vlt-doc">
                <span className="sv-doc-ico sv-ico--green"><Ico k="check" sw={2.4} /></span>
                <div className="vlt-doc-body">
                  <span className="vlt-doc-name">{COMMON_DOC_TYPES[d.documentType] ?? d.documentType}</span>
                  <span className="vlt-doc-meta">Uploaded{d.documentName ? ` · ${d.documentName}` : ""}</span>
                </div>
                <div className="vlt-doc-actions">
                  {d.fileUrl && <ViewDocButton documentId={d.id} isCommon />}
                  <CommonDocUpdateButton documentType={d.documentType} onUploaded={refresh} />
                </div>
              </div>
            ))}
          </div>
        </section>
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

  // Backfill sync: propagate existing common docs into pending service-doc rows.
  useEffect(() => {
    apiClient.post("/vault/sync").then(() => {
      qc.invalidateQueries({ queryKey: ["vault-service"] });
      qc.invalidateQueries({ queryKey: ["vault-groups"] });
    }).catch(() => { /* non-critical */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (common === "1") return <VaultCommonDocsView />;
  if (fy && svc)       return <VaultServiceView fy={fy} svcId={svc} />;
  if (fy)              return <VaultFYView fy={fy} />;
  return <VaultTopLevel />;
}
