import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../contexts/AuthContext";
import { formatRupees } from "../../../shared/finance-utils";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button className="ref-copy-btn" onClick={handleCopy}>
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
      <div className="db-coming-soon">
        <h2>Referrals</h2>
        <p style={{ color: "var(--danger)" }}>Could not load referral data. Please refresh.</p>
      </div>
    );
  }

  const shareUrl = `https://thetaxpert.com/register?ref=${data.referralCode}`;

  function handleEmailShare(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("Join TheTaxpert — Tax filing made simple");
    const body = encodeURIComponent(
      `Hi,\n\nI've been using TheTaxpert for my tax filings and it's been great.\n\nSign up with my referral code ${data.referralCode} and get ₹500 off your first service:\n${shareUrl}\n\nCheers!`
    );
    window.location.href = `mailto:${emailInput}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="ref-shell">
      <h1 className="ref-title">Refer &amp; Earn</h1>
      <p className="ref-subtitle">
        Share your code and earn <strong>10% of their first payment</strong> (up to ₹1,000) as a reward coupon.
        Your friend gets <strong>₹500 off</strong> their first service.
      </p>

      {/* Referral code card */}
      <div className="ref-code-card">
        <span className="ref-code-eyebrow">Your referral code</span>
        <div className="ref-code-row">
          <span className="ref-code">{data.referralCode}</span>
          <CopyButton code={data.referralCode} />
        </div>
        <div className="ref-share-row">
          <span className="ref-share-label">Share link:</span>
          <span className="ref-share-url">{shareUrl}</span>
          <CopyButton code={shareUrl} />
        </div>
        <div className="ref-share-row" style={{ marginTop: "1rem" }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join TheTaxpert — use my referral code ${data.referralCode} to get ₹500 off your first service: ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            Share via WhatsApp
          </a>
        </div>
      </div>

      {/* Email Share */}
      <div className="ref-code-card">
        <span className="ref-code-eyebrow">Share via Email</span>
        <form onSubmit={handleEmailShare} style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
          <input
            type="email"
            placeholder="friend@example.com"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            required
            className="pm-filter-input"
            style={{ flex: 1, height: "40px" }}
          />
          <button type="submit" className="btn btn-primary" style={{ height: "40px", minHeight: "40px" }}>
            Send Invite
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="ref-stats-row">
        <div className="ref-stat-card">
          <span className="ref-stat-num">{data.count}</span>
          <span className="ref-stat-label">Referrals</span>
        </div>
        <div className="ref-stat-card">
          <span className="ref-stat-num">{formatRupees(data.totalEarned)}</span>
          <span className="ref-stat-label">Total earned</span>
        </div>
        <div className="ref-stat-card">
          <span className="ref-stat-num">{data.rewardCoupons.length}</span>
          <span className="ref-stat-label">Reward coupons</span>
        </div>
      </div>

      {/* Coupons List */}
      {data.rewardCoupons.length > 0 && (
        <div className="ref-section">
          <h2 className="ref-section-title">Your reward coupons</h2>
          <div className="ref-coupon-list">
            {data.rewardCoupons.map((c: any) => (
              <div key={c.id} className={`ref-coupon-row${!c.is_active ? " ref-coupon-used" : ""}`}>
                <div className="ref-coupon-code">{c.code}</div>
                <div className="ref-coupon-desc">{c.description ?? formatRupees(c.value) + " off"}</div>
                <div className="ref-coupon-status">
                  {c.is_active && c.used_count === 0 ? (
                    <span className="ref-badge ref-badge-active">Available</span>
                  ) : (
                    <span className="ref-badge ref-badge-used">Used</span>
                  )}
                </div>
                {c.is_active && <CopyButton code={c.code} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {data.referrals.length > 0 ? (
        <div className="ref-section">
          <h2 className="ref-section-title">Referral history</h2>
          <div className="ref-history-list">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="ref-history-row">
                <div className="ref-history-name">
                  {r.referred ? `${r.referred.first_name ?? ""} ${r.referred.last_name ?? ""}`.trim() || "User" : "User"}
                </div>
                <div className={`ref-badge ref-badge-${r.status === 'rewarded' ? 'rewarded' : r.status === 'converted' ? 'converted' : 'pending'}`}>
                  {r.status === "rewarded" ? "Rewarded" : r.status === "converted" ? "Converted" : "Pending"}
                </div>
                {r.reward_amount != null && (
                  <div className="ref-history-reward">+{formatRupees(r.reward_amount)}</div>
                )}
                <div className="ref-history-date">
                  {new Date(r.converted_at ?? r.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ref-empty">
          <p>No referrals yet. Share your code and start earning!</p>
        </div>
      )}
    </div>
  );
}
