import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

type Settings = {
  business_name:        string;
  support_email:        string;
  support_phone:        string;
  website:              string;
  pan:                  string;
  invoice_prefix:       string;
  bank_name:            string;
  account_holder_name:  string;
  account_number:       string;
  ifsc:                 string;
  upi_id:               string;
  default_terms:        string;
  payment_instructions: string;
};

const DEFAULTS: Settings = {
  business_name:        "TheTaxpert",
  support_email:        "info@thetaxpert.com",
  support_phone:        "",
  website:              "https://thetaxpert.com",
  pan:                  "",
  invoice_prefix:       "TTP",
  bank_name:            "",
  account_holder_name:  "",
  account_number:       "",
  ifsc:                 "",
  upi_id:               "",
  default_terms:        "Payment is due within 7 days of invoice date.",
  payment_instructions: "Pay via UPI, NEFT, or the secure online payment link above.",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--ink-400)", marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

export default function InvoiceSettingsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const { data: fetched, isLoading } = useQuery({
    queryKey: ["invoice-settings-admin"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/admin/invoice-settings");
      return res.data.data as Settings | null;
    },
    enabled: isAdmin,
  });

  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (fetched) setForm({ ...DEFAULTS, ...fetched });
  }, [fetched]);

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload: Settings) => apiClient.patch("/payments/admin/invoice-settings", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-settings-admin"] });
      qc.invalidateQueries({ queryKey: ["invoice-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Invoice Settings</h1>
          <p className="db-page-sub">Controls what appears on every invoice sent to clients. Changes apply immediately.</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(form)}
        >
          {mutation.isPending ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {saved && (
        <div className="db-alert-ok" style={{ fontSize: "0.85rem" }}>Settings saved — invoices will reflect these changes immediately.</div>
      )}
      {mutation.isError && (
        <div className="db-alert-error" style={{ fontSize: "0.85rem" }}>{(mutation.error as any)?.response?.data?.error ?? "Failed to save settings."}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 720 }}>

        {/* Business Identity */}
        <div className="asd-section">
          <h3 className="asd-section-title">Business Identity</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", marginBottom: "1.25rem", marginTop: "-0.5rem" }}>
            Appears in the invoice header — your company's name, contact, and prefix for invoice numbers.
          </p>
          <div className="isv-grid">
            <Field label="Business Name *">
              <input className="form-input" value={form.business_name} onChange={set("business_name")} placeholder="TheTaxpert" required />
            </Field>
            <Field label="Invoice Prefix *" hint="Used in invoice numbers, e.g. TTP-00042">
              <input className="form-input" value={form.invoice_prefix} onChange={set("invoice_prefix")} placeholder="TTP" required maxLength={6} style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="Support Email *">
              <input className="form-input" type="email" value={form.support_email} onChange={set("support_email")} placeholder="info@thetaxpert.com" required />
            </Field>
            <Field label="Support Phone">
              <input className="form-input" type="tel" value={form.support_phone} onChange={set("support_phone")} placeholder="+91 XXXXX XXXXX" />
            </Field>
            <Field label="Website">
              <input className="form-input" type="url" value={form.website} onChange={set("website")} placeholder="https://thetaxpert.com" />
            </Field>
            <Field label="Business PAN" hint="Shown on invoices for GST compliance">
              <input className="form-input" value={form.pan} onChange={set("pan")} placeholder="AAAAA0000A" style={{ textTransform: "uppercase" }} maxLength={10} />
            </Field>
          </div>
        </div>

        {/* Banking Details */}
        <div className="asd-section">
          <h3 className="asd-section-title">Banking Details</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", marginBottom: "1.25rem", marginTop: "-0.5rem" }}>
            Printed on the invoice so clients can pay by bank transfer. Leave blank if not accepting NEFT/IMPS.
          </p>
          <div className="isv-grid">
            <Field label="Bank Name">
              <input className="form-input" value={form.bank_name} onChange={set("bank_name")} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account Holder Name">
              <input className="form-input" value={form.account_holder_name} onChange={set("account_holder_name")} placeholder="TheTaxpert Pvt Ltd" />
            </Field>
            <Field label="Account Number">
              <input className="form-input" value={form.account_number} onChange={set("account_number")} placeholder="XXXX XXXX XXXX" />
            </Field>
            <Field label="IFSC Code">
              <input className="form-input" value={form.ifsc} onChange={set("ifsc")} placeholder="HDFC0001234" style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="UPI ID" hint="Clients can scan/pay via UPI">
              <input className="form-input" value={form.upi_id} onChange={set("upi_id")} placeholder="payments@thetaxpert" />
            </Field>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="asd-section">
          <h3 className="asd-section-title">Invoice Content</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", marginBottom: "1.25rem", marginTop: "-0.5rem" }}>
            Text printed at the bottom of every invoice.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Field label="Default Terms" hint="e.g. payment due date, late fee policy">
              <textarea className="form-input" rows={3} value={form.default_terms} onChange={set("default_terms")}
                placeholder="Payment is due within 7 days of invoice date." />
            </Field>
            <Field label="Payment Instructions" hint="Shown below the total — guides client on how to pay">
              <textarea className="form-input" rows={3} value={form.payment_instructions} onChange={set("payment_instructions")}
                placeholder="Pay via UPI, NEFT, or the secure online payment link above." />
            </Field>
          </div>
        </div>

        {/* Preview strip */}
        <div className="isv-preview">
          <div className="isv-preview-label">Invoice footer preview</div>
          <div className="isv-preview-body">
            {(form.bank_name || form.upi_id || form.account_number) && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 4 }}>Payment Details</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem 1.5rem", fontSize: "0.78rem", color: "#475569" }}>
                  {form.bank_name && <span>{form.bank_name}</span>}
                  {form.account_number && <span>A/C: {form.account_number}</span>}
                  {form.ifsc && <span>IFSC: {form.ifsc}</span>}
                  {form.upi_id && <span>UPI: {form.upi_id}</span>}
                </div>
              </div>
            )}
            {form.default_terms && <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 4px" }}><strong>Terms:</strong> {form.default_terms}</p>}
            {form.payment_instructions && <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}><strong>Payment:</strong> {form.payment_instructions}</p>}
            <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "8px 0 0", textAlign: "center" }}>
              {form.business_name} · {form.support_email}{form.website ? ` · ${form.website}` : ""}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
