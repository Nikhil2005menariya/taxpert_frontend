import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, paymentClient } from "../../../api/client";
import { formatRupees } from "../../../shared/finance-utils";

declare global {
  interface Window { Razorpay: new (options: any) => { open(): void }; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const s = document.createElement("script");
    s.id = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type AppliedDiscount = {
  codeType: "coupon";
  couponId: string;
  discountAmount: number;
  finalAmount: number;
  description: string;
};

// ── Payment sidebar ───────────────────────────────────────────

function PaymentPanel({ serviceSlug, serviceName, clientServiceId, price, invoice }: any) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);

  useEffect(() => { loadRazorpayScript().then(setReady); }, []);

  const finalPrice = applied ? applied.finalAmount : price;
  const finalFmt = applied ? formatRupees(applied.finalAmount) : formatRupees(price);

  async function applyCode() {
    if (!code.trim()) return;
    setCLoading(true); setCError(null);
    try {
      const res = await apiClient.post("/coupons/validate", { code: code.trim().toUpperCase(), servicePrice: price });
      const d = res.data;
      if (!d.valid) { setCError(d.error ?? "Invalid code"); setApplied(null); }
      else { setApplied(d); setCError(null); }
    } catch (e: any) { setCError(e.response?.data?.error ?? "Could not validate code"); }
    finally { setCLoading(false); }
  }

  async function handlePay() {
    setError(null); setState("loading");
    try {
      const { data: { data: ord } } = await paymentClient.post("/orders", {
        slug: serviceSlug,
        client_service_id: clientServiceId,
        coupon_id: applied?.couponId,
        discount_amount: applied?.discountAmount,
      });
      setState("idle");
      const rzp = new window.Razorpay({
        key: ord.keyId, amount: ord.amount, currency: ord.currency,
        name: "TheTaxpert", description: serviceName, order_id: ord.orderId,
        handler: async (r: any) => {
          setState("verifying");
          try {
            await paymentClient.post("/verify", {
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            });
            setState("success");
            // Invalidate so the invoice shows "Paid" if user navigates back before webhook processes
            queryClient.invalidateQueries({ queryKey: ["invoice", clientServiceId] });
            setTimeout(() => navigate(`/client/services/${clientServiceId}`), 2500);
          } catch (e: any) {
            setState("error");
            setError(e.response?.data?.error ?? "Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss() { setState("idle"); } },
        theme: { color: "#c49a3a" },
      });
      rzp.open();
    } catch (e: any) {
      setState("error");
      setError(e.response?.data?.error ?? "Failed to create payment order");
    }
  }

  if (state === "success") {
    return (
      <div className="inv-panel">
        <div className="inv-panel-success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
          </svg>
          <div className="inv-panel-success-title">Payment confirmed</div>
          <div className="inv-panel-success-sub">Redirecting to your service workspace…</div>
        </div>
      </div>
    );
  }

  const busy = state === "loading" || state === "verifying";

  return (
    <div className="inv-panel">
      <div className="inv-panel-head">
        <span className="inv-panel-label">Amount due</span>
        <span className="inv-panel-amount">{finalFmt}</span>
        {applied && (
          <span className="inv-panel-saved">You save {formatRupees(applied.discountAmount)}</span>
        )}
      </div>

      {/* Amount breakdown if coupon applied */}
      {applied && (
        <div className="inv-panel-breakdown">
          <div className="inv-panel-row"><span>Subtotal</span><span>{formatRupees(price)}</span></div>
          <div className="inv-panel-row inv-panel-row--discount">
            <span>{applied.codeType === "referral" ? "Referral discount" : "Coupon discount"}</span>
            <span>−{formatRupees(applied.discountAmount)}</span>
          </div>
          <div className="inv-panel-row inv-panel-row--total">
            <span>Total payable</span>
            <span>{formatRupees(applied.finalAmount)}</span>
          </div>
        </div>
      )}

      {/* Coupon / referral code */}
      <div className="inv-coupon-section">
        {!applied ? (
          <>
            <div className="inv-coupon-label">Have a coupon code?</div>
            <div className="inv-coupon-row">
              <input
                className={`inv-coupon-input${cError ? " inv-coupon-input--error" : ""}`}
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCError(null); }}
                onKeyDown={e => e.key === "Enter" && applyCode()}
                placeholder="e.g. SAVE500"
                disabled={busy}
              />
              <button
                className="inv-coupon-btn"
                onClick={applyCode}
                disabled={!code.trim() || cLoading || busy}
              >
                {cLoading ? "…" : "Apply"}
              </button>
            </div>
            {cError && <p className="inv-coupon-error">{cError}</p>}
          </>
        ) : (
          <div className="inv-coupon-applied">
            <div>
              <div className="inv-coupon-applied-code">{code || applied.description}</div>
              <div className="inv-coupon-applied-desc">{applied.description}</div>
            </div>
            <button className="inv-coupon-remove" onClick={() => { setApplied(null); setCode(""); setCError(null); }}>
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="inv-pay-error">
          <span>{error}</span>
          <button onClick={() => { setState("idle"); setError(null); }}>Retry</button>
        </div>
      )}

      {/* Pay button */}
      <button
        className={`inv-pay-btn${busy ? " inv-pay-btn--busy" : ""}`}
        onClick={handlePay}
        disabled={busy || !ready}
      >
        {state === "loading" ? (
          <><span className="inv-pay-spinner" /> Preparing order…</>
        ) : state === "verifying" ? (
          <><span className="inv-pay-spinner" /> Confirming payment…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Pay {finalFmt}
          </>
        )}
      </button>

      <div className="inv-pay-secure">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Razorpay · One-time charge
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function InvoicePage() {
  const { id } = useParams();

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [invRes, setRes] = await Promise.all([
        apiClient.get(`/payments/invoices/${id}`),
        apiClient.get("/payments/invoice-settings").catch(() => ({ data: { data: null } })),
      ]);
      return { invoice: invRes.data.data, settings: setRes.data.data };
    },
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;

  if (queryError || !data?.invoice) {
    return (
      <div className="inv-shell">
        <Link to="/client/payments" className="inv-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to Payments
        </Link>
        <div className="inv-not-found">
          <div className="inv-not-found-title">Invoice not found</div>
          <p>This invoice may have been removed or you may not have access to it.</p>
          <Link to="/client/payments" className="btn btn-secondary" style={{ marginTop: "1rem" }}>Back to Payments</Link>
        </div>
      </div>
    );
  }

  const invoice = data.invoice;
  const s = data.settings;

  const isPaid    = invoice.status === "paid" || invoice.status === "captured";
  const isPending = invoice.status === "pending" || invoice.status === "overdue";
  const isOverdue = invoice.status === "overdue" ||
    (!isPaid && !!invoice.due_date && new Date(invoice.due_date) < new Date());

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const clientName = invoice.client ? `${invoice.client.first_name} ${invoice.client.last_name}`.trim() : "Client";
  const bizName = s?.business_name ?? "TheTaxpert";
  const bizEmail = s?.support_email ?? "info@thetaxpert.com";
  const bizWebsite = s?.website ?? "https://thetaxpert.com";
  const bizPhone = s?.support_phone ?? null;
  const bizPan = s?.pan ?? null;
  const terms = s?.default_terms ?? "Payment is due within 7 days of invoice date.";
  const payInstr = s?.payment_instructions ?? null;
  const hasBanking = !!(s?.bank_name || s?.upi_id || s?.account_number);

  return (
    <div className="inv-shell">

      {/* Top bar */}
      <div className="inv-topbar">
        <Link to="/client/payments" className="inv-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Payments
        </Link>
        <button className="inv-print-btn" onClick={() => window.print()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Download / Print
        </button>
      </div>

      {/* Overdue banner */}
      {isOverdue && !isPaid && (
        <div className="inv-overdue-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>Payment overdue.</strong> This invoice was due on {fmt(invoice.due_date)} and has not been settled.
            Please complete payment to avoid any disruption to your service.
          </span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="inv-layout">

        {/* ── Left: Printable invoice document ─────────────── */}
        <div className="inv-doc" id="invoice-printable">

          {/* Gold accent bar */}
          <div className="inv-doc-accent" />

          {/* Header: business + invoice meta */}
          <div className="inv-doc-header">
            <div className="inv-doc-biz">
              <div className="inv-doc-biz-name">{bizName}</div>
              {bizWebsite && <div className="inv-doc-biz-meta">{bizWebsite}</div>}
              {bizEmail && <div className="inv-doc-biz-meta">{bizEmail}</div>}
              {bizPhone && <div className="inv-doc-biz-meta">{bizPhone}</div>}
              {bizPan && <div className="inv-doc-biz-pan">PAN: {bizPan}</div>}
            </div>
            <div className="inv-doc-meta">
              <div className="inv-doc-num">Invoice #{invoice.invoice_number}</div>
              <div className={`inv-doc-status inv-doc-status--${isPaid ? "paid" : isOverdue ? "overdue" : "due"}`}>
                {isPaid ? "Paid" : isOverdue ? "Overdue" : "Due"}
              </div>
            </div>
          </div>

          <div className="inv-doc-rule" />

          {/* Bill To + Dates */}
          <div className="inv-doc-parties">
            <div>
              <div className="inv-doc-section-label">Bill To</div>
              <div className="inv-doc-client-name">{clientName}</div>
              {invoice.client?.pan && <div className="inv-doc-client-detail">PAN: {invoice.client.pan}</div>}
              {invoice.client?.email && <div className="inv-doc-client-detail">{invoice.client.email}</div>}
            </div>
            <div className="inv-doc-dates">
              <div className="inv-doc-date-row">
                <span className="inv-doc-date-label">Issue date</span>
                <span className="inv-doc-date-val">{fmt(invoice.issued_at)}</span>
              </div>
              {invoice.due_date && (
                <div className="inv-doc-date-row">
                  <span className="inv-doc-date-label">{isPaid ? "Was due" : "Due date"}</span>
                  <span className={`inv-doc-date-val${!isPaid ? " inv-doc-date-val--due" : ""}`}>{fmt(invoice.due_date)}</span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="inv-doc-date-row">
                  <span className="inv-doc-date-label">Paid on</span>
                  <span className="inv-doc-date-val inv-doc-date-val--paid">{fmt(invoice.paid_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <table className="inv-table">
            <thead>
              <tr>
                <th className="inv-th inv-th--left">Description</th>
                <th className="inv-th">Qty</th>
                <th className="inv-th">Unit price</th>
                <th className="inv-th inv-th--right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.invoice_items ?? []).map((item: any, i: number) => (
                <tr key={item.id ?? i} className="inv-tr">
                  <td className="inv-td inv-td--left">
                    <div className="inv-td-desc">{item.description}</div>
                    {invoice.service?.category && <div className="inv-td-cat">{invoice.service.category}</div>}
                  </td>
                  <td className="inv-td inv-td--center">{item.quantity}</td>
                  <td className="inv-td">{formatRupees(item.unit_price)}</td>
                  <td className="inv-td inv-td--right inv-td--bold">{formatRupees(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="inv-totals">
            <div className="inv-totals-inner">
              {invoice.subtotal !== invoice.total_amount && (
                <div className="inv-totals-row">
                  <span>Subtotal</span>
                  <span>{formatRupees(invoice.subtotal)}</span>
                </div>
              )}
              <div className="inv-totals-row inv-totals-row--total">
                <span>Total</span>
                <span>{formatRupees(invoice.total_amount)}</span>
              </div>
              {isPaid && (
                <div className="inv-totals-row inv-totals-row--paid">
                  <span>Amount paid</span>
                  <span>{formatRupees(invoice.total_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Banking details */}
          {hasBanking && (
            <div className="inv-banking">
              <div className="inv-section-label">Payment Details</div>
              <div className="inv-banking-grid">
                {s?.bank_name && <div className="inv-banking-item"><span>Bank</span>{s.bank_name}</div>}
                {s?.account_holder_name && <div className="inv-banking-item"><span>Account name</span>{s.account_holder_name}</div>}
                {s?.account_number && <div className="inv-banking-item"><span>Account no.</span>{s.account_number}</div>}
                {s?.ifsc && <div className="inv-banking-item"><span>IFSC</span>{s.ifsc}</div>}
                {s?.upi_id && <div className="inv-banking-item"><span>UPI ID</span>{s.upi_id}</div>}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="inv-footer">
            {terms && <p className="inv-footer-line"><strong>Terms:</strong> {terms}</p>}
            {payInstr && <p className="inv-footer-line"><strong>Payment:</strong> {payInstr}</p>}
            <p className="inv-footer-brand">{bizName} · {bizEmail}{bizWebsite ? ` · ${bizWebsite}` : ""}</p>
          </div>
        </div>

        {/* ── Right: Payment panel (sticky) ─────────────────── */}
        <div className="inv-panel-col">
          {isPending && invoice.service?.slug ? (
            <PaymentPanel
              serviceSlug={invoice.service.slug}
              serviceName={invoice.service.name ?? "Professional Service"}
              clientServiceId={id}
              price={invoice.total_amount}
              invoice={invoice}
            />
          ) : isPaid ? (
            <div className="inv-panel inv-panel--paid">
              <div className="inv-panel-paid-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="inv-panel-paid-title">Invoice paid</div>
              <div className="inv-panel-paid-amount">{formatRupees(invoice.total_amount)}</div>
              {invoice.paid_at && <div className="inv-panel-paid-date">on {fmt(invoice.paid_at)}</div>}
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
