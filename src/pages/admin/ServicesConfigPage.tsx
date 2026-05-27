import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

export default function ServicesConfigPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
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
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const services = data?.services ?? [];
  const categories = data?.categories ?? [];

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
    <div className="svc-cfg-page">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="svc-kicker">Service Configuration</p>
          <h1 className="page-title">Services Catalog</h1>
          <p className="svc-subtitle">
            Manage all services, categories, document requirements, and compliance deadlines.
            {!isSuperAdmin && " Contact Super Admin to create or archive services."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <Link to="/admin/document-types" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
            Document Types
          </Link>
          {isSuperAdmin && (
            <Link to="/admin/services/new" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
              + New Service
            </Link>
          )}
        </div>
      </div>

      <div className="sc-shell">
        <div className="sc-toolbar">
          <input
            type="search"
            placeholder="Search services or slugs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sc-search"
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="sc-select">
            <option value="all">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} className="sc-select">
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">All statuses</option>
          </select>
          <span className="sc-count">{filtered.length} services</span>
        </div>

        {groups.length === 0 ? (
          <div className="sc-empty">No services match your filters.</div>
        ) : (
          groups.map(([catId, { label, services: svcs }]) => (
            <div key={catId} className="sc-group">
              <div className="sc-group-header">
                <span className="sc-group-title">{label}</span>
                <span className="sc-group-count">{svcs.length} service{svcs.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Slug</th>
                      <th>Price</th>
                      <th>FY Required</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svcs.map(svc => (
                      <tr key={svc.id} className={!svc.is_active ? "sc-row-inactive" : ""}>
                        <td className="sc-name">
                          {svc.name}
                          {!svc.is_active && <span className="sc-badge sc-badge-inactive">Inactive</span>}
                        </td>
                        <td><code className="sc-slug">{svc.slug}</code></td>
                        <td className="sc-price">{paiseToRupees(svc.price)}</td>
                        <td>
                          <span className={`sc-badge ${svc.requires_fy ? "sc-badge-fy" : "sc-badge-no"}`}>
                            {svc.requires_fy ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <span className={`sc-status-dot ${svc.is_active ? "sc-dot-active" : "sc-dot-inactive"}`} />
                          {svc.is_active ? "Active" : "Inactive"}
                        </td>
                        <td>
                          <div className="sc-actions">
                            <Link to={`/admin/services/${svc.id}`} className="sc-btn sc-btn-edit">
                              Edit
                            </Link>
                            {isSuperAdmin && (
                              <button
                                className={`sc-btn ${svc.is_active ? "sc-btn-deactivate" : "sc-btn-activate"}`}
                                disabled={toggleMutation.isPending}
                                onClick={() => toggleMutation.mutate({ id: svc.id, current: svc.is_active })}
                              >
                                {svc.is_active ? "Deactivate" : "Activate"}
                              </button>
                            )}
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
      </div>

      <style>{`
        .svc-cfg-page { padding-bottom: 3rem; }
        .svc-kicker { margin: 0 0 0.35rem; color: #7c3aed; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
        .svc-subtitle { font-size: 0.83rem; color: #94a3b8; margin: 0.3rem 0 0; max-width: 60ch; }
        .sc-shell { display: flex; flex-direction: column; gap: 1.5rem; }

        .sc-toolbar {
          display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
          background: white; border: 1px solid #e2e8f0; border-radius: 1rem;
          padding: 0.85rem 1rem;
        }
        .sc-search {
          flex: 1; min-width: 200px; padding: 0.5rem 0.875rem; border-radius: 0.5rem;
          border: 1px solid #e2e8f0; font-size: 0.875rem; outline: none;
          background: #f8fafc; color: #0f172a;
        }
        .sc-search:focus { border-color: #7c3aed; background: white; }
        .sc-select {
          padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0;
          font-size: 0.82rem; background: #f8fafc; color: #475569; outline: none;
        }
        .sc-count { font-size: 0.78rem; color: #94a3b8; white-space: nowrap; margin-left: auto; }

        .sc-group { }
        .sc-group-header {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem;
        }
        .sc-group-title {
          font-size: 0.8rem; font-weight: 700; color: #475569;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .sc-group-count {
          font-size: 0.72rem; background: #f1f5f9; color: #94a3b8;
          padding: 0.1rem 0.5rem; border-radius: 999px;
        }

        .sc-table-wrap {
          border: 1px solid #e2e8f0; border-radius: 0.875rem; overflow: hidden;
          box-shadow: 0 2px 12px rgba(15,23,42,0.04);
        }
        .sc-table { width: 100%; border-collapse: collapse; font-size: 0.845rem; background: white; }
        .sc-table thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .sc-table th {
          padding: 0.65rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; white-space: nowrap;
        }
        .sc-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .sc-table tbody tr:last-child td { border-bottom: none; }
        .sc-table tbody tr:hover td { background: #fafbff; }
        .sc-row-inactive td { opacity: 0.55; }

        .sc-name { font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
        .sc-slug {
          font-family: 'Courier New', monospace; font-size: 0.75rem;
          background: #f1f5f9; color: #475569; padding: 0.15rem 0.5rem;
          border-radius: 4px; border: 1px solid #e2e8f0;
        }
        .sc-price { font-weight: 600; color: #059669; }

        .sc-badge {
          display: inline-flex; align-items: center; padding: 0.18rem 0.5rem;
          border-radius: 999px; font-size: 0.7rem; font-weight: 700; white-space: nowrap;
        }
        .sc-badge-inactive { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .sc-badge-fy       { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }
        .sc-badge-no       { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }

        .sc-status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; margin-right: 0.4rem; }
        .sc-dot-active   { background: #22c55e; }
        .sc-dot-inactive { background: #cbd5e1; }

        .sc-actions { display: flex; gap: 0.4rem; }
        .sc-btn {
          font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.75rem; border-radius: 6px;
          border: 1px solid transparent; cursor: pointer; transition: opacity 0.15s;
          text-decoration: none; display: inline-flex; align-items: center;
        }
        .sc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sc-btn-edit       { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .sc-btn-deactivate { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
        .sc-btn-activate   { background: #f0fdf4; color: #059669; border-color: #bbf7d0; }
        .sc-btn:hover:not(:disabled) { opacity: 0.75; }

        .sc-empty {
          text-align: center; padding: 3rem; background: #fafafa;
          border: 1.5px dashed #e2e8f0; border-radius: 1rem; color: #94a3b8; font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
