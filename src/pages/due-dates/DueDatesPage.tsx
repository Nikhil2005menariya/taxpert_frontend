import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { computeClientDueDates } from "../../shared/due-dates";

export default function DueDatesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isClient = profile?.role === "client";

  const { data: dueDates = [], isLoading } = useQuery({
    queryKey: ["client-due-dates"],
    queryFn: async () => {
      const res = await apiClient.get("/client-services/due-dates");
      const active = res.data.data.map((s: any) => ({ slug: s.service?.slug ?? "", name: s.service?.name ?? "" })).filter((s: any) => s.slug);
      const raw = computeClientDueDates(active, 6);
      return raw;
    },
    enabled: isClient,
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isClient) return <Navigate to="/dashboard" replace />;

  const urgentCount = dueDates.filter((d: any) => d.urgency === "overdue" || d.urgency === "urgent").length;

  return (
    <div className="db-shell">
      <div className="db-page-header">
        <div>
          <h1 className="page-title">Due Dates</h1>
          <p className="page-sub" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            Compliance deadlines relevant to your active services.
            {urgentCount > 0 && (
              <span style={{ background: "#fef2f2", color: "#ef4444", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{urgentCount} need attention</span>
            )}
          </p>
        </div>
      </div>

      {dueDates.length === 0 ? (
        <div className="card text-center" style={{ padding: "4rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>No active compliance deadlines</h3>
          <p style={{ color: "#64748b" }}>Add a service to see your relevant compliance deadlines here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {dueDates.map((d: any) => {
            const urgencyColors: Record<string, { bg: string, text: string, border: string }> = {
              overdue: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
              urgent:  { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
              upcoming:{ bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
              future:  { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" }
            };
            const colors = urgencyColors[d.urgency] || urgencyColors.future;
            const dateStr = d.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", background: "white", padding: "1.25rem 1.5rem", borderRadius: "0.75rem", border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.text}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>{d.label}</span>
                    <span style={{ background: colors.bg, color: colors.text, padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {d.urgency}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{d.serviceName}</div>
                  {d.description && <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "0.5rem", background: "#f8fafc", padding: "0.5rem", borderRadius: "0.375rem" }}>{d.description}</div>}
                </div>
                <div style={{ textAlign: "right", marginLeft: "1.5rem", minWidth: "100px" }}>
                  <div style={{ fontSize: "0.875rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "0.25rem" }}>Due By</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: colors.text }}>{dateStr}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
