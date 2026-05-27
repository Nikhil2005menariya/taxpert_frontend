import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatValue(coupon: any) {
  if (coupon.type === "flat") return formatRupees(coupon.value);
  return `${coupon.value / 100}%`;
}

export default function CouponsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "flat" as "flat" | "percent",
    value: "",
    min_order: "",
    max_discount: "",
    usage_limit: "",
    valid_until: "",
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await apiClient.get("/coupons");
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (newCoupon: any) => {
      await apiClient.post("/coupons", newCoupon);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowForm(false);
      setForm({ code: "", description: "", type: "flat", value: "", min_order: "", max_discount: "", usage_limit: "", valid_until: "" });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || "Failed to create coupon.");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      await apiClient.patch(`/coupons/${id}/toggle`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onSettled: () => {
      setToggling(null);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const value = form.type === "flat"
      ? Math.round(parseFloat(form.value) * 100)
      : Math.round(parseFloat(form.value) * 100);

    createMutation.mutate({
      code:        form.code.toUpperCase().trim(),
      description: form.description || undefined,
      type:        form.type,
      value,
      min_order:   form.min_order  ? Math.round(parseFloat(form.min_order) * 100)  : undefined,
      max_discount: form.max_discount ? Math.round(parseFloat(form.max_discount) * 100) : undefined,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      valid_until: form.valid_until || undefined,
    });
  }

  async function handleToggle(id: string, current: boolean) {
    setToggling(id);
    toggleMutation.mutate({ id, is_active: !current });
  }

  return (
    <div className="cp-shell">
      <div className="cp-header">
        <h1 className="cp-title">Coupons</h1>
        <button className="btn btn-primary cp-create-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancel" : "+ New Coupon"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cp-form">
          <h2 className="cp-form-title">Create Coupon</h2>
          <div className="cp-form-grid">
            <label className="cp-field">
              <span>Code</span>
              <input
                required
                className="cp-input"
                placeholder="e.g. SAVE500"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </label>
            <label className="cp-field">
              <span>Type</span>
              <select
                className="cp-input"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as "flat" | "percent" }))}
              >
                <option value="flat">Flat (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </label>
            <label className="cp-field">
              <span>{form.type === "flat" ? "Discount (₹)" : "Discount (%)"}</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="cp-input"
                placeholder={form.type === "flat" ? "500" : "10"}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </label>
            <label className="cp-field">
              <span>Min order (₹)</span>
              <input
                type="number"
                min="0"
                className="cp-input"
                placeholder="0"
                value={form.min_order}
                onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
              />
            </label>
            {form.type === "percent" && (
              <label className="cp-field">
                <span>Max discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  className="cp-input"
                  placeholder="1000"
                  value={form.max_discount}
                  onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))}
                />
              </label>
            )}
            <label className="cp-field">
              <span>Usage limit</span>
              <input
                type="number"
                min="1"
                className="cp-input"
                placeholder="Unlimited"
                value={form.usage_limit}
                onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
              />
            </label>
            <label className="cp-field">
              <span>Valid until</span>
              <input
                type="datetime-local"
                className="cp-input"
                value={form.valid_until}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
              />
            </label>
            <label className="cp-field cp-field-full">
              <span>Description</span>
              <input
                className="cp-input"
                placeholder="Optional label shown to user"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>
          {formError && <p className="cp-form-error">{formError}</p>}
          <div className="cp-form-actions">
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Coupon"}
            </button>
          </div>
        </form>
      )}

      <div className="cp-table-wrap">
        <table className="cp-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min order</th>
              <th>Used</th>
              <th>Limit</th>
              <th>Expires</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c: any) => (
              <tr key={c.id} className={c.is_referral ? "cp-row-referral" : ""}>
                <td className="cp-code-cell">
                  <span className="cp-code">{c.code}</span>
                  {c.is_referral && <span className="cp-referral-tag">referral</span>}
                </td>
                <td>{c.type}</td>
                <td>{formatValue(c)}</td>
                <td>{c.min_order > 0 ? formatRupees(c.min_order) : "—"}</td>
                <td>{c.used_count}</td>
                <td>{c.usage_limit ?? "∞"}</td>
                <td>
                  {c.valid_until
                    ? new Date(c.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "Never"}
                </td>
                <td>
                  <span className={`cp-status-badge cp-status-${c.is_active ? "active" : "inactive"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    className="cp-toggle-btn"
                    disabled={toggling === c.id}
                    onClick={() => handleToggle(c.id, c.is_active)}
                  >
                    {toggling === c.id ? "…" : c.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={9} className="cp-empty">No coupons yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .cp-shell { padding-bottom: 3rem; }
        .cp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .cp-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
        
        .cp-form { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .cp-form-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 1.25rem; }
        .cp-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        
        .cp-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .cp-field span { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .cp-field-full { grid-column: 1 / -1; }
        
        .cp-input { padding: 0.6rem 0.8rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
        .cp-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        
        .cp-form-error { color: #b91c1c; font-size: 0.875rem; margin: 1rem 0 0; }
        .cp-form-actions { margin-top: 1.25rem; }
        
        .cp-table-wrap { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .cp-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
        .cp-table th { background: #f8fafc; padding: 0.75rem 1rem; color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
        .cp-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .cp-table tbody tr:last-child td { border-bottom: none; }
        .cp-table tbody tr:hover td { background: #f8fafc; }
        
        .cp-row-referral td { background: #f0fdf4 !important; }
        
        .cp-code-cell { display: flex; align-items: center; gap: 0.5rem; }
        .cp-code { font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 0.25rem; }
        .cp-referral-tag { font-size: 0.65rem; font-weight: 700; color: #059669; background: #d1fae5; padding: 0.1rem 0.4rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .cp-status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
        .cp-status-active { background: #dcfce7; color: #166534; }
        .cp-status-inactive { background: #f1f5f9; color: #64748b; }
        
        .cp-toggle-btn { font-size: 0.75rem; font-weight: 600; color: #2563eb; background: none; border: none; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 0.25rem; }
        .cp-toggle-btn:hover { background: #eff6ff; }
        .cp-toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .cp-empty { text-align: center; padding: 3rem; color: #94a3b8; font-style: italic; }
      `}</style>
    </div>
  );
}
