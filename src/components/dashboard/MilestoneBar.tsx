const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  documents_required: "Docs Needed",
  under_review: "Reviewing",
  in_progress: "In Progress",
  action_required: "Action Needed",
  completed: "Done",
  cancelled: "Cancelled",
};

export type ServiceStatus = string;

const STEPS: { key: string; label: string }[] = [
  { key: "documents",    label: "Documents" },
  { key: "in_progress",  label: SERVICE_STATUS_LABELS.in_progress },
  { key: "under_review", label: SERVICE_STATUS_LABELS.under_review },
  { key: "invoice",      label: "Invoice" },
  { key: "completed",    label: SERVICE_STATUS_LABELS.completed },
];

function stepIndex(status: ServiceStatus): number {
  switch (status) {
    case "pending":
    case "documents_required":
    case "documents_received": return 0;
    case "in_progress":        return 1;
    case "under_review":       return 2;
    case "invoice_pending":    return 3;
    case "completed":          return 4;
    default:                   return 0;
  }
}

function isStepDone(stepIdx: number, status: ServiceStatus): boolean {
  const cur = stepIndex(status);
  // Documents step is visually done once we're in processing or beyond
  if (stepIdx === 0 && cur >= 1) return true;
  return stepIdx < cur;
}

function isStepActive(stepIdx: number, status: ServiceStatus): boolean {
  return stepIdx === stepIndex(status);
}

export default function MilestoneBar({ status, compact }: { status: ServiceStatus; compact?: boolean }) {
  if (status === "on_hold" || status === "cancelled") {
    return (
      <div className="ms-bar ms-cancelled">
        <span>{status === "on_hold" ? "Service on hold" : "Service cancelled"}</span>
      </div>
    );
  }

  return (
    <div className="ms-bar">
      {STEPS.map((step, i) => {
        const done   = isStepDone(i, status);
        const active = isStepActive(i, status);

        return (
          <div key={step.key} className="ms-step-wrap">
            {i > 0 && (
              <div className={`ms-connector ${done ? "ms-connector-done" : ""}`} />
            )}
            <div className={`ms-step ${done ? "ms-done" : active ? "ms-active" : "ms-pending"}`}>
              <div className="ms-circle">
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span className="ms-dot" />
                )}
              </div>
              {!compact && <span className="ms-label">{step.label}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
