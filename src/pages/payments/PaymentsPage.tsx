import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { formatRupees, calcGst } from "../../shared/finance-utils";

interface ServiceRef {
  name?: string;
  category?: string;
}

interface UserProfileRef {
  first_name?: string;
  last_name?: string;
  pan?: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  gst_amount: number;
  gst_rate: number;
  status: string;
  captured_at: string | null;
  created_at: string;
  razorpay_payment_id: string | null;
  payment_method: string | null;
  service: ServiceRef | null;
  user_profile: UserProfileRef | null;
}

interface ClientPaymentRow {
  id: string;
  amount: number;
  gst_rate: number;
  status: string;
  captured_at: string | null;
  created_at: string;
  razorpay_payment_id: string | null;
  client_service_id: string | null;
  service: ServiceRef | null;
}

function AdminPaymentsClient({ payments, stats }: { payments: PaymentRow[]; stats: any }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [search, setSearch] = useState("");

  function applyFilters() {
    const params = new URLSearchParams(searchParams);
    if (startDate) params.set("startDate", startDate); else params.delete("startDate");
    if (endDate) params.set("endDate", endDate); else params.delete("endDate");
    setSearchParams(params);
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setSearch("");
    setSearchParams(new URLSearchParams());
  }

  const filtered = search.trim()
    ? payments.filter(p => {
        const name = [p.user_profile?.first_name, p.user_profile?.last_name].join(" ").toLowerCase();
        const pan = p.user_profile?.pan?.toLowerCase() ?? "";
        const svc = p.service?.name?.toLowerCase() ?? "";
        const pid = p.razorpay_payment_id?.toLowerCase() ?? "";
        const q = search.toLowerCase();
        return name.includes(q) || pan.includes(q) || svc.includes(q) || pid.includes(q);
      })
    : payments;

  const totalFiltered = filtered.reduce((s, p) => s + p.amount, 0);
  const gstFiltered = filtered.reduce((s, p) => s + (p.gst_amount || calcGst(p.amount, p.gst_rate).gst), 0);

  return (
    <div className="db-shell">
      <div className="pm-page-header">
        <div>
          <h1 className="db-page-title">Payments</h1>
          <p className="db-page-sub">All transactions · GST worksheet · User tracking</p>
        </div>
        <a
          href={`http://localhost:4000/api/payments/admin/export?status=captured${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`}
          className="btn btn-secondary pm-export-btn"
          download
        >
          ↓ Download GST Worksheet
        </a>
      </div>

      {stats && (
        <div className="pm-stats-grid">
          {[
            { label: "Total Revenue", value: formatRupees(stats.total) },
            { label: "GST Collected", value: formatRupees(stats.gst) },
            { label: "This Month", value: formatRupees(stats.thisMonth) },
            { label: "Total Payments", value: stats.count.toString() },
          ].map(s => (
            <div key={s.label} className="pm-stat-card">
              <span className="pm-stat-value">{s.value}</span>
              <span className="pm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="pm-filter-bar">
        <div className="pm-filter-group">
          <label className="pm-filter-label">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="pm-filter-input"
          />
        </div>
        <div className="pm-filter-group">
          <label className="pm-filter-label">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="pm-filter-input"
          />
        </div>
        <button onClick={applyFilters} className="pm-filter-apply">Apply</button>
        <button onClick={clearFilters} className="pm-filter-clear">Clear</button>
        <div className="pm-filter-search-wrap">
          <input
            type="search"
            placeholder="Search user, PAN, service, payment ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pm-filter-search"
          />
        </div>
      </div>

      {/* Summary for filtered set */}
      {filtered.length > 0 && (
        <div className="pm-filter-summary">
          <span>{filtered.length} payments</span>
          <span>Total: <strong>{formatRupees(totalFiltered)}</strong></span>
          <span>GST: <strong>{formatRupees(gstFiltered)}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="pm-table-wrap">
        {filtered.length === 0 ? (
          <div className="pm-empty">No payments found.</div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-th">Date</th>
                <th className="pm-th">Customer</th>
                <th className="pm-th">PAN</th>
                <th className="pm-th">Service</th>
                <th className="pm-th pm-th-num">Amount</th>
                <th className="pm-th pm-th-num">Base</th>
                <th className="pm-th pm-th-num">GST</th>
                <th className="pm-th">Method</th>
                <th className="pm-th">Payment ID</th>
                <th className="pm-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const { base, gst } = calcGst(p.amount, p.gst_rate ?? 18);
                const up = p.user_profile;
                const date = new Date(p.captured_at ?? p.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                return (
                  <tr key={p.id} className="pm-tr">
                    <td className="pm-td pm-td-date">{date}</td>
                    <td className="pm-td font-medium">
                      {up ? `${up.first_name ?? ""} ${up.last_name ?? ""}`.trim() : "—"}
                    </td>
                    <td className="pm-td pm-td-mono">{up?.pan ?? "—"}</td>
                    <td className="pm-td pm-td-service">{p.service?.name ?? "—"}</td>
                    <td className="pm-td pm-td-num font-medium">{formatRupees(p.amount)}</td>
                    <td className="pm-td pm-td-num">{formatRupees(base)}</td>
                    <td className="pm-td pm-td-num pm-td-gst">{formatRupees(gst)}</td>
                    <td className="pm-td pm-td-method">{p.payment_method ?? "—"}</td>
                    <td className="pm-td pm-td-mono pm-td-pid">{p.razorpay_payment_id ?? "—"}</td>
                    <td className="pm-td">
                      <span className={`pm-status-pill pm-status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pm-tfoot-row">
                <td colSpan={4} className="pm-td pm-tfoot-label">Total ({filtered.length} records)</td>
                <td className="pm-td pm-td-num pm-tfoot-val">{formatRupees(totalFiltered)}</td>
                <td className="pm-td pm-td-num pm-tfoot-val">{formatRupees(totalFiltered - gstFiltered)}</td>
                <td className="pm-td pm-td-num pm-tfoot-val pm-td-gst">{formatRupees(gstFiltered)}</td>
                <td colSpan={3} className="pm-td"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function ClientPaymentsClient({
  myPayments,
  pendingInvoices,
}: {
  myPayments: ClientPaymentRow[];
  pendingInvoices: any[];
}) {
  return (
    <div className="pm-client-shell">
      <div className="pm-client-header">
        <h1 className="db-page-title">Payments</h1>
        <p className="db-page-sub">Your invoices and payment history.</p>
      </div>

      {/* ── Pending Invoices ── */}
      <section className="pm-section">
        <div className="pm-section-header">
          <span className="pm-section-title">Pending Invoices</span>
          {pendingInvoices.length > 0 && (
            <span className="pm-section-badge pm-badge-urgent">{pendingInvoices.length}</span>
          )}
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="pm-invoice-clear">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green-600)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m20 7-11 11-5-5" />
            </svg>
            <span>No pending invoices</span>
          </div>
        ) : (
          <div className="pm-invoice-list">
            {pendingInvoices.map(cs => {
              const price = cs.service?.price ?? null;
              return (
                <div key={cs.id} className="pm-invoice-card">
                  <div className="pm-invoice-left">
                    <div className="pm-invoice-service">{cs.service?.name}</div>
                    <div className="pm-invoice-category">{cs.service?.category}</div>
                    {price && price > 0 ? (
                      <div className="pm-invoice-amount">{formatRupees(price)}</div>
                    ) : (
                      <div className="pm-invoice-meta">Service ready · Invoice pending</div>
                    )}
                  </div>
                  <div className="pm-invoice-right">
                    <span className="pm-invoice-status-badge">Invoice Pending</span>
                    {cs.id ? (
                      <Link to={`/invoices/${cs.id}`} className="btn btn-primary pm-pay-btn">
                        Pay Now →
                      </Link>
                    ) : (
                      <a href="mailto:info@thetaxpert.com" className="pm-invoice-contact">
                        Contact your Taxpert
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Payment History ── */}
      <section className="pm-section">
        <div className="pm-section-header">
          <span className="pm-section-title">Payment History</span>
          {myPayments.length > 0 && (
            <span className="pm-section-count">
              {myPayments.length} transaction{myPayments.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!myPayments.length ? (
          <div className="pm-empty">
            <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "1rem" }}>💳</span>
            <p style={{ fontWeight: 600, color: "var(--ink-900)", marginBottom: "0.25rem" }}>No payments yet.</p>
            <p style={{ color: "var(--ink-400)", fontSize: "0.95rem" }}>
              Your completed payment receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="pm-history-list">
            {myPayments.map(p => {
              const { base, gst } = calcGst(p.amount, p.gst_rate ?? 18);
              const date = new Date(p.captured_at ?? p.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div key={p.id} className="pm-receipt-card">
                  <div className="pm-receipt-top">
                    <div>
                      <div className="pm-receipt-service">{p.service?.name}</div>
                      <div className="pm-receipt-category">{p.service?.category}</div>
                      <div className="pm-receipt-date">{date}</div>
                    </div>
                    <div className="pm-receipt-right">
                      <span className="pm-receipt-amount">{formatRupees(p.amount)}</span>
                      <span className={`pm-receipt-status pm-status-${p.status}`}>
                        {p.status === "captured" ? "Paid" : p.status}
                      </span>
                    </div>
                  </div>

                  <div className="pm-receipt-breakdown">
                    <div className="pm-breakdown-row">
                      <span>Base amount</span>
                      <span>{formatRupees(base)}</span>
                    </div>
                    <div className="pm-breakdown-row">
                      <span>GST ({p.gst_rate ?? 18}%)</span>
                      <span>{formatRupees(gst)}</span>
                    </div>
                    {p.razorpay_payment_id && (
                      <div className="pm-breakdown-row pm-payment-id-row">
                        <span>Payment ID</span>
                        <span className="pm-mono">{p.razorpay_payment_id}</span>
                      </div>
                    )}
                    {p.client_service_id && (
                      <div
                        className="pm-breakdown-row"
                        style={{ borderTop: "1px solid var(--line-soft)", paddingTop: "0.5rem", marginTop: "0.25rem" }}
                      >
                        <Link to={`/my-services/${p.client_service_id}`} className="pm-view-service-link">
                          View service workspace →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PaymentsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isClient = profile?.role === "client";
  const [searchParams] = useSearchParams();

  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ["admin-payments", searchParams.toString()],
    queryFn: async () => {
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const [paymentsRes, statsRes] = await Promise.all([
        apiClient.get(`/payments/admin/all${qs}`),
        apiClient.get(`/payments/admin/stats`),
      ]);
      return { payments: paymentsRes.data.data, stats: statsRes.data.data };
    },
    enabled: isAdmin,
  });

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const [myRes, pendingRes] = await Promise.all([
        apiClient.get("/payments/my-payments"),
        apiClient.get("/payments/pending-invoices"),
      ]);
      return { myPayments: myRes.data.data, pendingInvoices: pendingRes.data.data };
    },
    enabled: isClient,
  });

  if (authLoading || (isAdmin && adminLoading) || (isClient && clientLoading)) {
    return <div className="page-loader"><div className="page-loader-ring" /></div>;
  }

  if (!isAdmin && !isClient) return <Navigate to="/dashboard" replace />;

  if (isAdmin) {
    return <AdminPaymentsClient payments={adminData?.payments ?? []} stats={adminData?.stats} />;
  }

  return (
    <ClientPaymentsClient
      myPayments={clientData?.myPayments ?? []}
      pendingInvoices={clientData?.pendingInvoices ?? []}
    />
  );
}
