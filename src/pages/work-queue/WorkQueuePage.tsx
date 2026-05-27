import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";

function formatDueDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatClientName(
  client: { first_name?: string | null; last_name?: string | null } | null | undefined
) {
  const first = client?.first_name?.trim() ?? "";
  const last = client?.last_name?.trim() ?? "";
  return `${first} ${last}`.trim() || "Client";
}

export default function WorkQueuePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isStaff = profile?.role !== 'client' && profile?.role !== 'user';

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-queue'],
    queryFn: async () => {
      const [workloadRes, tasksRes] = await Promise.all([
        apiClient.get('/operations/workload'),
        apiClient.get('/operations/task-inbox'),
      ]);
      return {
        workload: workloadRes.data.data,
        tasks: tasksRes.data.data,
      };
    },
    enabled: isStaff,
  });

  if (authLoading || isLoading) {
    return (
      <div className="page-loader"><div className="page-loader-ring" /></div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  const taskList = data?.tasks ?? [];
  const workload = data?.workload;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <h1 className="db-page-title">Work Queue</h1>
        <p className="db-page-sub">
          Operational tasks assigned to this queue — tied to live service workspaces.
        </p>
      </div>

      {error ? (
        <div className="db-alert-error">
          Failed to load work queue. {(error as any).message}
        </div>
      ) : (
        <>
          <div
            className="db-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              marginBottom: "1.5rem",
            }}
          >
            <div className="db-stat-card">
              <div className="db-stat-title">Open tasks</div>
              <div className="db-stat-value">{workload?.openTasks ?? 0}</div>
              <div className="db-stat-sub">Assigned or claimable now</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-title">Due soon</div>
              <div className="db-stat-value">{workload?.dueSoon ?? 0}</div>
              <div className="db-stat-sub">Due in next 72 hours</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-title">SLA pressure</div>
              <div className="db-stat-value">{workload?.breaches ?? 0}</div>
              <div className="db-stat-sub">Unresolved warnings or breaches</div>
            </div>
          </div>

          {taskList.length === 0 ? (
            <div className="db-coming-soon">
              <span className="db-coming-icon">✓</span>
              <p>No open tasks in the queue right now.</p>
            </div>
          ) : (
            <div className="cl-doc-list">
              <div className="cl-doc-list-header">
                <span className="cl-doc-list-title">Task inbox</span>
                <span className="cl-doc-count">{taskList.length} open</span>
              </div>

              {taskList.map((task: any) => {
                const cs = Array.isArray(task.client_service) ? task.client_service[0] : task.client_service;
                const svc = Array.isArray(cs?.service) ? cs.service[0] : cs?.service;
                const client = Array.isArray(cs?.user) ? cs.user[0] : cs?.user;

                const isOverdue = task.due_at && new Date(task.due_at).getTime() < Date.now();

                return (
                  <div
                    key={task.id}
                    className="cl-doc-row"
                    style={
                      isOverdue
                        ? { borderLeft: "3px solid #dc2626", paddingLeft: "calc(1rem - 3px)" }
                        : undefined
                    }
                  >
                    <div className="cl-doc-left">
                      <span className={`cl-overall-status cl-status-${cs?.status ?? "pending"}`}>
                        {String(task.status).replace(/_/g, " ")}
                      </span>
                      <div className="cl-doc-info">
                        <div className="cl-doc-name">{task.title}</div>
                        <div className="cl-doc-status-text">
                          {svc?.name ?? "Service"} · {formatClientName(client)}
                        </div>
                        {task.description && (
                          <div className="cl-doc-status-text">{task.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="cl-doc-right" style={{ alignItems: "flex-end" }}>
                      <div
                        className="cl-uploaded-name"
                        style={isOverdue ? { color: "#dc2626", fontWeight: 600 } : undefined}
                      >
                        {formatDueDate(task.due_at)}
                      </div>
                      {cs?.id && (
                        <Link to={`/my-services/${cs.id}`} className="btn btn-secondary">
                          Open workspace
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
