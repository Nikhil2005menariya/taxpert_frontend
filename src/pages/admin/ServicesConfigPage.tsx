import { useState } from "react";
import Loader from "../../components/ui/Loader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Link, Navigate, useNavigate } from "react-router-dom";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  chevronD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  docs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  ),
};

function AddButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button className="adm-add" type="button" title={title} aria-label={title} onClick={onClick}>
      <svg viewBox="0 0 24 24" height="46" width="46" xmlns="http://www.w3.org/2000/svg">
        <path strokeWidth="1.5" d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" />
        <path strokeWidth="1.5" d="M8 12H16" />
        <path strokeWidth="1.5" d="M12 16V8" />
      </svg>
    </button>
  );
}

export default function ServicesConfigPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services-config"],
    queryFn: async () => {
      const [servicesRes, categoriesRes] = await Promise.all([
        apiClient.get("/config/services"),
        apiClient.get("/config/categories")
      ]);
      return {
        services: servicesRes.data.data ?? [],
        categories: categoriesRes.data.data ?? []
      };
    },
    enabled: isAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string, current: boolean }) => {
      await apiClient.patch(`/config/services/${id}/toggle`, { is_active: !current });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services-config"] });
    },
  });

  if (authLoading || isLoading) {
    return <div className="page-loader"><Loader /></div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const services = data?.services ?? [];
  const categories = data?.categories ?? [];
  const activeCount = services.filter((s: any) => s.is_active).length;

  const filtered = services.filter((s: any) => {
    const matchSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || s.category_id === filterCat || s.category === filterCat;
    const matchActive = filterActive === "all" || (filterActive === "active" ? s.is_active : !s.is_active);
    return matchSearch && matchCat && matchActive;
  });

  const catMap = new Map<string, { label: string; services: any[] }>();
  for (const svc of filtered) {
    const catId = svc.category_id ?? svc.category;
    const catLabel = svc.service_category?.name ?? svc.category;
    if (!catMap.has(catId)) catMap.set(catId, { label: catLabel, services: [] });
    catMap.get(catId)!.services.push(svc);
  }
  const groups = [...catMap.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));

  return (
    <div className="adm-root">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Service Configuration</p>
            <h1 className="adm-hero-title">Services Catalog</h1>
            <p className="adm-hero-date">
              Manage services, categories, document requirements, and compliance deadlines.
              {!isSuperAdmin && " Contact Super Admin to create or archive services."}
            </p>
          </div>
          <div className="adm-hero-stats">
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{services.length}</div><div className="adm-hero-stat-lbl">Services</div></div>
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{activeCount}</div><div className="adm-hero-stat-lbl">Active</div></div>
            <div className="adm-hero-stat"><div className="adm-hero-stat-val">{categories.length}</div><div className="adm-hero-stat-lbl">Categories</div></div>
          </div>
        </div>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <div className="adm-panel-titles">
            <h2 className="adm-panel-title">All services<span className="adm-count">{filtered.length}</span></h2>
            <p className="adm-panel-desc">Grouped by category. Edit pricing, documents, and deadlines per service.</p>
          </div>
          <div className="adm-actions">
            <Link to="/admin/document-types" className="adm-btn adm-btn--ghost">
              {Icon.docs} Document Types
            </Link>
            <AddButton title="New service" onClick={() => navigate("/admin/services/new")} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search">
            <span className="adm-search-ico">{Icon.search}</span>
            <input
              className="adm-search-input"
              placeholder="Search services or slugs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="adm-search-clear" onClick={() => setSearch("")} aria-label="Clear search">{Icon.x}</button>
            )}
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
          <div className="adm-filter">
            <select className="adm-filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
              <option value="all">All statuses</option>
            </select>
            <span className="adm-filter-ico">{Icon.chevronD}</span>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="adm-empty-box">
            <span className="adm-empty-ico">{Icon.empty}</span>
            <p className="adm-empty-txt">No services match your filters.</p>
          </div>
        ) : (
          groups.map(([catId, { label, services: svcs }]) => (
            <div key={catId} className="adm-group">
              <div className="adm-group-head">
                <span className="adm-group-title">{label}</span>
                <span className="adm-group-count">{svcs.length} service{svcs.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="adm-tbl-wrap">
                <table className="adm-tbl">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Slug</th>
                      <th>Price</th>
                      <th>FY Required</th>
                      <th>Status</th>
                      <th className="adm-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svcs.map(svc => (
                      <tr key={svc.id} style={{ opacity: svc.is_active ? 1 : 0.55 }}>
                        <td>
                          <div className="adm-tbl-name">{svc.name}</div>
                        </td>
                        <td><code className="adm-code">{svc.slug}</code></td>
                        <td><span className="adm-money">{paiseToRupees(svc.price)}</span></td>
                        <td>
                          <span className={`adm-badge ${svc.requires_fy ? "adm-badge--green" : "adm-badge--neutral"}`}>
                            <span className="adm-badge-dot" />{svc.requires_fy ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-badge ${svc.is_active ? "adm-badge--green" : "adm-badge--neutral"}`}>
                            <span className="adm-badge-dot" />{svc.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="adm-cell-actions">
                          <div className="adm-actions">
                            {isSuperAdmin && (
                              <button
                                className={`adm-btn adm-btn--sm ${svc.is_active ? "adm-btn--ghost" : "adm-btn--accent"}`}
                                disabled={toggleMutation.isPending}
                                onClick={() => toggleMutation.mutate({ id: svc.id, current: svc.is_active })}
                              >
                                {svc.is_active ? "Deactivate" : "Activate"}
                              </button>
                            )}
                            <Link to={`/admin/services/${svc.id}`} className="adm-view">
                              Edit
                              <span className="adm-view-ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                              </span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
