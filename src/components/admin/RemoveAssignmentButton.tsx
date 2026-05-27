import { useState } from "react";
import { apiClient } from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RemoveAssignmentButton({
  caId,
  clientId,
}: {
  caId: string;
  clientId: string;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete("/admin/assignments", { data: { caId, clientId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: any) => {
        alert(err.response?.data?.error || "Failed to remove assignment.");
    },
    onSettled: () => {
        setLoading(false);
    }
  });

  async function handle() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    mutation.mutate();
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="asgn-remove-btn"
      type="button"
      onBlur={() => setConfirm(false)}
    >
      {loading ? "Removing…" : confirm ? "Confirm?" : "Remove"}
    </button>
  );
}
