import { useState, useEffect } from "react";
import Loader from "../../components/ui/Loader";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ServiceEditPage() {
  const { id } = useParams();
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const [tab, setTab] = useState<"details" | "documents" | "duedates">("details");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Details form state ──
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("");
  const [requiresFy, setRequiresFy] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // ── Document requirements state ──
  const [addDocId, setAddDocId] = useState("");
  const [addRequired, setAddRequired] = useState(true);

  // ── Due date templates state ──
  const [ddTitle, setDdTitle] = useState("");
  const [ddDesc, setDdDesc] = useState("");
  const [ddRecurrence, setDdRecurrence] = useState<"annual" | "monthly" | "quarterly">("annual");
  const [ddMonth, setDdMonth] = useState<number>(7);
  const [ddDay, setDdDay] = useState<number>(31);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-service", id],
    queryFn: async () => {
      const [svcRes, catRes, docsRes, reqsRes, ddsRes] = await Promise.all([
        apiClient.get(`/config/services/${id}`),
        apiClient.get("/config/categories"),
        apiClient.get("/config/document-types"),
        apiClient.get(`/config/services/${id}/requirements`),
        apiClient.get(`/config/services/${id}/due-dates`)
      ]);
      return {
        service: svcRes.data.data,
        categories: catRes.data.data ?? [],
        allDocumentTypes: docsRes.data.data ?? [],
        requirements: reqsRes.data.data ?? [],
        dueDates: ddsRes.data.data ?? []
      };
    },
    enabled: isAdmin && !!id,
  });

  useEffect(() => {
    if (data?.service) {
      setName(data.service.name);
      setCatId(data.service.category_id ?? "");
      setDescription(data.service.description ?? "");
      setSummary(data.service.summary ?? "");
      setPrice(String(Math.round(data.service.price / 100)));
      setRequiresFy(data.service.requires_fy);
      setIsActive(data.service.is_active);
    }
  }, [data?.service]);

  function flash(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  const updateDetailsMutation = useMutation({
    mutationFn: async (updateData: any) => {
      await apiClient.put(`/config/services/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
      flash("ok", "Service updated.");
    },
    onError: (err: any) => {
      flash("err", err.response?.data?.error || "Failed to update service.");
    }
  });

  function saveDetails() {
    updateDetailsMutation.mutate({
      name, category_id: catId || null,
      description: description || null, summary: summary || null,
      price: Math.round(parseFloat(price) * 100),
      requires_fy: requiresFy, is_active: isActive,
    });
  }

  // Docs mutations
  const addDocMutation = useMutation({
    mutationFn: async (docData: any) => {
      await apiClient.post("/config/requirements", docData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
      flash("ok", "Document added.");
      setAddDocId("");
    },
    onError: (err: any) => flash("err", err.response?.data?.error || "Error adding document.")
  });

  const removeDocMutation = useMutation({
    mutationFn: async (reqId: string) => {
      await apiClient.delete(`/config/requirements/${reqId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
      flash("ok", "Removed.");
    },
    onError: (err: any) => flash("err", err.response?.data?.error || "Error removing document.")
  });

  const toggleDocMutation = useMutation({
    mutationFn: async ({ reqId, data }: { reqId: string, data: any }) => {
      await apiClient.put(`/config/requirements/${reqId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
    },
  });

  function handleAddDoc() {
    if (!addDocId) return;
    const currentReqs = data?.requirements || [];
    addDocMutation.mutate({
      service_id: id,
      document_type_id: addDocId,
      is_required: addRequired,
      is_optional: !addRequired,
      sort_order: currentReqs.length + 1,
    });
  }

  function handleToggleRequired(req: any) {
    toggleDocMutation.mutate({
      reqId: req.id,
      data: {
        is_required: !req.is_required,
        is_optional: req.is_required,
      }
    });
  }

  // Due Dates mutations
  const addDdMutation = useMutation({
    mutationFn: async (ddData: any) => {
      await apiClient.post("/config/due-dates", ddData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
      flash("ok", "Due date template added.");
      setDdTitle(""); setDdDesc("");
    },
    onError: (err: any) => flash("err", err.response?.data?.error || "Error adding due date.")
  });

  const removeDdMutation = useMutation({
    mutationFn: async (ddId: string) => {
      await apiClient.delete(`/config/due-dates/${ddId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service", id] });
      flash("ok", "Removed.");
    },
    onError: (err: any) => flash("err", err.response?.data?.error || "Error removing due date.")
  });

  function handleAddDd() {
    if (!ddTitle.trim() || !ddDay) return;
    addDdMutation.mutate({
      service_id: id,
      title: ddTitle,
      description: ddDesc || null,
      recurrence_type: ddRecurrence,
      applicable_month: ddRecurrence === "annual" ? ddMonth : null,
      applicable_day: ddDay,
    });
  }

  if (authLoading || isLoading) {
    return (
      <div className="page-loader"><Loader /></div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (!data?.service) return <div>Service not found</div>;

  const { service, categories, allDocumentTypes, requirements, dueDates } = data;
  
  const reqs = requirements.sort((a: any, b: any) => a.sort_order - b.sort_order);
  const usedDocTypeIds = new Set(reqs.map((r: any) => r.document_type_id));
  const availableDocTypes = allDocumentTypes.filter((d: any) => !usedDocTypeIds.has(d.id));
  
  const pending = updateDetailsMutation.isPending || addDocMutation.isPending || removeDocMutation.isPending || toggleDocMutation.isPending || addDdMutation.isPending || removeDdMutation.isPending;

  return (
    <div className="se-page">
      {/* Header */}
      <div className="se-header">
        <div>
          <Link to="/admin/services" className="se-back">← Services</Link>
          <h1 className="page-title" style={{ margin: "0.25rem 0 0" }}>{service.name}</h1>
          <code className="se-slug">{service.slug}</code>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className={`se-active-badge ${service.is_active ? "se-badge-active" : "se-badge-inactive"}`}>
            {service.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {msg && (
        <div className={`se-flash se-flash-${msg.type}`}>{msg.text}</div>
      )}

      {/* Tabs */}
      <nav className="se-tabs">
        {(["details", "documents", "duedates"] as const).map(t => (
          <button key={t} className={`se-tab${tab === t ? " se-tab-active" : ""}`} onClick={() => setTab(t)}>
            {t === "details" ? "Service Details" : t === "documents" ? `Document Requirements (${reqs.length})` : `Due Date Templates (${dueDates.length})`}
          </button>
        ))}
      </nav>

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <div className="se-card">
          <div className="se-form-grid">
            <div className="se-field">
              <label>Service Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="se-input" />
            </div>
            <div className="se-field">
              <label>Category</label>
              <select value={catId} onChange={e => setCatId(e.target.value)} className="se-input">
                <option value="">— Uncategorized —</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="se-field se-field-full">
              <label>Summary (short)</label>
              <input value={summary} onChange={e => setSummary(e.target.value)} className="se-input" placeholder="One-line summary for clients" />
            </div>
            <div className="se-field se-field-full">
              <label>Description (detail)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="se-textarea" rows={3} placeholder="Longer service description" />
            </div>
            <div className="se-field">
              <label>Price (₹ incl. GST)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: "#94a3b8" }}>₹</span>
                <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="se-input" style={{ width: 120 }} />
              </div>
            </div>
            <div className="se-field">
              <label>FY Required</label>
              <label className="se-toggle">
                <input type="checkbox" checked={requiresFy} onChange={e => setRequiresFy(e.target.checked)} />
                <span>Client must specify fiscal year</span>
              </label>
            </div>
            {isSuperAdmin && (
              <div className="se-field">
                <label>Active</label>
                <label className="se-toggle">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <span>Service visible to clients</span>
                </label>
              </div>
            )}
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <button onClick={saveDetails} disabled={pending} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Add document */}
          <div className="se-card">
            <div className="se-card-title">Add Document Requirement</div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="se-field" style={{ flex: 1, minWidth: 220 }}>
                <label>Document Type</label>
                <select value={addDocId} onChange={e => setAddDocId(e.target.value)} className="se-input">
                  <option value="">— Select document type —</option>
                  {availableDocTypes.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="se-field">
                <label>Mandatory?</label>
                <select value={addRequired ? "yes" : "no"} onChange={e => setAddRequired(e.target.value === "yes")} className="se-input">
                  <option value="yes">Required</option>
                  <option value="no">Optional</option>
                </select>
              </div>
              <button onClick={handleAddDoc} disabled={pending || !addDocId} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                Add
              </button>
            </div>
          </div>

          {/* Requirements list */}
          <div className="se-card">
            <div className="se-card-title">Current Requirements ({reqs.length})</div>
            {reqs.length === 0 ? (
              <div className="se-empty">No document requirements configured yet.</div>
            ) : (
              <div className="se-doc-list">
                {reqs.map((req: any, i: number) => {
                  const dt = req.document_type;
                  return (
                    <div key={req.id} className="se-doc-row">
                      <div className="se-doc-order">{i + 1}</div>
                      <div className="se-doc-info">
                        <div className="se-doc-name">{dt?.name ?? "Unknown"}</div>
                        <code className="se-doc-code">{dt?.code}</code>
                        {dt?.description && <div className="se-doc-desc">{dt.description}</div>}
                      </div>
                      <div className="se-doc-meta">
                        <span className={`se-badge ${req.is_required ? "se-badge-req" : "se-badge-opt"}`}>
                          {req.is_required ? "Required" : "Optional"}
                        </span>
                        {dt?.is_common_document && <span className="se-badge se-badge-common">Common</span>}
                      </div>
                      <div className="se-doc-actions">
                        <button
                          onClick={() => handleToggleRequired(req)}
                          disabled={pending}
                          className="se-btn se-btn-toggle"
                        >
                          Make {req.is_required ? "Optional" : "Required"}
                        </button>
                        <button
                          onClick={() => removeDocMutation.mutate(req.id)}
                          disabled={pending}
                          className="se-btn se-btn-remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DUE DATES TAB ── */}
      {tab === "duedates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Add template */}
          <div className="se-card">
            <div className="se-card-title">Add Due Date Template</div>
            <div className="se-form-grid">
              <div className="se-field se-field-full">
                <label>Title</label>
                <input value={ddTitle} onChange={e => setDdTitle(e.target.value)} className="se-input" placeholder="e.g. ITR Filing Deadline" />
              </div>
              <div className="se-field se-field-full">
                <label>Description (optional)</label>
                <input value={ddDesc} onChange={e => setDdDesc(e.target.value)} className="se-input" placeholder="Brief explanation" />
              </div>
              <div className="se-field">
                <label>Recurrence</label>
                <select value={ddRecurrence} onChange={e => setDdRecurrence(e.target.value as any)} className="se-input">
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              {ddRecurrence === "annual" && (
                <div className="se-field">
                  <label>Month</label>
                  <select value={ddMonth} onChange={e => setDdMonth(Number(e.target.value))} className="se-input">
                    {MONTHS.slice(1).map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="se-field">
                <label>Day of Month</label>
                <input type="number" min={1} max={31} value={ddDay} onChange={e => setDdDay(Number(e.target.value))} className="se-input" style={{ width: 80 }} />
              </div>
            </div>
            <button onClick={handleAddDd} disabled={pending || !ddTitle.trim()} className="btn btn-primary" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
              Add Template
            </button>
          </div>

          {/* Templates list */}
          <div className="se-card">
            <div className="se-card-title">Configured Templates ({dueDates.length})</div>
            {dueDates.length === 0 ? (
              <div className="se-empty">No due date templates. Add one above.</div>
            ) : (
              <div className="se-doc-list">
                {dueDates.map((tpl: any) => (
                  <div key={tpl.id} className="se-doc-row">
                    <div className="se-doc-info">
                      <div className="se-doc-name">{tpl.title}</div>
                      {tpl.description && <div className="se-doc-desc">{tpl.description}</div>}
                    </div>
                    <div className="se-doc-meta">
                      <span className="se-badge se-badge-rec">{tpl.recurrence_type}</span>
                      <span className="se-badge se-badge-day">
                        {tpl.recurrence_type === "annual"
                          ? `${MONTHS[tpl.applicable_month ?? 1]} ${tpl.applicable_day}`
                          : `Day ${tpl.applicable_day}`}
                      </span>
                    </div>
                    <div className="se-doc-actions">
                      <button onClick={() => removeDdMutation.mutate(tpl.id)} disabled={pending} className="se-btn se-btn-remove">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .se-page { padding-bottom: 3rem; max-width: 960px; }
        .se-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .se-back { font-size: 0.8rem; color: #7c3aed; text-decoration: none; font-weight: 600; display: block; margin-bottom: 0.25rem; }
        .se-back:hover { text-decoration: underline; }
        .se-slug { font-family: 'Courier New', monospace; font-size: 0.78rem; color: #64748b; background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #e2e8f0; }
        .se-active-badge { font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.75rem; border-radius: 999px; }
        .se-badge-active   { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }
        .se-badge-inactive { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        .se-flash { padding: 0.65rem 1rem; border-radius: 0.5rem; font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem; }
        .se-flash-ok  { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }
        .se-flash-err { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        .se-tabs { display: flex; gap: 0.2rem; flex-wrap: wrap; margin-bottom: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.875rem; padding: 0.25rem; width: fit-content; }
        .se-tab { padding: 0.5rem 1.1rem; border-radius: 0.6rem; font-size: 0.82rem; font-weight: 500; color: #64748b; background: none; border: none; cursor: pointer; white-space: nowrap; transition: background 0.12s, color 0.12s; }
        .se-tab:hover { color: #0f172a; background: rgba(255,255,255,0.8); }
        .se-tab-active { background: white; color: #7c3aed; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        .se-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; }
        .se-card-title { font-size: 0.85rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; padding-bottom: 0.65rem; border-bottom: 1px solid #f1f5f9; }

        .se-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .se-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .se-field-full { grid-column: 1 / -1; }
        .se-field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .se-input { padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; outline: none; background: #f8fafc; color: #0f172a; width: 100%; }
        .se-input:focus { border-color: #7c3aed; background: white; }
        .se-textarea { padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; outline: none; background: #f8fafc; color: #0f172a; resize: vertical; width: 100%; font-family: inherit; }
        .se-textarea:focus { border-color: #7c3aed; background: white; }
        .se-toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #475569; cursor: pointer; }

        .se-doc-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .se-doc-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem; border: 1px solid #f1f5f9; border-radius: 0.75rem; background: #fafbff; }
        .se-doc-row:hover { border-color: #e2e8f0; }
        .se-doc-order { width: 24px; height: 24px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .se-doc-info { flex: 1; }
        .se-doc-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
        .se-doc-code { font-family: 'Courier New', monospace; font-size: 0.72rem; color: #64748b; background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 3px; }
        .se-doc-desc { font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem; }
        .se-doc-meta { display: flex; gap: 0.3rem; align-items: center; flex-wrap: wrap; }
        .se-doc-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }

        .se-badge { display: inline-flex; align-items: center; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.68rem; font-weight: 700; white-space: nowrap; }
        .se-badge-req    { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .se-badge-opt    { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
        .se-badge-common { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .se-badge-rec    { background: #faf5ff; color: #7c3aed; border: 1px solid #e9d5ff; }
        .se-badge-day    { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }

        .se-btn { font-size: 0.72rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 5px; border: 1px solid transparent; cursor: pointer; transition: opacity 0.15s; }
        .se-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .se-btn-toggle { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .se-btn-remove { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        .se-btn:hover:not(:disabled) { opacity: 0.75; }

        .se-empty { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; border: 1.5px dashed #e2e8f0; border-radius: 0.75rem; }

        @media (max-width: 640px) { .se-form-grid { grid-template-columns: 1fr; } .se-doc-row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}
