import { useState } from "react";
import { apiClient } from "../../api/client";

type Taxpert = { id: string; first_name: string; last_name: string };

type UnassignedServiceRow = {
  clientServiceId: string;
  clientUserId: string;
  clientName: string;
  serviceName: string;
  status: string;
  createdAt: string;
};

function ServiceRow({
  row,
  taxperts,
  onAssigned,
}: {
  row: UnassignedServiceRow;
  taxperts: Taxpert[];
  onAssigned: (clientUserId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAssign() {
    if (!selected) return;
    setLoading(true);
    setErr(null);
    try {
      await apiClient.post(`/admin/taxperts/quick-assign`, { taxpertUserId: selected, clientUserId: row.clientUserId });
      onAssigned(row.clientUserId);
    } catch (err: any) {
      setErr(err.response?.data?.error ?? "Failed to assign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ua-row">
      <div className="ua-row-info">
        <span className="ua-client-name">{row.clientName}</span>
        <span className="ua-service-name">{row.serviceName}</span>
      </div>
      <div className="ua-row-actions">
        {!open ? (
          <button className="ua-assign-btn" onClick={() => setOpen(true)}>
            Assign
          </button>
        ) : (
          <div className="ua-inline-assign">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="ua-select"
              disabled={loading}
            >
              <option value="">Select Taxpert…</option>
              {taxperts.map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
            <button
              className="ua-confirm-btn"
              onClick={handleAssign}
              disabled={!selected || loading}
            >
              {loading ? "Assigning…" : "Confirm"}
            </button>
            <button className="ua-cancel-btn" onClick={() => { setOpen(false); setErr(null); }}>
              Cancel
            </button>
          </div>
        )}
        {err && <span className="ua-row-error">{err}</span>}
      </div>
    </div>
  );
}

export default function UnassignedAlert({
  services,
  taxperts,
}: {
  services: UnassignedServiceRow[];
  taxperts: Taxpert[];
}) {
  const [rows, setRows] = useState(services);
  const [expanded, setExpanded] = useState(false);

  function handleAssigned(clientUserId: string) {
    setRows(prev => prev.filter(r => r.clientUserId !== clientUserId));
  }

  if (!rows.length) return null;

  return (
    <div className="ua-wrap">
      <button className="ua-header" onClick={() => setExpanded(v => !v)}>
        <span className="ua-icon">⚠</span>
        <span className="ua-headline">
          <strong>{rows.length} service{rows.length > 1 ? "s" : ""}</strong> {rows.length > 1 ? "have" : "has"} no Taxpert assigned
        </span>
        <span className="ua-toggle">{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {expanded && (
        <div className="ua-list">
          {rows.map(r => (
            <ServiceRow
              key={r.clientServiceId}
              row={r}
              taxperts={taxperts}
              onAssigned={handleAssigned}
            />
          ))}
        </div>
      )}

      <style>{`
        .ua-wrap {
          border: 1.5px solid #fbbf24;
          background: #fffbeb;
          border-radius: 0.875rem;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }
        .ua-header {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.85rem 1.1rem;
          background: none; border: none; cursor: pointer;
          text-align: left;
        }
        .ua-header:hover { background: #fef3c7; }
        .ua-icon { font-size: 1rem; }
        .ua-headline { flex: 1; font-size: 0.875rem; color: #92400e; }
        .ua-toggle { font-size: 0.75rem; color: #b45309; white-space: nowrap; }
        .ua-list { border-top: 1px solid #fde68a; }
        .ua-row {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 0.5rem;
          padding: 0.75rem 1.1rem;
          border-bottom: 1px solid #fde68a;
        }
        .ua-row:last-child { border-bottom: none; }
        .ua-row-info { display: flex; flex-direction: column; gap: 0.1rem; }
        .ua-client-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
        .ua-service-name { font-size: 0.78rem; color: #64748b; }
        .ua-row-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .ua-assign-btn {
          font-size: 0.8rem; font-weight: 600; padding: 0.35rem 0.85rem;
          background: #f59e0b; color: #fff; border: none;
          border-radius: 0.5rem; cursor: pointer;
        }
        .ua-assign-btn:hover { background: #d97706; }
        .ua-inline-assign { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .ua-select {
          font-size: 0.8rem; padding: 0.3rem 0.5rem;
          border: 1.5px solid #d1d5db; border-radius: 0.4rem;
          background: #fff; min-width: 160px;
        }
        .ua-confirm-btn {
          font-size: 0.8rem; font-weight: 600; padding: 0.3rem 0.75rem;
          background: #16a34a; color: #fff; border: none;
          border-radius: 0.4rem; cursor: pointer;
        }
        .ua-confirm-btn:disabled { opacity: 0.5; cursor: default; }
        .ua-confirm-btn:not(:disabled):hover { background: #15803d; }
        .ua-cancel-btn {
          font-size: 0.8rem; padding: 0.3rem 0.5rem;
          background: none; border: 1.5px solid #d1d5db;
          border-radius: 0.4rem; cursor: pointer; color: #64748b;
        }
        .ua-cancel-btn:hover { background: #f1f5f9; }
        .ua-row-error { font-size: 0.78rem; color: #dc2626; }
      `}</style>
    </div>
  );
}
