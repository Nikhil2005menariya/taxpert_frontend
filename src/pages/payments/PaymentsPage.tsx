import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { formatRupees, calcGst } from "../../shared/finance-utils";

function AdminPaymentsClient({ payments, stats }: { payments: any[], stats: any }) {
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
    setStartDate(""); setEndDate(""); setSearch("");
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
    <div className="pm-shell">
      <div className="db-page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">All transactions · GST worksheet · User tracking</p>
        </div>
        <a
          href={`http://localhost:4000/api/payments/admin/export?status=captured${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`}
          className="bg-white border border-[#e2e8f0] text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-50 transition-colors"
          download
        >
          ↓ Download GST Worksheet
        </a>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Revenue", value: formatRupees(stats.total) },
            { label: "GST Collected", value: formatRupees(stats.gst) },
            { label: "This Month", value: formatRupees(stats.thisMonth) },
            { label: "Total Payments", value: stats.count.toString() },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem", background: "white", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-gray-300 rounded outline-none focus:border-[#c49a3a]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-gray-300 rounded outline-none focus:border-[#c49a3a]" />
        </div>
        <button onClick={applyFilters} className="bg-[#1e293b] text-white px-4 py-2 rounded font-medium hover:bg-[#0f172a] transition-colors">Apply</button>
        <button onClick={clearFilters} className="bg-gray-100 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-200 transition-colors">Clear</button>
        <div style={{ flex: 1, minWidth: "250px" }}>
          <input
            type="search"
            placeholder="Search user, PAN, service, payment ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded outline-none focus:border-[#c49a3a]"
          />
        </div>
      </div>

      {filtered.length > 0 && (
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "#475569", marginBottom: "1rem", padding: "0 0.5rem" }}>
          <span>{filtered.length} payments</span>
          <span>Total: <strong>{formatRupees(totalFiltered)}</strong></span>
          <span>GST: <strong>{formatRupees(gstFiltered)}</strong></span>
        </div>
      )}

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payments found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="p-3 pl-4">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">PAN</th>
                <th className="p-3">Service</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Base</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3">Method</th>
                <th className="p-3">Payment ID</th>
                <th className="p-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
              {filtered.map(p => {
                const { base, gst } = calcGst(p.amount, p.gst_rate ?? 18);
                const up = p.user_profile;
                const date = new Date(p.captured_at ?? p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-3 pl-4 whitespace-nowrap">{date}</td>
                    <td className="p-3 font-medium text-gray-900">{up ? `${up.first_name ?? ""} ${up.last_name ?? ""}`.trim() : "—"}</td>
                    <td className="p-3 font-mono text-xs">{up?.pan ?? "—"}</td>
                    <td className="p-3">{p.service?.name ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{formatRupees(p.amount)}</td>
                    <td className="p-3 text-right">{formatRupees(base)}</td>
                    <td className="p-3 text-right text-gray-500">{formatRupees(gst)}</td>
                    <td className="p-3">{p.payment_method ?? "—"}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{p.razorpay_payment_id ?? "—"}</td>
                    <td className="p-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${p.status === 'captured' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
              <tr>
                <td colSpan={4} className="p-3 pl-4 text-gray-600">Total ({filtered.length} records)</td>
                <td className="p-3 text-right">{formatRupees(totalFiltered)}</td>
                <td className="p-3 text-right">{formatRupees(totalFiltered - gstFiltered)}</td>
                <td className="p-3 text-right text-gray-500">{formatRupees(gstFiltered)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function ClientPaymentsClient({ myPayments, pendingInvoices }: { myPayments: any[], pendingInvoices: any[] }) {
  return (
    <div className="pm-client-shell">
      <div className="db-page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-sub">Your invoices and payment history.</p>
      </div>

      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Pending Invoices</h2>
          {pendingInvoices.length > 0 && (
            <span style={{ background: "#ef4444", color: "white", padding: "0.1rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700 }}>{pendingInvoices.length}</span>
          )}
        </div>

        {pendingInvoices.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", fontWeight: 500, background: "#ecfdf5", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #a7f3d0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 7-11 11-5-5"/></svg>
            <span>No pending invoices</span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pendingInvoices.map(cs => {
              const price = cs.service?.price ?? null;
              return (
                <div key={cs.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{cs.service?.name}</div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{cs.service?.category}</div>
                    {price && price > 0 ? (
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c49a3a", marginTop: "0.5rem" }}>{formatRupees(price)}</div>
                    ) : (
                      <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>Service ready · Invoice pending</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                    <span style={{ background: "#fef3c7", color: "#b45309", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Invoice Pending</span>
                    {cs.id ? (
                      <Link to={`/invoices/${cs.id}`} className="bg-[#1e293b] hover:bg-[#0f172a] text-white px-4 py-2 rounded font-medium transition-colors">Pay Now →</Link>
                    ) : (
                      <a href="mailto:info@thetaxpert.com" style={{ fontSize: "0.875rem", color: "#c49a3a", fontWeight: 500 }}>Contact your Taxpert</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Payment History</h2>
          {myPayments.length > 0 && (
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{myPayments.length} transaction{myPayments.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {!myPayments.length ? (
          <div className="card text-center" style={{ padding: "3rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>💳</div>
            <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "0.25rem" }}>No payments yet.</p>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Your completed payment receipts will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {myPayments.map(p => {
              const { base, gst } = calcGst(p.amount, p.gst_rate ?? 18);
              const date = new Date(p.captured_at ?? p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              
              return (
                <div key={p.id} className="card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px dashed #e2e8f0" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "1.05rem" }}>{p.service?.name}</div>
                      <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{p.service?.category}</div>
                      <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>{date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>{formatRupees(p.amount)}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${p.status === 'captured' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {p.status === "captured" ? "Paid" : p.status}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: "0.875rem", color: "#475569" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span>Base amount</span><span>{formatRupees(base)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span>GST ({p.gst_rate ?? 18}%)</span><span>{formatRupees(gst)}</span>
                    </div>
                    {p.razorpay_payment_id && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span>Payment ID</span><span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{p.razorpay_payment_id}</span>
                      </div>
                    )}
                    {p.client_service_id && (
                      <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                        <Link to={`/my-services/${p.client_service_id}`} style={{ color: "#2563eb", fontWeight: 500 }}>
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
        apiClient.get(`/payments/admin/stats`)
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
        apiClient.get("/payments/pending-invoices")
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

  return <ClientPaymentsClient myPayments={clientData?.myPayments ?? []} pendingInvoices={clientData?.pendingInvoices ?? []} />;
}
