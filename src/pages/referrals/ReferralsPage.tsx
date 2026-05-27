import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { formatRupees } from "../../shared/finance-utils";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy} style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "0.25rem 0.5rem", borderRadius: "4px", border: "none", cursor: "pointer" }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [emailInput, setEmailInput] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const res = await apiClient.get("/coupons/my-referrals");
      return res.data.data;
    },
    enabled: profile?.role === "client",
  });

  if (isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;

  if (error || !data) {
    return (
      <div className="db-shell">
        <h1 className="page-title">Refer & Earn</h1>
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#ef4444" }}>Could not load referral data. Please refresh.</p>
        </div>
      </div>
    );
  }

  const shareUrl = `https://thetaxpert.com/register?ref=${data.referralCode}`;

  function handleEmailShare(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("Join TheTaxpert — Tax filing made simple");
    const body = encodeURIComponent(`Hi,\n\nI've been using TheTaxpert for my tax filings and it's been great.\n\nSign up with my referral code ${data.referralCode} and get ₹500 off your first service:\n${shareUrl}\n\nCheers!`);
    window.location.href = `mailto:${emailInput}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="db-shell">
      <div className="db-page-header">
        <h1 className="page-title">Refer & Earn</h1>
        <p className="page-sub">
          Share your code and earn <strong>10% of their first payment</strong> (up to ₹1,000) as a reward coupon. Your friend gets <strong>₹500 off</strong> their first service.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Referral code card */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Your referral code</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem", border: "1px dashed #cbd5e1" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.1em" }}>{data.referralCode}</span>
            <CopyButton code={data.referralCode} />
          </div>
          
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Share link:</span>
            <span style={{ fontSize: "0.875rem", color: "#0f172a", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shareUrl}</span>
            <CopyButton code={shareUrl} />
          </div>
          
          <div style={{ marginTop: "1rem" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join TheTaxpert — use my referral code ${data.referralCode} to get ₹500 off your first service: ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#25d366] hover:bg-[#1fa952] text-white px-4 py-2 rounded font-medium transition-colors">
              Share via WhatsApp
            </a>
          </div>
        </div>

        {/* Email Share */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Share via Email</span>
          <form onSubmit={handleEmailShare} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            <input type="email" placeholder="friend@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} required className="w-full p-3 border border-gray-300 rounded outline-none focus:border-[#c49a3a]" />
            <button type="submit" className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white px-4 py-3 rounded font-medium transition-colors">Send Invite</button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Referrals", value: data.count },
          { label: "Total earned", value: formatRupees(data.totalEarned) },
          { label: "Reward coupons", value: data.rewardCoupons.length }
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#c49a3a" }}>{s.value}</div>
            <div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.5rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coupons List */}
      {data.rewardCoupons.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Your reward coupons</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {data.rewardCoupons.map((c: any) => (
              <div key={c.id} className="card" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: !c.is_active ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.1em" }}>{c.code}</div>
                  <div style={{ fontSize: "0.95rem", color: "#475569" }}>{c.description ?? formatRupees(c.value) + " off"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {c.is_active && c.used_count === 0 ? (
                    <span style={{ background: "#dcfce7", color: "#166534", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600 }}>Available</span>
                  ) : (
                    <span style={{ background: "#f1f5f9", color: "#64748b", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600 }}>Used</span>
                  )}
                  {c.is_active && <CopyButton code={c.code} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {data.referrals.length > 0 ? (
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Referral history</h2>
          <div className="card overflow-hidden">
            <div style={{ display: "grid", gap: "1px", background: "#f1f5f9" }}>
              {data.referrals.map((r: any) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", background: "white" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {r.referred ? `${r.referred.first_name ?? ""} ${r.referred.last_name ?? ""}`.trim() || "User" : "User"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
                      {new Date(r.converted_at ?? r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <span style={{ 
                      padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                      ...(r.status === "rewarded" ? { background: "#dcfce7", color: "#166534" } : 
                         r.status === "converted" ? { background: "#dbeafe", color: "#1e40af" } : 
                         { background: "#fef3c7", color: "#b45309" })
                    }}>
                      {r.status === "rewarded" ? "Rewarded" : r.status === "converted" ? "Converted" : "Pending"}
                    </span>
                    {r.reward_amount != null && (
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981", width: "80px", textAlign: "right" }}>+{formatRupees(r.reward_amount)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          No referrals yet. Share your code and start earning!
        </div>
      )}
    </div>
  );
}
