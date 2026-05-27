import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function InvoiceSettingsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["invoice-settings"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/admin/invoice-settings");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiClient.patch("/payments/admin/invoice-settings", payload);
    },
    onSuccess: () => {
      setMessage({ type: "success", text: "Settings saved." });
      refetch();
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update settings." });
    }
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const defaults = {
    business_name: "TheTaxpert",
    support_email: "info@thetaxpert.com",
    support_phone: "",
    website: "https://thetaxpert.com",
    pan: "",
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc: "",
    upi_id: "",
    invoice_prefix: "TTP",
    default_terms: "Payment is due within 7 days of invoice date.",
    payment_instructions: "Pay via UPI, NEFT, or the secure online payment link above.",
    ...settings
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    mutation.mutate(payload);
  }

  return (
    <div className="db-shell">
      <div className="db-page-header">
        <div>
          <h1 className="page-title">Invoice Settings</h1>
          <p className="page-sub">Business identity, banking details, and invoice content. Changes apply to all new invoices immediately.</p>
        </div>
      </div>

      <div className="card" style={{ padding: "2rem 2.25rem", maxWidth: "800px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* Business Identity */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>Business Identity</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input name="business_name" defaultValue={defaults.business_name} required className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input name="website" type="url" defaultValue={defaults.website} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                <input name="support_email" type="email" defaultValue={defaults.support_email} required className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                <input name="support_phone" defaultValue={defaults.support_phone} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                <input name="pan" defaultValue={defaults.pan} style={{ textTransform: "uppercase" }} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                <input name="invoice_prefix" defaultValue={defaults.invoice_prefix} required className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
            </div>

            {/* Banking Details */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem", marginBottom: "0.5rem" }}>Banking Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input name="bank_name" defaultValue={defaults.bank_name} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                <input name="account_holder_name" defaultValue={defaults.account_holder_name} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input name="account_number" defaultValue={defaults.account_number} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input name="ifsc" defaultValue={defaults.ifsc} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                <input name="upi_id" defaultValue={defaults.upi_id} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
              </div>
            </div>

            {/* Invoice Content */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem", marginBottom: "0.5rem" }}>Invoice Content</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Terms</label>
              <textarea name="default_terms" defaultValue={defaults.default_terms} rows={3} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions</label>
              <textarea name="payment_instructions" defaultValue={defaults.payment_instructions} rows={3} className="w-full p-2 border border-gray-300 rounded focus:border-[#c49a3a] outline-none" />
            </div>

            {/* Save */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "1rem" }}>
              <button type="submit" disabled={mutation.isPending} className="bg-[#c49a3a] hover:bg-[#b08a34] text-white px-6 py-2 rounded font-medium transition-colors">
                {mutation.isPending ? "Saving…" : "Save Settings"}
              </button>
              {message && (
                <span style={{ color: message.type === "success" ? "#10b981" : "#ef4444", fontWeight: 500, fontSize: "0.875rem" }}>
                  {message.text}
                </span>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
