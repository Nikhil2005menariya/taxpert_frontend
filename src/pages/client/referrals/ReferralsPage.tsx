import { useState } from "react";
import Loader from "../../../components/ui/Loader";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../contexts/AuthContext";
import { formatRupees } from "../../../shared/finance-utils";

// ── Inline copy button ─────────────────────────────────────────

function CopyBtn({ text, label = "Copy code", compact = false }: { text: string; label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  function go() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className={`rf-copybtn${compact ? ' rf-copybtn--compact' : ''}${copied ? ' rf-copybtn--done' : ''}`} onClick={go}>
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Code character display ─────────────────────────────────────

function CodeChars({ code }: { code: string }) {
  return (
    <div className="rf-chars">
      {code.split('').map((ch, i) =>
        ch === '-'
          ? <span key={i} className="rf-char-sep">—</span>
          : <span key={i} className="rf-char">{ch}</span>
      )}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    rewarded:  { label: 'Rewarded',  cls: 'rf-badge--rewarded'  },
    converted: { label: 'Converted', cls: 'rf-badge--converted' },
    pending:   { label: 'Pending',   cls: 'rf-badge--pending'   },
  };
  const m = map[status] ?? { label: status, cls: '' };
  return <span className={`rf-badge ${m.cls}`}>{m.label}</span>;
}

// ── Avatar initials ────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
  return <div className="rf-avatar">{initials}</div>;
}

// ── Main page ──────────────────────────────────────────────────

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [email, setEmail] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: async () => (await apiClient.get('/coupons/my-referrals')).data.data,
    enabled: profile?.role === 'client',
  });

  if (isLoading) return <div className="page-loader"><Loader /></div>;

  if (error || !data) {
    return (
      <div className="rf-shell">
        <div className="rf-error">
          <div className="rf-error-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="rf-error-title">Could not load referral data</p>
          <p className="rf-error-sub">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const shareUrl = `https://thetaxpert.com/register?ref=${data.referralCode}`;

  function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent('Join TheTaxpert — Tax filing made simple');
    const body = encodeURIComponent(
      `Hi,\n\nI've been using TheTaxpert for my tax filings and it's been fantastic.\n\nSign up with my referral code ${data.referralCode} and get ₹500 off your first service:\n${shareUrl}\n\nCheers!`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  const waLink = `https://wa.me/?text=${encodeURIComponent(`Join TheTaxpert — use my code ${data.referralCode} and get ₹500 off your first service: ${shareUrl}`)}`;

  const activeCoupons = (data.rewardCoupons ?? []).filter((c: any) => c.is_active && c.used_count === 0);
  const usedCoupons   = (data.rewardCoupons ?? []).filter((c: any) => !c.is_active || c.used_count > 0);

  return (
    <div className="rf-shell">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <div className="rf-hero">
        <div className="rf-hero-glow" />

        <div className="rf-hero-top">
          <div className="rf-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Referral Program
          </div>
          <h1 className="rf-hero-title">
            Invite friends.<br />Both of you win.
          </h1>
          <p className="rf-hero-desc">
            Your friend gets <strong>₹500 off</strong> their first service.
            You earn <strong>10% of their first payment</strong> (up to ₹1,000) as reward credits.
          </p>
        </div>

        {/* Code display */}
        <div className="rf-code-card">
          <div className="rf-code-label">Your referral code</div>
          <CodeChars code={data.referralCode} />
          <div className="rf-code-actions">
            <CopyBtn text={data.referralCode} label="Copy code" />
            <CopyBtn text={shareUrl} label="Copy link" />
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rf-wa-btn"
            >
              <svg viewBox="0 0 48 48" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z" fill="rgba(255,255,255,0.9)"/>
                <path d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z" fill="#40c351"/>
                <path clipRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" fillRule="evenodd" fill="#fff"/>
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* ══ STATS ═════════════════════════════════════════════ */}
      <div className="rf-stats">
        <div className="rf-stat">
          <div className="rf-stat-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="rf-stat-val">{data.count ?? 0}</div>
          <div className="rf-stat-label">Friends referred</div>
        </div>
        <div className="rf-stat rf-stat--accent">
          <div className="rf-stat-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <line x1="12" y1="2" x2="12" y2="22"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="rf-stat-val">{formatRupees(data.totalEarned ?? 0)}</div>
          <div className="rf-stat-label">Total earned</div>
        </div>
        <div className="rf-stat rf-stat--green">
          <div className="rf-stat-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
              <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
          <div className="rf-stat-val">{activeCoupons.length}</div>
          <div className="rf-stat-label">Active rewards</div>
        </div>
      </div>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <div className="rf-howto">
        <div className="rf-howto-head">
          <div className="rf-section-eyebrow">How it works</div>
          <h2 className="rf-howto-title">Three simple steps</h2>
        </div>
        <div className="rf-steps">
          <div className="rf-step">
            <div className="rf-step-num">01</div>
            <div className="rf-step-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
            <div className="rf-step-body">
              <div className="rf-step-title">Share your code</div>
              <div className="rf-step-desc">Send your unique code to friends via WhatsApp, email, or any channel you like.</div>
            </div>
          </div>

          <div className="rf-step-connector">
            <svg viewBox="0 0 40 12" fill="none" width="40" height="12">
              <path d="M0 6 Q10 1 20 6 Q30 11 40 6" stroke="var(--lp-hairline)" strokeWidth="1.5" strokeDasharray="3 3"/>
            </svg>
          </div>

          <div className="rf-step">
            <div className="rf-step-num">02</div>
            <div className="rf-step-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5 19.79 19.79 0 0 1 1.61 2.88 2 2 0 0 1 3.6.9h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/>
              </svg>
            </div>
            <div className="rf-step-body">
              <div className="rf-step-title">Friend signs up & pays</div>
              <div className="rf-step-desc">They register using your code and complete their first service payment. They save ₹500 instantly.</div>
            </div>
          </div>

          <div className="rf-step-connector">
            <svg viewBox="0 0 40 12" fill="none" width="40" height="12">
              <path d="M0 6 Q10 1 20 6 Q30 11 40 6" stroke="var(--lp-hairline)" strokeWidth="1.5" strokeDasharray="3 3"/>
            </svg>
          </div>

          <div className="rf-step">
            <div className="rf-step-num">03</div>
            <div className="rf-step-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <circle cx="12" cy="8" r="6"/>
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            </div>
            <div className="rf-step-body">
              <div className="rf-step-title">Both of you earn</div>
              <div className="rf-step-desc">You receive 10% of their payment as a reward coupon — up to ₹1,000 — to use on any service.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ INVITE BY EMAIL ═══════════════════════════════════ */}
      <div className="rf-invite">
        <div className="rf-invite-left">
          <div className="rf-section-eyebrow">Invite by email</div>
          <div className="rf-invite-title">Send a personal invite</div>
          <p className="rf-invite-desc">We'll pre-fill a message with your referral code and link.</p>
        </div>
        <form className="rf-invite-form" onSubmit={sendEmail}>
          <input
            type="email"
            className="rf-invite-input"
            placeholder="friend@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="rf-invite-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Send invite
          </button>
        </form>
      </div>

      {/* ══ REWARD COUPONS ════════════════════════════════════ */}
      {data.rewardCoupons?.length > 0 && (
        <div className="rf-coupons-section">
          <div className="rf-section-head">
            <div>
              <div className="rf-section-eyebrow">Your rewards</div>
              <h2 className="rf-section-title">Reward coupons</h2>
            </div>
            <div className="rf-section-meta">{activeCoupons.length} active · {usedCoupons.length} used</div>
          </div>

          <div className="rf-coupon-grid">
            {activeCoupons.map((c: any) => (
              <div key={c.id} className="rf-coupon">
                <div className="rf-coupon-notch rf-coupon-notch--top" />
                <div className="rf-coupon-notch rf-coupon-notch--bottom" />
                <div className="rf-coupon-left">
                  <div className="rf-coupon-val">
                    {c.description ? c.description : formatRupees(c.value)}
                  </div>
                  <div className="rf-coupon-off">off</div>
                </div>
                <div className="rf-coupon-right">
                  <div className="rf-coupon-code-wrap">
                    <span className="rf-coupon-code">{c.code}</span>
                    <div className="rf-coupon-status rf-coupon-status--active">Active</div>
                  </div>
                  <CopyBtn text={c.code} label="Use code" compact />
                </div>
              </div>
            ))}
            {usedCoupons.map((c: any) => (
              <div key={c.id} className="rf-coupon rf-coupon--used">
                <div className="rf-coupon-notch rf-coupon-notch--top" />
                <div className="rf-coupon-notch rf-coupon-notch--bottom" />
                <div className="rf-coupon-left">
                  <div className="rf-coupon-val">
                    {c.description ? c.description : formatRupees(c.value)}
                  </div>
                  <div className="rf-coupon-off">off</div>
                </div>
                <div className="rf-coupon-right">
                  <div className="rf-coupon-code-wrap">
                    <span className="rf-coupon-code">{c.code}</span>
                    <div className="rf-coupon-status rf-coupon-status--used">Used</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ REFERRAL HISTORY ══════════════════════════════════ */}
      <div className="rf-history-section">
        <div className="rf-section-head">
          <div>
            <div className="rf-section-eyebrow">Activity</div>
            <h2 className="rf-section-title">Referral history</h2>
          </div>
          {data.referrals?.length > 0 && (
            <span className="rf-section-meta">{data.referrals.length} referral{data.referrals.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {data.referrals?.length > 0 ? (
          <div className="rf-history-list">
            {data.referrals.map((r: any) => {
              const name = r.referred
                ? `${r.referred.first_name ?? ''} ${r.referred.last_name ?? ''}`.trim() || 'User'
                : 'User';
              const date = new Date(r.converted_at ?? r.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <div key={r.id} className="rf-hist-item">
                  <Avatar name={name} />
                  <div className="rf-hist-info">
                    <div className="rf-hist-name">{name}</div>
                    <div className="rf-hist-date">{date}</div>
                  </div>
                  <StatusBadge status={r.status} />
                  {r.reward_amount != null && r.reward_amount > 0 && (
                    <div className="rf-hist-reward">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                      </svg>
                      +{formatRupees(r.reward_amount)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rf-history-empty">
            <div className="rf-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="rf-empty-title">No referrals yet</p>
            <p className="rf-empty-sub">Share your code above and start earning rewards.</p>
          </div>
        )}
      </div>

    </div>
  );
}
