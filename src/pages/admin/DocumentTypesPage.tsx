import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function DocumentTypesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const [search, setSearch] = useState("");
  const [filterCommon, setFilterCommon] = useState<"all" | "common" | "service">("all");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isCommon, setIsCommon] = useState(false);
  const [maxMb, setMaxMb] = useState("10");
  const [exts, setExts] = useState("pdf,jpg,jpeg,png");

  const { data: docTypes, isLoading } = useQuery({
    queryKey: ["admin-doc-types"],
    queryFn: async () => {
      const res = await apiClient.get("/config/document-types");
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: async (newDocType: any) => {
      await apiClient.post("/config/document-types", newDocType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doc-types"] });
      setMsg({ type: "ok", text: "Document type created." });
      setCode(""); setName(""); setDesc(""); setIsCommon(false); setMaxMb("10"); setExts("pdf,jpg,jpeg,png");
      setShowForm(false);
      setTimeout(() => setMsg(null), 3000);
    },
    onError: (err: any) => {
      setMsg({ type: "err", text: err.response?.data?.error || "Failed to create document type." });
      setTimeout(() => setMsg(null), 3000);
    }
  });

  if (authLoading || isLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const allDocTypes = docTypes ?? [];

  const filtered = allDocTypes.filter((d: any) => {
    const matchSearch = !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase());
    const matchCommon = filterCommon === "all" || (filterCommon === "common" ? d.is_common_document : !d.is_common_document);
    return matchSearch && matchCommon;
  });

  function handleCreate() {
    if (!code.trim() || !name.trim()) return;
    mutation.mutate({
      code,
      name,
      description: desc || null,
      is_common_document: isCommon,
      allowed_extensions: exts.split(",").map(e => e.trim()).filter(Boolean),
      max_file_size_mb: parseInt(maxMb) || 10,
    });
  }

  return (
    <div style={{ paddingBottom: "3rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="page-header" style={{ marginBottom: "0.5rem" }}>
        <div>
          <p style={{ margin: "0 0 0.35rem", color: "#7c3aed", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Service Configuration
          </p>
          <h1 className="page-title">Document Types Registry</h1>
          <p style={{ fontSize: "0.83rem", color: "#94a3b8", margin: "0.3rem 0 0", maxWidth: "60ch" }}>
            Normalized document type catalog. Assign these to services via the Services editor.
          </p>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "0.5rem", fontSize: "0.84rem", fontWeight: 600, background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#059669" : "#b91c1c", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>
          {msg.text}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", background: "white", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "0.85rem 1rem" }}>
        <input
          type="search"
          placeholder="Search by name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }}
        />
        <select value={filterCommon} onChange={e => setFilterCommon(e.target.value as typeof filterCommon)} style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#f8fafc", color: "#475569", outline: "none" }}>
          <option value="all">All types</option>
          <option value="common">Common docs</option>
          <option value="service">Service-specific</option>
        </select>
        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{filtered.length} types</span>
        {isSuperAdmin && (
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
            {showForm ? "Cancel" : "+ New Type"}
          </button>
        )}
      </div>

      {/* New type form */}
      {showForm && isSuperAdmin && (
        <div style={{ background: "white", border: "1px solid #e9d5ff", borderRadius: "1rem", padding: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem", paddingBottom: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
            New Document Type
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Code (e.g. FORM_16)", val: code, set: setCode, placeholder: "FORM_16" },
              { label: "Display Name", val: name, set: setName, placeholder: "Form 16 (Part A & B)" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this document is" style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }} />
            </div>
            {[
              { label: "Allowed Extensions (comma-separated)", val: exts, set: setExts, placeholder: "pdf,jpg,jpeg,png" },
              { label: "Max File Size (MB)", val: maxMb, set: setMaxMb, placeholder: "10" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }} />
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Common Document?</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
                <input type="checkbox" checked={isCommon} onChange={e => setIsCommon(e.target.checked)} />
                Required across many services (PAN, Aadhaar, etc.)
              </label>
            </div>
          </div>
          <button onClick={handleCreate} disabled={mutation.isPending || !code.trim() || !name.trim()} className="btn btn-primary" style={{ fontSize: "0.875rem", marginTop: "1.25rem" }}>
            {mutation.isPending ? "Creating…" : "Create Document Type"}
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.875rem", overflow: "hidden", boxShadow: "0 2px 12px rgba(15,23,42,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.845rem", background: "white" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Code", "Name", "Description", "Extensions", "Max MB", "Flags"].map(h => (
                <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "0.85rem 1rem", verticalAlign: "middle" }}>
                  <code style={{ fontFamily: "'Courier New',monospace", fontSize: "0.75rem", background: "#f1f5f9", color: "#475569", padding: "0.15rem 0.5rem", borderRadius: 4, border: "1px solid #e2e8f0" }}>{d.code}</code>
                </td>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "#0f172a" }}>{d.name}</td>
                <td style={{ padding: "0.85rem 1rem", color: "#64748b", fontSize: "0.8rem", maxWidth: 260 }}>{d.description ?? "—"}</td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {d.allowed_extensions.map((e: string) => (
                      <span key={e} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.68rem", padding: "0.1rem 0.4rem", color: "#64748b", fontFamily: "monospace" }}>{e}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: "#64748b" }}>{d.max_file_size_mb} MB</td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  {d.is_common_document && (
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem" }}>Common</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>No document types found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
