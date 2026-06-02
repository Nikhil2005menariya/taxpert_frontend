import { useState } from "react";
import Loader from "../../components/ui/Loader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

function rupeesToPaise(rupees: string): number {
  return Math.round(parseFloat(rupees) * 100);
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(0);
}

function Row({ service }: { service: any }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(paiseToRupees(service.price));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (paise: number) => {
      await apiClient.put(`/config/services/${service.id}`, { price: paise });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
      setEditing(false);
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to update price.");
    }
  });

  function cancel() {
    setValue(paiseToRupees(service.price));
    setEditing(false);
    setError(null);
  }

  function save() {
    const rupees = parseFloat(value);
    if (isNaN(rupees) || rupees < 0) { setError("Enter a valid amount"); return; }
    mutation.mutate(rupeesToPaise(value));
  }

  const displayPrice = service.price === 0 ? "Free" : `₹${parseInt(paiseToRupees(service.price)).toLocaleString("en-IN")}`;

  return (
    <tr className={`pr-row ${!service.is_active ? "pr-row-inactive" : ""}`}>
      <td className="pr-td pr-td-category">{service.category}</td>
      <td className="pr-td pr-td-name">
        {service.name}
        {!service.is_active && <span className="pr-inactive-badge">Inactive</span>}
      </td>
      <td className="pr-td pr-td-price">
        {editing ? (
          <div className="pr-edit-row">
            <span className="pr-rupee-sign">₹</span>
            <input
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="pr-price-input"
              autoFocus
            />
            {error && <span className="pr-field-error">{error}</span>}
          </div>
        ) : (
          <span className={`pr-price-display ${service.price === 0 ? "pr-free" : ""}`}>
            {displayPrice}
          </span>
        )}
      </td>
      <td className="pr-td pr-td-actions">
        {editing ? (
          <div className="pr-action-btns">
            <button onClick={save} disabled={mutation.isPending} className="pr-save-btn">
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} disabled={mutation.isPending} className="pr-cancel-btn">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="pr-edit-btn">
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

export default function PricingPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const [search, setSearch] = useState("");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const res = await apiClient.get("/config/services");
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  if (authLoading || isLoading) {
    return (
      <div className="page-loader"><Loader /></div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = search.trim()
    ? services.filter((s: any) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
      )
    : services;

  const categories = [...new Set(filtered.map((s: any) => s.category))] as string[];

  return (
    <div className="pr-shell">
      <div className="db-page-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title">Service Pricing</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          All prices are GST-inclusive (18%). Changes take effect immediately for new payments.
        </p>
      </div>

      <div className="pr-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <input
          type="search"
          placeholder="Search services…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", outline: "none", width: "100%", maxWidth: "300px" }}
        />
        <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{services.length} services</span>
      </div>

      <div className="pr-table-wrap" style={{ background: "white", borderRadius: "1rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Service</th>
              <th style={{ padding: "0.75rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Price (incl. 18% GST)</th>
              <th style={{ padding: "0.75rem 1.25rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              filtered
                .filter((s: any) => s.category === cat)
                .map((service: any) => <Row key={service.id} service={service} />)
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .pr-shell { padding-bottom: 3rem; }
        .pr-row { border-bottom: 1px solid #f1f5f9; }
        .pr-row:last-child { border-bottom: none; }
        .pr-row:hover { background: #f8fafc; }
        .pr-row-inactive { opacity: 0.6; }
        
        .pr-td { padding: 1rem 1.25rem; vertical-align: middle; }
        .pr-td-category { font-size: 0.875rem; color: #64748b; font-weight: 500; }
        .pr-td-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 0.75rem; }
        
        .pr-inactive-badge { font-size: 0.65rem; background: #fef2f2; color: #ef4444; padding: 0.1rem 0.4rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        
        .pr-price-display { font-size: 1rem; font-weight: 700; color: #0f172a; }
        .pr-free { color: #10b981; }
        
        .pr-edit-row { display: flex; align-items: center; gap: 0.5rem; }
        .pr-rupee-sign { color: #64748b; font-weight: 500; }
        .pr-price-input { padding: 0.4rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; font-size: 0.9rem; width: 100px; }
        .pr-price-input:focus { border-color: #2563eb; }
        
        .pr-field-error { font-size: 0.75rem; color: #ef4444; }
        
        .pr-action-btns { display: flex; gap: 0.5rem; }
        .pr-save-btn { padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: white; background: #2563eb; border: none; border-radius: 4px; cursor: pointer; }
        .pr-save-btn:hover { background: #1d4ed8; }
        .pr-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .pr-cancel-btn { padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #475569; background: #f1f5f9; border: none; border-radius: 4px; cursor: pointer; }
        .pr-cancel-btn:hover { background: #e2e8f0; }
        
        .pr-edit-btn { padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #2563eb; background: transparent; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; }
        .pr-edit-btn:hover { background: #eff6ff; }
      `}</style>
    </div>
  );
}
