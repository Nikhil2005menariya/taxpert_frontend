import { useState } from "react";
import Loader from "../../components/ui/Loader";
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

const ChevD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
);

interface FormState {
  code: string; description: string; type: "flat" | "percent";
  value: string; min_order: string; max_discount: string; usage_limit: string; valid_until: string;
}

const EMPTY_FORM: FormState = { code: "", description: "", type: "flat", value: "", min_order: "", max_discount: "", usage_limit: "", valid_until: "" };

export default function CouponsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await apiClient.get("/coupons/admin/all");
      return res.data.data ?? [];
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (newCoupon: any) => {
      await apiClient.post("/coupons/admin/create", newCoupon);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || "Failed to create coupon.");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      await apiClient.patch(`/coupons/admin/${id}/toggle`, { isActive: is_active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onSettled: () => setToggling(null),
  });

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const value = Math.round(parseFloat(form.value) * 100);
    createMutation.mutate({
      code:        form.code.toUpperCase().trim(),
      description: form.description || undefined,
      type:        form.type,
      value,
      min_order:    form.min_order   ? Math.round(parseFloat(form.min_order) * 100)   : undefined,
      max_discount: form.max_discount ? Math.round(parseFloat(form.max_discount) * 100) : undefined,
      usage_limit:  form.usage_limit ? parseInt(form.usage_limit) : undefined,
      valid_until:  form.valid_until || undefined,
    });
  }

  function handleToggle(id: string, current: boolean) {
    setToggling(id);
    toggleMutation.mutate({ id, is_active: !current });
  }

  function openForm() { setForm(EMPTY_FORM); setFormError(null); setShowForm(true); }

  const activeCount = coupons.filter((c: any) => c.is_active).length;

  return (
    <div className="adm-root">
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Billing</p>
            <h1 className="adm-hero-title">Coupons</h1>
            <p className="adm-hero-date">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} · {activeCount} active</p>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">All coupons{coupons.length > 0 && <span className="adm-count">{coupons.length}</span>}</h2>
            <p className="adm-panel-desc">Discount and referral codes available at checkout.</p>
          </div>
          <button className="adm-add" type="button" title="New coupon" aria-label="New coupon" onClick={openForm}>
            <svg viewBox="0 0 24 24" height="46" width="46" xmlns="http://www.w3.org/2000/svg">
              <path strokeWidth="1.5" d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" />
              <path strokeWidth="1.5" d="M8 12H16" /><path strokeWidth="1.5" d="M12 16V8" />
            </svg>
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h2M9 5h10a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H9M9 5v14" strokeDasharray="2 3" /></svg>
            </span>
            <p className="adm-empty-txt">No coupons yet.</p>
          </div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Code</th><th>Type</th><th>Value</th><th>Min order</th>
                  <th>Used</th><th>Limit</th><th>Expires</th><th>Status</th>
                  <th className="adm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <code className="adm-code" style={{ fontWeight: 700 }}>{c.code}</code>
                        {c.is_referral && <span className="adm-badge adm-badge--green" style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>referral</span>}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                    <td className="adm-mono" style={{ fontWeight: 600, color: 'var(--lp-ink)' }}>{formatValue(c)}</td>
                    <td className="adm-mono">{c.min_order > 0 ? formatRupees(c.min_order) : "—"}</td>
                    <td><span className="adm-chip-num">{c.used_count}</span></td>
                    <td className="adm-mono">{c.usage_limit ?? "∞"}</td>
                    <td className="adm-mono">
                      {c.valid_until
                        ? new Date(c.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "Never"}
                    </td>
                    <td>
                      <span className={`adm-badge ${c.is_active ? 'adm-badge--green' : 'adm-badge--neutral'}`}>
                        <span className="adm-badge-dot" />{c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="adm-cell-actions">
                      <div className="adm-actions">
                        <button
                          className={`adm-btn adm-btn--sm ${c.is_active ? 'adm-btn--danger' : 'adm-btn--accent'}`}
                          disabled={toggling === c.id}
                          onClick={() => handleToggle(c.id, c.is_active)}
                        >
                          {toggling === c.id ? "…" : c.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="adm-modal-overlay" onClick={() => setShowForm(false)}>
          <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={handleCreate} style={{ maxWidth: 580 }}>
            <div className="adm-modal-head">
              <div>
                <p className="adm-modal-eyebrow">— New</p>
                <h3 className="adm-modal-title">Create Coupon</h3>
              </div>
              <button type="button" className="adm-modal-x" onClick={() => setShowForm(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label className="adm-label">Code</label>
                  <input required className="adm-input" placeholder="SAVE500" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Type</label>
                  <div className="adm-select-wrap">
                    <select className="adm-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "flat" | "percent" }))}>
                      <option value="flat">Flat (₹)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                    <span className="adm-select-ico">{ChevD}</span>
                  </div>
                </div>
                <div className="adm-field">
                  <label className="adm-label">{form.type === "flat" ? "Discount (₹)" : "Discount (%)"}</label>
                  <input required type="number" min="0" step="0.01" className="adm-input" placeholder={form.type === "flat" ? "500" : "10"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Min order (₹)</label>
                  <input type="number" min="0" className="adm-input" placeholder="0" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} />
                </div>
                {form.type === "percent" && (
                  <div className="adm-field">
                    <label className="adm-label">Max discount (₹)</label>
                    <input type="number" min="0" className="adm-input" placeholder="1000" value={form.max_discount} onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} />
                  </div>
                )}
                <div className="adm-field">
                  <label className="adm-label">Usage limit</label>
                  <input type="number" min="1" className="adm-input" placeholder="Unlimited" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Valid until</label>
                  <input type="datetime-local" className="adm-input" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
                <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="adm-label">Description <span className="adm-label-opt">(optional)</span></label>
                  <input className="adm-input" placeholder="Label shown to the user" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              {formError && (
                <p className="adm-modal-err">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                  {formError}
                </p>
              )}
            </div>
            <div className="adm-modal-foot">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="adm-btn adm-btn--accent" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
