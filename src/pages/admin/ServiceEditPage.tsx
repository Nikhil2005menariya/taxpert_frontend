import { useState, useEffect } from "react";
import Loader from "../../components/ui/Loader";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toSlug(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  ),
  details: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
  ),
  docs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6L19 8.4V19a2 2 0 0 1-2 2z" /></svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
  ),
};

export default function ServiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isCreateMode = id === "new";
  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const [tab, setTab] = useState<"details" | "documents" | "duedates">("details");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Details form ──
  const [name, setName]           = useState("");
  const [slug, setSlug]           = useState("");
  const [catId, setCatId]         = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary]     = useState("");
  const [price, setPrice]         = useState("");
  const [requiresFy, setRequiresFy] = useState(false);
  const [isActive, setIsActive]   = useState(false);

  // ── Document requirements ──
  const [addDocId, setAddDocId]     = useState("");
  const [addRequired, setAddRequired] = useState(true);

  // ── Due date templates ──
  const [ddTitle, setDdTitle]         = useState("");
  const [ddDesc, setDdDesc]           = useState("");
  const [ddRecurrence, setDdRecurrence] = useState<"annual" | "monthly" | "quarterly">("annual");
  const [ddMonth, setDdMonth]         = useState<number>(7);
  const [ddDay, setDdDay]             = useState<number>(31);

  const { data, isLoading } = useQuery({
    queryKey: isCreateMode ? ["admin-service-create"] : ["admin-service", id],
    queryFn: async () => {
      if (isCreateMode) {
        const [catRes, docsRes] = await Promise.all([
          apiClient.get("/config/categories"),
          apiClient.get("/config/document-types"),
        ]);
        return {
          service: null as any,
          categories: catRes.data.data ?? [],
          allDocumentTypes: docsRes.data.data ?? [],
          requirements: [],
          dueDates: [],
        };
      }
      const [svcRes, catRes, docsRes, reqsRes, ddsRes] = await Promise.all([
        apiClient.get(`/config/services/${id}`),
        apiClient.get("/config/categories"),
        apiClient.get("/config/document-types"),
        apiClient.get(`/config/services/${id}/requirements`),
        apiClient.get(`/config/services/${id}/due-dates`),
      ]);
      return {
        service: svcRes.data.data,
        categories: catRes.data.data ?? [],
        allDocumentTypes: docsRes.data.data ?? [],
        requirements: reqsRes.data.data ?? [],
        dueDates: ddsRes.data.data ?? [],
      };
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isCreateMode && data?.service) {
      setName(data.service.name);
      setCatId(data.service.category_id ?? "");
      setDescription(data.service.description ?? "");
      setSummary(data.service.summary ?? "");
      setPrice(String(Math.round(data.service.price / 100)));
      setRequiresFy(data.service.requires_fy);
      setIsActive(data.service.is_active);
    }
  }, [data?.service, isCreateMode]);

  function flash(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  }

  function handleNameChange(v: string) {
    setName(v);
    if (isCreateMode) setSlug(toSlug(v));
  }

  const createCatMutation = useMutation({
    mutationFn: async (catName: string) => {
      const res = await apiClient.post("/config/categories", { name: catName.trim(), slug: toSlug(catName) });
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/config/services", payload);
      return res.data.data;
    },
    onSuccess: (newSvc) => {
      queryClient.invalidateQueries({ queryKey: ["admin-services-config"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-categories"] });
      navigate(`/admin/services/${newSvc.id}`);
    },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Failed to create service."),
  });

  async function handleCreate() {
    if (!name.trim()) { flash("err", "Service name is required."); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum < 0) { flash("err", "Enter a valid price in ₹."); return; }

    let finalCatId: string | null = catId === "__new__" ? null : (catId || null);
    let finalCatName = "";

    if (catId === "__new__") {
      if (!newCatName.trim()) { flash("err", "Enter a name for the new category."); return; }
      try {
        const newCat = await createCatMutation.mutateAsync(newCatName.trim());
        finalCatId   = newCat.id;
        finalCatName = newCat.name;
      } catch (err: any) {
        flash("err", err.response?.data?.error ?? "Failed to create category.");
        return;
      }
    } else {
      const cat = (data?.categories ?? []).find((c: any) => c.id === catId);
      finalCatName = cat?.name ?? "";
    }

    createMutation.mutate({
      name:        name.trim(),
      slug:        slug.trim() || toSlug(name),
      category:    finalCatName,
      category_id: finalCatId,
      summary:     summary.trim() || null,
      description: description.trim() || null,
      price:       Math.round(priceNum * 100),
      requires_fy: requiresFy,
    });
  }

  const updateDetailsMutation = useMutation({
    mutationFn: async (payload: any) => { await apiClient.put(`/config/services/${id}`, payload); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-service", id] }); queryClient.invalidateQueries({ queryKey: ["marketing-categories"] }); flash("ok", "Service updated."); },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Failed to update."),
  });

  function saveDetails() {
    updateDetailsMutation.mutate({
      name, category_id: catId || null,
      description: description || null, summary: summary || null,
      price: Math.round(parseFloat(price) * 100),
      requires_fy: requiresFy, is_active: isActive,
    });
  }

  const addDocMutation = useMutation({
    mutationFn: async (payload: any) => { await apiClient.post("/config/requirements", payload); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-service", id] }); flash("ok", "Document added."); setAddDocId(""); },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Error adding document."),
  });
  const removeDocMutation = useMutation({
    mutationFn: async (reqId: string) => { await apiClient.delete(`/config/requirements/${reqId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-service", id] }); flash("ok", "Removed."); },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Error removing."),
  });
  const toggleDocMutation = useMutation({
    mutationFn: async ({ reqId, payload }: { reqId: string; payload: any }) => { await apiClient.put(`/config/requirements/${reqId}`, payload); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-service", id] }),
  });

  function handleAddDoc() {
    if (!addDocId) return;
    addDocMutation.mutate({
      service_id: id, document_type_id: addDocId,
      is_required: addRequired, is_optional: !addRequired,
      sort_order: (data?.requirements ?? []).length + 1,
    });
  }
  function handleToggleRequired(req: any) {
    toggleDocMutation.mutate({ reqId: req.id, payload: { is_required: !req.is_required, is_optional: req.is_required } });
  }

  const addDdMutation = useMutation({
    mutationFn: async (payload: any) => { await apiClient.post("/config/due-dates", payload); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-service", id] }); flash("ok", "Due date added."); setDdTitle(""); setDdDesc(""); },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Error adding due date."),
  });
  const removeDdMutation = useMutation({
    mutationFn: async (ddId: string) => { await apiClient.delete(`/config/due-dates/${ddId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-service", id] }); flash("ok", "Removed."); },
    onError: (err: any) => flash("err", err.response?.data?.error ?? "Error removing."),
  });

  function handleAddDd() {
    if (!ddTitle.trim() || !ddDay) return;
    addDdMutation.mutate({
      service_id: id, title: ddTitle, description: ddDesc || null,
      recurrence_type: ddRecurrence,
      applicable_month: ddRecurrence === "annual" ? ddMonth : null,
      applicable_day: ddDay,
    });
  }

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!isCreateMode && !data?.service) return <div className="adm-root"><div className="adm-banner adm-banner--err">Service not found.</div></div>;

  const { categories = [], allDocumentTypes = [], requirements = [], dueDates = [] } = data ?? {};
  const service = data?.service;

  const reqs = [...requirements].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const usedDocTypeIds = new Set(reqs.map((r: any) => r.document_type_id));
  const availableDocTypes = allDocumentTypes.filter((d: any) => !usedDocTypeIds.has(d.id));
  const isNewCat = catId === "__new__";

  const anyPending = updateDetailsMutation.isPending || createMutation.isPending || createCatMutation.isPending
    || addDocMutation.isPending || removeDocMutation.isPending || toggleDocMutation.isPending
    || addDdMutation.isPending || removeDdMutation.isPending;

  const TABS = [
    { id: "details"   as const, label: "Details",  icon: Icon.details },
    { id: "documents" as const, label: `Documents${!isCreateMode ? ` (${reqs.length})` : ""}`, icon: Icon.docs },
    { id: "duedates"  as const, label: `Due Dates${!isCreateMode ? ` (${dueDates.length})` : ""}`, icon: Icon.cal },
  ];

  return (
    <div className="adm-root" style={{ maxWidth: 980 }}>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <Link to="/admin/services" className="adm-back">{Icon.back} Services</Link>
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— {isCreateMode ? "New Service" : "Edit Service"}</p>
            <h1 className="adm-hero-title">{isCreateMode ? "New Service" : service?.name}</h1>
            {!isCreateMode && <p className="adm-hero-date">Slug: {service?.slug}</p>}
          </div>
          {!isCreateMode && (
            <div className="adm-hero-aside">
              <span className={`adm-badge ${service?.is_active ? "adm-badge--green" : "adm-badge--neutral"}`}>
                <span className="adm-badge-dot" />{service?.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          )}
        </div>
      </header>

      {msg && (
        <div className={`adm-banner adm-banner--${msg.type === "ok" ? "ok" : "err"}`} style={{ marginBottom: "1rem" }}>
          {msg.type === "ok" ? Icon.check : Icon.alert}{msg.text}
        </div>
      )}

      {/* Tabs */}
      <nav className="adm-seg" role="tablist">
        {TABS.map(t => {
          const locked = isCreateMode && t.id !== "details";
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              disabled={locked}
              className={`adm-seg-btn${tab === t.id ? " is-active" : ""}`}
              style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              onClick={() => !locked && setTab(t.id)}
            >
              {t.icon}{t.label}
            </button>
          );
        })}
      </nav>

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <section className="adm-panel">
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label">Service Name *</label>
              <input value={name} onChange={e => handleNameChange(e.target.value)} className="adm-input" placeholder="e.g. GST Registration" />
            </div>

            {isCreateMode ? (
              <div className="adm-field">
                <label className="adm-label">Slug *</label>
                <input value={slug} onChange={e => setSlug(e.target.value)} className="adm-input" placeholder="e.g. gst-registration" />
              </div>
            ) : (
              <div className="adm-field">
                <label className="adm-label">Slug</label>
                <input className="adm-input" value={service?.slug ?? ""} disabled style={{ opacity: 0.6 }} />
              </div>
            )}

            <div className="adm-field" style={{ gridColumn: isNewCat ? "1 / -1" : undefined }}>
              <label className="adm-label">Category</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div className="adm-select-wrap" style={{ flex: 1, minWidth: 180 }}>
                  <select value={catId} onChange={e => { setCatId(e.target.value); setNewCatName(""); }} className="adm-select">
                    <option value="">— Uncategorized —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="__new__">＋ New category…</option>
                  </select>
                  <span className="adm-select-ico">{Icon.chevronD}</span>
                </div>
                {isNewCat && (
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="adm-input" placeholder="Category name" style={{ flex: 1, minWidth: 180 }} autoFocus />
                )}
              </div>
            </div>

            <div className="adm-field">
              <label className="adm-label">Price (₹ incl. GST) *</label>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="adm-input" placeholder="1499" />
            </div>

            <div className="adm-field adm-field--full">
              <label className="adm-label">Summary <span className="adm-label-opt">(short)</span></label>
              <input value={summary} onChange={e => setSummary(e.target.value)} className="adm-input" placeholder="One-line summary for clients" />
            </div>

            <div className="adm-field adm-field--full">
              <label className="adm-label">Description <span className="adm-label-opt">(detail)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="adm-textarea" rows={3} placeholder="Longer service description shown on the service page" />
            </div>

            <div className="adm-field">
              <label className="adm-label">FY Required</label>
              <label className="adm-check">
                <input type="checkbox" checked={requiresFy} onChange={e => setRequiresFy(e.target.checked)} />
                Client must specify fiscal year
              </label>
            </div>

            {!isCreateMode && isSuperAdmin && (
              <div className="adm-field">
                <label className="adm-label">Active</label>
                <label className="adm-check">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Service visible to clients
                </label>
              </div>
            )}
          </div>

          <div className="adm-savebar" style={{ marginTop: "1.5rem", justifyContent: "flex-start" }}>
            {isCreateMode ? (
              <>
                <button onClick={handleCreate} disabled={anyPending} className="adm-submit">
                  {anyPending ? <><span className="adm-submit-spin" /> Creating…</> : "Create Service"}
                </button>
                <Link to="/admin/services" className="adm-btn adm-btn--ghost">Cancel</Link>
              </>
            ) : (
              <button onClick={saveDetails} disabled={anyPending} className="adm-submit">
                {anyPending ? <><span className="adm-submit-spin" /> Saving…</> : "Save Changes"}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && (
        isCreateMode ? (
          <section className="adm-panel">
            <div className="adm-empty-box"><p className="adm-empty-txt">Create the service first — then configure document requirements here.</p></div>
          </section>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <section className="adm-panel">
              <div className="adm-sub-head"><h3 className="adm-sub-title">Add Document Requirement</h3></div>
              <div className="adm-addbar">
                <div className="adm-field" style={{ flex: 1, minWidth: 220 }}>
                  <label className="adm-label">Document Type</label>
                  <div className="adm-select-wrap">
                    <select value={addDocId} onChange={e => setAddDocId(e.target.value)} className="adm-select">
                      <option value="">— Select document type —</option>
                      {availableDocTypes.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </select>
                    <span className="adm-select-ico">{Icon.chevronD}</span>
                  </div>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Mandatory?</label>
                  <div className="adm-select-wrap">
                    <select value={addRequired ? "yes" : "no"} onChange={e => setAddRequired(e.target.value === "yes")} className="adm-select">
                      <option value="yes">Required</option>
                      <option value="no">Optional</option>
                    </select>
                    <span className="adm-select-ico">{Icon.chevronD}</span>
                  </div>
                </div>
                <button onClick={handleAddDoc} disabled={anyPending || !addDocId} className="adm-btn adm-btn--accent">Add</button>
              </div>
            </section>
            <section className="adm-panel">
              <div className="adm-sub-head"><h3 className="adm-sub-title">Current Requirements<span className="adm-count">{reqs.length}</span></h3></div>
              {reqs.length === 0 ? (
                <div className="adm-empty-box"><p className="adm-empty-txt">No document requirements configured yet.</p></div>
              ) : (
                <div className="adm-list">
                  {reqs.map((req: any, i: number) => {
                    const dt = req.document_type;
                    return (
                      <div key={req.id} className="adm-row">
                        <div className="adm-row-order">{i + 1}</div>
                        <div className="adm-row-main">
                          <div className="adm-row-name">{dt?.name ?? "Unknown"} <code className="adm-code">{dt?.code}</code></div>
                          {dt?.description && <div className="adm-row-desc">{dt.description}</div>}
                          <div className="adm-row-meta">
                            <span className={`adm-badge ${req.is_required ? "adm-badge--red" : "adm-badge--neutral"}`}><span className="adm-badge-dot" />{req.is_required ? "Required" : "Optional"}</span>
                            {dt?.is_common_document && <span className="adm-badge adm-badge--blue"><span className="adm-badge-dot" />Common</span>}
                          </div>
                        </div>
                        <div className="adm-row-actions">
                          <button onClick={() => handleToggleRequired(req)} disabled={anyPending} className="adm-btn adm-btn--sm adm-btn--ghost">
                            Make {req.is_required ? "Optional" : "Required"}
                          </button>
                          <button onClick={() => removeDocMutation.mutate(req.id)} disabled={anyPending} className="adm-btn adm-btn--sm adm-btn--danger">Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )
      )}

      {/* ── DUE DATES TAB ── */}
      {tab === "duedates" && (
        isCreateMode ? (
          <section className="adm-panel">
            <div className="adm-empty-box"><p className="adm-empty-txt">Create the service first — then add due date templates here.</p></div>
          </section>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <section className="adm-panel">
              <div className="adm-sub-head"><h3 className="adm-sub-title">Add Due Date Template</h3></div>
              <div className="adm-form-grid">
                <div className="adm-field adm-field--full">
                  <label className="adm-label">Title</label>
                  <input value={ddTitle} onChange={e => setDdTitle(e.target.value)} className="adm-input" placeholder="e.g. ITR Filing Deadline" />
                </div>
                <div className="adm-field adm-field--full">
                  <label className="adm-label">Description <span className="adm-label-opt">(optional)</span></label>
                  <input value={ddDesc} onChange={e => setDdDesc(e.target.value)} className="adm-input" placeholder="Brief explanation" />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Recurrence</label>
                  <div className="adm-select-wrap">
                    <select value={ddRecurrence} onChange={e => setDdRecurrence(e.target.value as any)} className="adm-select">
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                    <span className="adm-select-ico">{Icon.chevronD}</span>
                  </div>
                </div>
                {ddRecurrence === "annual" && (
                  <div className="adm-field">
                    <label className="adm-label">Month</label>
                    <div className="adm-select-wrap">
                      <select value={ddMonth} onChange={e => setDdMonth(Number(e.target.value))} className="adm-select">
                        {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                      <span className="adm-select-ico">{Icon.chevronD}</span>
                    </div>
                  </div>
                )}
                <div className="adm-field">
                  <label className="adm-label">Day of Month</label>
                  <input type="number" min={1} max={31} value={ddDay} onChange={e => setDdDay(Number(e.target.value))} className="adm-input" />
                </div>
              </div>
              <div className="adm-savebar" style={{ marginTop: "1.1rem", justifyContent: "flex-start" }}>
                <button onClick={handleAddDd} disabled={anyPending || !ddTitle.trim()} className="adm-btn adm-btn--accent">Add Template</button>
              </div>
            </section>
            <section className="adm-panel">
              <div className="adm-sub-head"><h3 className="adm-sub-title">Configured Templates<span className="adm-count">{dueDates.length}</span></h3></div>
              {dueDates.length === 0 ? (
                <div className="adm-empty-box"><p className="adm-empty-txt">No due date templates. Add one above.</p></div>
              ) : (
                <div className="adm-list">
                  {dueDates.map((tpl: any) => (
                    <div key={tpl.id} className="adm-row">
                      <div className="adm-row-main">
                        <div className="adm-row-name">{tpl.title}</div>
                        {tpl.description && <div className="adm-row-desc">{tpl.description}</div>}
                        <div className="adm-row-meta">
                          <span className="adm-badge adm-badge--accent"><span className="adm-badge-dot" />{tpl.recurrence_type}</span>
                          <span className="adm-badge adm-badge--green"><span className="adm-badge-dot" />
                            {tpl.recurrence_type === "annual" ? `${MONTHS[tpl.applicable_month ?? 1]} ${tpl.applicable_day}` : `Day ${tpl.applicable_day}`}
                          </span>
                        </div>
                      </div>
                      <div className="adm-row-actions">
                        <button onClick={() => removeDdMutation.mutate(tpl.id)} disabled={anyPending} className="adm-btn adm-btn--sm adm-btn--danger">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      )}
    </div>
  );
}
