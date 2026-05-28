import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, paymentClient } from "../../../api/client";
import { formatRupees } from "../../../shared/finance-utils";

declare global {
  interface Window {
    Razorpay: new (options: any) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type AppliedDiscount = {
  codeType: "coupon" | "referral";
  couponId?: string;
  referrerId?: string;
  referralCode?: string;
  discountAmount: number;
  finalAmount: number;
  description: string;
};

function InvoicePayButton({ serviceSlug, serviceName, clientServiceId, price, formattedPrice }: any) {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Coupon / referral state
  const [codeInput, setCodeInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  async function applyCode() {
    if (!codeInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await apiClient.post("/coupons/validate", {
        code: codeInput.trim().toUpperCase(),
        servicePrice: price,
      });
      const d = res.data;
      if (!d.valid) {
        setCouponError(d.error ?? "Invalid code");
        setApplied(null);
      } else {
        setApplied(d);
        setCouponError(null);
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.error ?? "Could not validate code");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCode() {
    setApplied(null);
    setCodeInput("");
    setCouponError(null);
  }

  const finalPrice = applied ? applied.finalAmount : price;
  const finalFormatted = applied ? formatRupees(applied.finalAmount) : formattedPrice;

  async function handlePayment() {
    setError(null);
    setState("loading");

    try {
      const orderRes = await paymentClient.post("/orders", {
        slug:            serviceSlug,
        coupon_id:       applied?.couponId,
        referrer_id:     applied?.referrerId,
        referral_code:   applied?.referralCode,
        discount_amount: applied?.discountAmount,
      });
      const { orderId, amount, currency, keyId } = orderRes.data.data;

      setState("idle");

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount ?? finalPrice,
        currency,
        name: "TheTaxpert",
        description: serviceName,
        order_id: orderId,
        handler: async function (response: any) {
          setState("verifying");
          try {
            await paymentClient.post("/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setState("success");
            setTimeout(() => navigate(`/my-services/${clientServiceId}`), 2000);
          } catch (err: any) {
            setState("error");
            setError(err.response?.data?.error ?? "Payment verification failed. Please contact support.");
          }
        },
        modal: { ondismiss() { setState("idle"); } },
        theme: { color: "#c49a3a" },
      });

      rzp.open();
    } catch (err: any) {
      setState("error");
      setError(err.response?.data?.error ?? "Failed to create payment order");
    }
  }

  if (state === "success") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", color: "#166534" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Payment received!</p>
        <p style={{ fontSize: "0.875rem", color: "#15803d" }}>Redirecting to your service workspace…</p>
      </div>
    );
  }

  const busy = state === "loading" || state === "verifying";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }}>

      {/* Coupon / referral input */}
      {!applied ? (
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Have a coupon or referral code?
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCouponError(null); }}
              onKeyDown={e => e.key === "Enter" && applyCode()}
              placeholder="e.g. SAVE500 or TAXPERT-XXXXXX"
              style={{ flex: 1, padding: "0.55rem 0.75rem", border: `1px solid ${couponError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", background: "white", textTransform: "uppercase" }}
            />
            <button
              onClick={applyCode}
              disabled={!codeInput.trim() || couponLoading}
              style={{ padding: "0.55rem 1rem", background: "#1e293b", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", opacity: !codeInput.trim() || couponLoading ? 0.5 : 1 }}
            >
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
          {couponError && (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#b91c1c" }}>{couponError}</p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534" }}>
              {applied.codeType === "referral" ? "Referral code" : "Coupon"} applied — {applied.description}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: "2px" }}>
              You save {formatRupees(applied.discountAmount)}
            </div>
          </div>
          <button onClick={removeCode} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700, fontSize: "0.8rem", textDecoration: "underline" }}>
            Remove
          </button>
        </div>
      )}

      {/* Amount summary */}
      {applied && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem 1rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
            <span>Original amount</span><span>{formattedPrice}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#166534" }}>
            <span>Discount</span><span>−{formatRupees(applied.discountAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem", marginTop: "0.25rem", fontSize: "1rem" }}>
            <span>Total payable</span><span>{finalFormatted}</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", color: "#b91c1c", borderRadius: "0.375rem", fontSize: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={() => { setState("idle"); setError(null); }} style={{ fontWeight: 600, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>Retry</button>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={busy || !scriptReady}
        style={{ width: "100%", padding: "0.85rem", background: busy ? "#94a3b8" : "#1e293b", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "1rem", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", transition: "background 0.15s" }}
      >
        {state === "loading" ? "Preparing…" : state === "verifying" ? "Confirming payment…" : `Pay Now · ${finalFormatted}`}
      </button>
      <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, margin: 0 }}>
        Secure payment via Razorpay · One-time charge
      </p>
    </div>
  );
}

export default function InvoicePage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [invoiceRes, settingsRes] = await Promise.all([
        apiClient.get(`/payments/invoices/${id}`),
        apiClient.get('/payments/invoice-settings').catch(() => ({ data: { data: null } })),
      ]);
      return { invoice: invoiceRes.data.data, settings: settingsRes.data.data };
    }
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!data?.invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

  const invoice  = data.invoice;
  const s        = data.settings;
  const isPending = invoice.status === "pending";
  const isPaid    = invoice.status === "paid" || invoice.status === "captured";

  const issueDate = new Date(invoice.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const dueDate   = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
  const paidDate  = invoice.paid_at  ? new Date(invoice.paid_at).toLocaleDateString("en-IN",  { day: "numeric", month: "long", year: "numeric" }) : null;

  const clientName    = invoice.client ? `${invoice.client.first_name} ${invoice.client.last_name}` : "Client";
  const businessName  = s?.business_name  ?? "TheTaxpert";
  const supportEmail  = s?.support_email  ?? "info@thetaxpert.com";
  const website       = s?.website        ?? "https://thetaxpert.com";
  const defaultTerms  = s?.default_terms  ?? "Payment is due within 7 days of invoice date.";
  const payInstr      = s?.payment_instructions ?? null;
  const hasBanking    = s?.bank_name || s?.upi_id || s?.account_number;

  return (
    <div className="db-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Link to="/payments" style={{ color: "#475569", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          ← Back to Payments
        </Link>
        <button onClick={() => window.print()} className="bg-white border border-[#e2e8f0] text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-50 transition-colors">
          ↓ Download / Print
        </button>
      </div>

      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "1fr", maxWidth: "900px", margin: "0 auto" }}>
        {/* Printable Invoice Card */}
        <div className="card" style={{ padding: "3rem", background: "white" }} id="invoice-printable">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.05em" }}>{businessName}</div>
              {website && <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>{website}</div>}
              {supportEmail && <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{supportEmail}</div>}
              {s?.support_phone && <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{s.support_phone}</div>}
              {s?.pan && <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>PAN: {s.pan}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#475569" }}>Invoice #{invoice.invoice_number}</div>
              <div style={{ display: "inline-block", marginTop: "0.5rem", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", ...(isPaid ? { background: "#dcfce7", color: "#166534" } : { background: "#fef3c7", color: "#b45309" }) }}>
                {isPaid ? "Paid" : isPending ? "Due" : invoice.status}
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "#e2e8f0", margin: "2rem 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Bill To</div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "1.1rem", marginBottom: "0.25rem" }}>{clientName}</div>
              {invoice.client?.pan && <div style={{ fontSize: "0.875rem", color: "#475569" }}>PAN: {invoice.client.pan}</div>}
              {invoice.client?.email && <div style={{ fontSize: "0.875rem", color: "#475569" }}>{invoice.client.email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", fontSize: "0.875rem", color: "#475569", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 500 }}>Issue Date:</span><span>{issueDate}</span>
              </div>
              {dueDate && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", fontSize: "0.875rem", color: "#475569", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 500 }}>{isPaid ? "Was Due:" : "Due Date:"}</span><span style={{ color: isPaid ? "inherit" : "#b91c1c", fontWeight: isPaid ? "normal" : 600 }}>{dueDate}</span>
                </div>
              )}
              {paidDate && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", fontSize: "0.875rem", color: "#166534", fontWeight: 500 }}>
                  <span>Paid On:</span><span>{paidDate}</span>
                </div>
              )}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Description</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Unit Price</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items?.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "1rem 0" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.description}</div>
                    {invoice.service?.category && <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.15rem" }}>{invoice.service.category}</div>}
                  </td>
                  <td style={{ padding: "1rem 0", textAlign: "right", color: "#475569" }}>{item.quantity}</td>
                  <td style={{ padding: "1rem 0", textAlign: "right", color: "#475569" }}>{formatRupees(item.unit_price)}</td>
                  <td style={{ padding: "1rem 0", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>{formatRupees(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "3rem" }}>
            <div style={{ width: "300px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9", color: "#475569", fontSize: "0.875rem" }}>
                <span>Subtotal</span><span>{formatRupees(invoice.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", fontWeight: 800, color: "#0f172a", fontSize: "1.25rem" }}>
                <span>Total</span><span>{formatRupees(invoice.total_amount)}</span>
              </div>
              {isPaid && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", color: "#166534", fontSize: "0.95rem", fontWeight: 600, borderTop: "2px solid #bbf7d0", marginTop: "0.5rem" }}>
                  <span>Amount Paid</span><span>{formatRupees(invoice.total_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Banking details */}
          {hasBanking && (
            <div style={{ marginBottom: "2rem", padding: "1rem 1.25rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Payment Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem 1.5rem", fontSize: "0.8rem" }}>
                {s?.bank_name && <div><span style={{ color: "#94a3b8" }}>Bank: </span>{s.bank_name}</div>}
                {s?.account_holder_name && <div><span style={{ color: "#94a3b8" }}>A/C Name: </span>{s.account_holder_name}</div>}
                {s?.account_number && <div><span style={{ color: "#94a3b8" }}>A/C No: </span>{s.account_number}</div>}
                {s?.ifsc && <div><span style={{ color: "#94a3b8" }}>IFSC: </span>{s.ifsc}</div>}
                {s?.upi_id && <div><span style={{ color: "#94a3b8" }}>UPI: </span>{s.upi_id}</div>}
              </div>
            </div>
          )}

          {/* Terms & footer */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {defaultTerms && (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}><strong style={{ color: "#64748b" }}>Terms:</strong> {defaultTerms}</p>
            )}
            {payInstr && (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}><strong style={{ color: "#64748b" }}>Payment:</strong> {payInstr}</p>
            )}
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, textAlign: "center", marginTop: "0.5rem" }}>
              {businessName} · {supportEmail}{website ? ` · ${website}` : ""}
            </p>
          </div>
        </div>

        {/* CTA (Outside print area) */}
        {isPending && invoice.service?.slug && (
          <InvoicePayButton
            serviceSlug={invoice.service.slug}
            price={invoice.total_amount}
            serviceName={invoice.service.name ?? "Professional Service"}
            clientServiceId={id}
            formattedPrice={formatRupees(invoice.total_amount)}
          />
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
