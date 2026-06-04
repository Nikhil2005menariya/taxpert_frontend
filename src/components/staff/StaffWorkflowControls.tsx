import { useState } from "react";
import { apiClient } from "../../api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const NEXT_LABEL: Partial<Record<string, string>> = {
  pending:             `Move to Documents Required`,
  documents_required:  `Move to Documents Received`,
  documents_received:  `Move to In Progress`,
  in_progress:         `Move to Under Review`,
  under_review:        "Move to Payment",
  payment:             "Complete Service",
};

export default function StaffWorkflowControls({
  clientServiceId,
  clientUserId,
  status,
  paymentStatus,
  deletionRequested,
}: {
  clientServiceId: string;
  clientUserId: string;
  status: string;
  paymentStatus?: string | null;
  deletionRequested?: boolean;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  const { data: assignmentData } = useQuery({
    queryKey: ['client-assignment', clientUserId],
    queryFn: async () => {
      const [taxpertsRes, assignRes] = await Promise.all([
        apiClient.get('/admin/taxperts/active'),
        apiClient.get(`/admin/taxperts/client/${clientUserId}`)
      ]);
      return {
        taxperts: taxpertsRes.data.data ?? [],
        assignment: assignRes.data.data ?? null
      };
    }
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/client-services/${clientServiceId}/advance`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-service', clientServiceId] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? "Failed to advance workflow");
    }
  });

  const deletionMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      await apiClient.post(`/client-services/${clientServiceId}/${action}-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-service', clientServiceId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error ?? "Failed to process deletion request");
    }
  });

  const nextLabel = NEXT_LABEL[status];
  const isPaymentPending = status === "payment" && paymentStatus !== "paid";

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Assignment Banner */}
      {assignmentData && (
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Assigned Expert:</span>
            {assignmentData.assignment ? (
              <span className="text-slate-600">{assignmentData.assignment.taxpert.first_name} {assignmentData.assignment.taxpert.last_name}</span>
            ) : (
              <span className="text-amber-600 font-semibold">Unassigned</span>
            )}
          </div>
        </div>
      )}

      {/* Deletion Request */}
      {deletionRequested && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 gap-3">
          <div className="font-semibold flex items-center gap-2">
            ⚠ Client has requested to cancel/delete this service.
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              className="px-3 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
              onClick={() => deletionMutation.mutate('approve')}
              disabled={deletionMutation.isPending}
            >
              Approve (Cancel)
            </button>
            <button 
              className="px-3 py-1 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 disabled:opacity-50"
              onClick={() => deletionMutation.mutate('reject')}
              disabled={deletionMutation.isPending}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Workflow Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Staff Controls</h3>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        
        {isPaymentPending ? (
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium p-3 bg-amber-50 rounded">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Awaiting payment from client
          </div>
        ) : nextLabel ? (
          <button 
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            onClick={() => advanceMutation.mutate()}
            disabled={advanceMutation.isPending}
          >
            {advanceMutation.isPending ? "Updating..." : nextLabel}
          </button>
        ) : (
          <div className="text-sm text-slate-500 italic">Workflow completed or cancelled.</div>
        )}
      </div>
    </div>
  );
}
