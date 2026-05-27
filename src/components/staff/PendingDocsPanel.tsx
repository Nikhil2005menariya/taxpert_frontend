import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";

type PendingDocRow = {
  clientServiceId: string;
  clientName: string;
  serviceName: string;
  pendingDocsCount: number;
  daysWaiting: number;
  lastReminderAt: string | null;
  lastReminderType: string | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function withinLast24h(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

function NudgeButton({ clientServiceId, initialLastSentAt }: { clientServiceId: string; initialLastSentAt: string | null }) {
  const [loading, setLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(initialLastSentAt);
  const [feedback, setFeedback] = useState(false);

  const isThrottled = !!lastSentAt && withinLast24h(lastSentAt);
  const isDisabled = loading || isThrottled;

  async function handleNudge() {
    setLoading(true);
    try {
      await apiClient.post(`/reminders/send-manual`, { clientServiceId });
      setLastSentAt(new Date().toISOString());
      setFeedback(true);
      setTimeout(() => setFeedback(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Failed to send reminder");
    } finally {
      setLoading(false);
    }
  }

  if (feedback) {
    return (
      <span style={{ fontSize: "0.72rem", color: "var(--green-600, #16a34a)", fontWeight: 600 }}>
        Sent ✓
      </span>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      style={{ fontSize: "0.72rem", padding: "3px 9px", whiteSpace: "nowrap" }}
      onClick={handleNudge}
      disabled={isDisabled}
      title={
        isThrottled && lastSentAt
          ? `Reminder sent ${relativeTime(lastSentAt)} — throttled for 24h`
          : "Send document reminder email"
      }
    >
      {loading
        ? "…"
        : isThrottled && lastSentAt
          ? `Nudged ${relativeTime(lastSentAt)}`
          : "Nudge"}
    </button>
  );
}

export default function PendingDocsPanel({ data }: { data: PendingDocRow[] }) {
  return (
    <div className="cl-doc-list">
      {/* Header */}
      <div className="cl-doc-list-header">
        <span className="cl-doc-list-title">Clients Awaiting Documents</span>
        <span className="cl-doc-count">{data.length} client{data.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Empty state */}
      {data.length === 0 ? (
        <div style={{
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "0.875rem",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div>
          All clients have submitted their documents.
        </div>
      ) : (
        data.map((row) => (
          <div key={row.clientServiceId} className="cl-doc-row">
            {/* Left: client + service info */}
            <div className="cl-doc-left">
              <div className="cl-doc-info">
                <div className="cl-doc-name">{row.clientName}</div>
                <div className="cl-doc-status-text">{row.serviceName}</div>
              </div>
            </div>

            {/* Right: badges + action */}
            <div className="cl-doc-right" style={{ gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {/* Pending docs badge */}
              <span style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "#fef3c7",
                color: "#92400e",
                whiteSpace: "nowrap",
              }}>
                {row.pendingDocsCount} doc{row.pendingDocsCount !== 1 ? "s" : ""} pending
              </span>

              {/* Days waiting */}
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: row.daysWaiting > 5 ? "#dc2626" : "#64748b",
                whiteSpace: "nowrap",
              }}>
                {row.daysWaiting}d waiting
              </span>

              {/* Last reminder */}
              <span style={{
                fontSize: "0.7rem",
                color: "#94a3b8",
                whiteSpace: "nowrap",
              }}>
                {row.lastReminderAt
                  ? `Reminded ${relativeTime(row.lastReminderAt)}`
                  : "No reminder sent"}
              </span>

              {/* Nudge button */}
              <NudgeButton
                clientServiceId={row.clientServiceId}
                initialLastSentAt={row.lastReminderAt}
              />

              {/* Open workspace link */}
              <Link
                to={`/my-services/${row.clientServiceId}`}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#3b82f6",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Open →
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
