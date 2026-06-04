import { useState, useEffect } from "react";
import Loader from "../../components/ui/Loader";
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

/* ── Inline line icons ───────────────────────────────────────── */
const Icon = {
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="adm-field">
      <label className="adm-label">{label}</label>
      {children}
      {hint && <p className="adm-field-hint">{hint}</p>}
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="adm-panel">
      <div className="adm-sub-head">
        <div className="adm-section-head" style={{ margin: 0, gap: '0.65rem' }}>
          <span className="adm-stat-ico">{icon}</span>
          <div>
            <h3 className="adm-sub-title">{title}</h3>
            <p className="adm-sub-desc">{desc}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
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

  if (authLoading || isLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const SaveBtn = (
    <button className="adm-submit" disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
      {mutation.isPending ? <><span className="adm-submit-spin" /> Saving…</> : "Save Settings"}
    </button>
  );

  return (
    <div className="adm-root" style={{ maxWidth: 880 }}>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="adm-hero">
        <div className="adm-hero-glow" />
        <div className="adm-hero-bar">
          <div>
            <p className="adm-hero-eyebrow">— Billing</p>
            <h1 className="adm-hero-title">Invoice Settings</h1>
            <p className="adm-hero-date">Controls what appears on every invoice sent to clients. Changes apply immediately.</p>
          </div>
          <div className="adm-hero-aside">{SaveBtn}</div>
        </div>
      </header>

      {saved && (
        <div className="adm-banner adm-banner--ok" style={{ marginBottom: '1rem' }}>{Icon.check} Settings saved — invoices reflect these changes immediately.</div>
      )}
      {mutation.isError && (
        <div className="adm-banner adm-banner--err" style={{ marginBottom: '1rem' }}>{Icon.alert} {(mutation.error as any)?.response?.data?.error ?? "Failed to save settings."}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Business Identity */}
        <Section icon={Icon.building} title="Business Identity" desc="Appears in the invoice header — company name, contact, and invoice-number prefix.">
          <div className="adm-form-grid">
            <Field label="Business Name *">
              <input className="adm-input" value={form.business_name} onChange={set("business_name")} placeholder="TheTaxpert" required />
            </Field>
            <Field label="Invoice Prefix *" hint="Used in invoice numbers, e.g. TTP-00042">
              <input className="adm-input" value={form.invoice_prefix} onChange={set("invoice_prefix")} placeholder="TTP" required maxLength={6} style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="Support Email *">
              <input className="adm-input" type="email" value={form.support_email} onChange={set("support_email")} placeholder="info@thetaxpert.com" required />
            </Field>
            <Field label="Support Phone">
              <input className="adm-input" type="tel" value={form.support_phone} onChange={set("support_phone")} placeholder="+91 XXXXX XXXXX" />
            </Field>
            <Field label="Website">
              <input className="adm-input" type="url" value={form.website} onChange={set("website")} placeholder="https://thetaxpert.com" />
            </Field>
            <Field label="Business PAN" hint="Shown on invoices for GST compliance">
              <input className="adm-input" value={form.pan} onChange={set("pan")} placeholder="AAAAA0000A" style={{ textTransform: "uppercase" }} maxLength={10} />
            </Field>
          </div>
        </Section>

        {/* Banking Details */}
        <Section icon={Icon.bank} title="Banking Details" desc="Printed on the invoice so clients can pay by bank transfer. Leave blank if not accepting NEFT/IMPS.">
          <div className="adm-form-grid">
            <Field label="Bank Name">
              <input className="adm-input" value={form.bank_name} onChange={set("bank_name")} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account Holder Name">
              <input className="adm-input" value={form.account_holder_name} onChange={set("account_holder_name")} placeholder="TheTaxpert Pvt Ltd" />
            </Field>
            <Field label="Account Number">
              <input className="adm-input" value={form.account_number} onChange={set("account_number")} placeholder="XXXX XXXX XXXX" />
            </Field>
            <Field label="IFSC Code">
              <input className="adm-input" value={form.ifsc} onChange={set("ifsc")} placeholder="HDFC0001234" style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="UPI ID" hint="Clients can scan/pay via UPI">
              <input className="adm-input" value={form.upi_id} onChange={set("upi_id")} placeholder="payments@thetaxpert" />
            </Field>
          </div>
        </Section>

        {/* Invoice Content */}
        <Section icon={Icon.doc} title="Invoice Content" desc="Text printed at the bottom of every invoice.">
          <div className="adm-form">
            <Field label="Default Terms" hint="e.g. payment due date, late fee policy">
              <textarea className="adm-textarea" rows={3} value={form.default_terms} onChange={set("default_terms")}
                placeholder="Payment is due within 7 days of invoice date." />
            </Field>
            <Field label="Payment Instructions" hint="Shown below the total — guides client on how to pay">
              <textarea className="adm-textarea" rows={3} value={form.payment_instructions} onChange={set("payment_instructions")}
                placeholder="Pay via UPI, NEFT, or the secure online payment link above." />
            </Field>
          </div>
        </Section>

        {/* Preview strip */}
        <div className="adm-preview">
          <div className="adm-preview-glow" />
          <p className="adm-preview-label">— Invoice footer preview</p>
          <div className="adm-preview-body">
            {(form.bank_name || form.upi_id || form.account_number) && (
              <div style={{ marginBottom: "0.85rem" }}>
                <p className="adm-preview-sub">Payment Details</p>
                <div className="adm-preview-pay">
                  {form.bank_name && <span>{form.bank_name}</span>}
                  {form.account_number && <span>A/C: {form.account_number}</span>}
                  {form.ifsc && <span>IFSC: {form.ifsc}</span>}
                  {form.upi_id && <span>UPI: {form.upi_id}</span>}
                </div>
              </div>
            )}
            {form.default_terms && <p className="adm-preview-line"><strong>Terms:</strong> {form.default_terms}</p>}
            {form.payment_instructions && <p className="adm-preview-line"><strong>Payment:</strong> {form.payment_instructions}</p>}
            <p className="adm-preview-foot">
              {form.business_name} · {form.support_email}{form.website ? ` · ${form.website}` : ""}
            </p>
          </div>
        </div>

        <div className="adm-savebar">{SaveBtn}</div>
      </div>
    </div>
  );
}
