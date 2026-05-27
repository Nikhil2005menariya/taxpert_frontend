import { useState } from "react";
import { apiClient } from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  pan: string;
}

export default function AssignClientForm({
  caUsers,
  clientUsers,
}: {
  caUsers: User[];
  clientUsers: User[];
}) {
  const queryClient = useQueryClient();
  const [caId, setCaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/admin/assignments", { caId, clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
      setSuccess("Client assigned successfully.");
      setCaId("");
      setClientId("");
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to assign client");
      setSuccess(null);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!caId || !clientId) {
      setError("Select both a Taxpert and a client");
      return;
    }
    if (caId === clientId) {
      setError("Taxpert and client cannot be the same person");
      return;
    }

    setLoading(true);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleAssign} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div className="form-group">
          <label className="form-label">Taxpert</label>
          <select className="form-input" value={caId} onChange={(e) => setCaId(e.target.value)} required>
            <option value="">Select Taxpert…</option>
            {caUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.pan})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Client</label>
          <select className="form-input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select client…</option>
            {clientUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.pan})
              </option>
            ))}
          </select>
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {success && <div className="banner banner-success">{success}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Assigning..." : "Assign Client"}
        </button>
      </div>

      <style>{`
        .banner { padding: 0.6rem 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; }
        .banner-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .banner-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #057a55; }
      `}</style>
    </form>
  );
}
