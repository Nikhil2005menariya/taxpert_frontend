import { useState } from "react";
import Loader from "../../components/ui/Loader";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

export default function NewServicePage() {
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [catId, setCatId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [requiresFy, setRequiresFy] = useState(false);

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/config/categories");
      return res.data.data ?? [];
    },
    enabled: profile?.role === "super_admin",
  });

  const mutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const res = await apiClient.post("/config/services", serviceData);
      return res.data.data;
    },
    onSuccess: (data) => {
      navigate(`/admin/services/${data.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to create service.");
    }
  });

  if (authLoading || catLoading) {
    return (
      <div className="page-loader"><Loader /></div>
    );
  }

  if (profile?.role !== "super_admin") {
    return <Navigate to="/admin/services" replace />;
  }

  function handleNameChange(v: string) {
    setName(v);
    setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  function handleCreate() {
    if (!name.trim() || !slug.trim() || !price) { setError("Name, slug, and price are required."); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { setError("Enter a valid price in ₹."); return; }
    const cat = categories.find((c: any) => c.id === catId);

    mutation.mutate({
      name: name.trim(),
      slug: slug.trim(),
      category: cat?.name ?? "Other",
      category_id: catId || null,
      summary: summary || null,
      description: description || null,
      price: Math.round(priceNum * 100),
      requires_fy: requiresFy,
    });
  }

  return (
    <div style={{ paddingBottom: "3rem", maxWidth: 720 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 0.35rem", color: "#7c3aed", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Services → New
        </p>
        <h1 className="page-title">Create Service</h1>
      </div>
      
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "1.75rem" }}>
        {error && (
          <div style={{ padding: "0.65rem 1rem", borderRadius: "0.5rem", fontSize: "0.84rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: "1.25rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
          {[
            { label: "Service Name *", val: name, set: handleNameChange, ph: "e.g. GST Registration" },
            { label: "Slug *", val: slug, set: setSlug, ph: "e.g. gst-registration" },
          ].map(f => (
            <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }} />
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category *</label>
            <select value={catId} onChange={e => setCatId(e.target.value)} style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }}>
              <option value="">— Select category —</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Price (₹ incl. GST) *</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "#94a3b8" }}>₹</span>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="1499" style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a", width: 140 }} />
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Summary (short)</label>
            <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="One-line description for clients" style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a" }} />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Description (detail)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Longer service description shown on service detail page" style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "#f8fafc", color: "#0f172a", resize: "vertical", fontFamily: "inherit" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>FY Required</label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={requiresFy} onChange={e => setRequiresFy(e.target.checked)} />
              Client must specify fiscal year when enrolling
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button onClick={handleCreate} disabled={mutation.isPending} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>
            {mutation.isPending ? "Creating…" : "Create Service"}
          </button>
          <Link to="/admin/services" className="btn btn-secondary" style={{ fontSize: "0.875rem" }}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
