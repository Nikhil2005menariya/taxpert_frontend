import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { formatRupees } from "../../shared/finance-utils";

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

function InvoicePayButton({ serviceSlug, serviceName, clientServiceId, formattedPrice }: any) {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  async function handlePayment() {
    setError(null);
    setState("loading");

    try {
      const orderRes = await apiClient.post("/payments/create-order", { slug: serviceSlug });
      const { orderId, amount, currency, keyId } = orderRes.data.data;

      setState("idle");

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "TheTaxpert",
        description: serviceName,
        order_id: orderId,
        handler: async function (response: any) {
          setState("verifying");
          try {
            await apiClient.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              serviceSlug,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", padding: "1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }}>
      {error && (
        <div style={{ width: "100%", padding: "1rem", background: "#fef2f2", color: "#b91c1c", borderRadius: "0.375rem", fontSize: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={() => { setState("idle"); setError(null); }} style={{ fontWeight: 600, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>Try again</button>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={busy || !scriptReady}
        className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white px-6 py-3 rounded font-medium transition-colors disabled:opacity-50"
      >
        {state === "loading" ? "Preparing…" : state === "verifying" ? "Confirming payment…" : `Pay Now · ${formattedPrice}`}
      </button>
      <p style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Secure payment via Razorpay · One-time charge</p>
    </div>
  );
}

export default function InvoicePage() {
  const { id } = useParams();
  
  
  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await apiClient.get(`/payments/invoices/${id}`);
      return { invoice: res.data.data };
    }
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!data?.invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

  const invoice = data.invoice;
  const isPending = invoice.status === "pending";
  const isPaid = invoice.status === "paid" || invoice.status === "captured";

  const issueDate = new Date(invoice.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
  const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

  const clientName = invoice.client ? `${invoice.client.first_name} ${invoice.client.last_name}` : "Client";
  
  // Default Settings fallback
  const businessName = "TheTaxpert";
  const supportEmail = "info@thetaxpert.com";

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
              <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>https://thetaxpert.com</div>
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

          <div style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "2rem" }}>
            {businessName} · {supportEmail}
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
