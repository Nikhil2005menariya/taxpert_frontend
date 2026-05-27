import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";
import { Navigate } from "react-router-dom";
import OpsServicesClient, { type OpsServiceRow } from "./OpsServicesClient";
import PendingDocsPanel from "../../components/staff/PendingDocsPanel";
import UnassignedAlert from "../../components/staff/UnassignedAlert";

export default function WorkloadPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isStaff = profile?.role !== 'client' && profile?.role !== 'user';

  const { data, isLoading } = useQuery({
    queryKey: ['workload-dashboard'],
    queryFn: async () => {
      const [opsRes, pendingRes, unassignedRes, taxpertsRes] = await Promise.all([
        apiClient.get('/client-services/ops'),
        apiClient.get('/reminders/pending-clients'),
        apiClient.get('/client-services/unassigned'),
        apiClient.get('/admin/taxperts/active'),
      ]);
      return {
        opsServices: opsRes.data.data,
        pendingClients: pendingRes.data.data,
        unassigned: unassignedRes.data.data,
        taxperts: taxpertsRes.data.data,
      };
    },
    enabled: isStaff, // Only fetch if staff
  });

  if (authLoading || isLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  const opsServices = (data?.opsServices ?? []) as OpsServiceRow[];
  const pendingClients = data?.pendingClients ?? [];
  const unassigned = data?.unassigned ?? [];
  const taxperts = data?.taxperts ?? [];

  const activeCount = opsServices.filter(
    (r) => !["completed", "cancelled"].includes(r.status),
  ).length;
  const urgentCount = opsServices.filter(
    (r) =>
      r.status === "documents_required" || r.status === "invoice_pending",
  ).length;

  return (
    <div className="ops-page">
      {/* Header */}
      <div className="ops-header">
        <div>
          <p className="ops-kicker">Operations</p>
          <h1 className="ops-title">Client Services</h1>
        </div>
        <div className="ops-meta-stats">
          <div className="ops-stat">
            <span className="ops-stat-num">{opsServices.length}</span>
            <span className="ops-stat-label">Total</span>
          </div>
          <div className="ops-stat">
            <span className="ops-stat-num">{activeCount}</span>
            <span className="ops-stat-label">Active</span>
          </div>
          {urgentCount > 0 && (
            <div className="ops-stat ops-stat-urgent">
              <span className="ops-stat-num">{urgentCount}</span>
              <span className="ops-stat-label">Need Action</span>
            </div>
          )}
        </div>
      </div>

      {unassigned.length > 0 && (
        <UnassignedAlert services={unassigned} taxperts={taxperts} />
      )}

      {pendingClients.length > 0 && (
        <PendingDocsPanel data={pendingClients} />
      )}

      {!opsServices.length ? (
        <div className="ops-empty-page">
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
          <h3>No client services</h3>
          <p>No clients have been assigned services yet.</p>
        </div>
      ) : (
        <OpsServicesClient rows={opsServices} />
      )}

      <style>{`
        .ops-page { padding-bottom: 3rem; }
        .ops-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;
        }
        .ops-kicker {
          font-size: 0.72rem; font-weight: 700; color: #2563eb;
          text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 0.2rem;
        }
        .ops-title { font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0; }
        .ops-meta-stats { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .ops-stat {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 0.875rem;
          padding: 0.6rem 1rem; display: flex; flex-direction: column;
          align-items: center; gap: 0.05rem; min-width: 72px;
          box-shadow: 0 1px 4px rgba(15,23,42,0.04);
        }
        .ops-stat-urgent { border-color: #fecaca; background: #fef2f2; }
        .ops-stat-num { font-size: 1.4rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .ops-stat-urgent .ops-stat-num { color: #dc2626; }
        .ops-stat-label {
          font-size: 0.68rem; font-weight: 600; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ops-empty-page {
          text-align: center; padding: 4rem 2rem; color: #94a3b8;
          background: #fafafa; border: 1.5px dashed #e2e8f0; border-radius: 1.25rem;
        }
        .ops-empty-page h3 { color: #0f172a; margin: 0 0 0.35rem; font-size: 1rem; }
        .ops-empty-page p  { margin: 0; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
