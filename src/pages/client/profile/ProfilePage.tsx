import { useState, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { apiClient } from "../../../api/client";

// ── Helpers ────────────────────────────────────────────────────

function maskPAN(pan: string) {
  if (pan.length !== 10) return pan;
  return pan.slice(0, 5) + "••••" + pan.slice(9);
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: "Super Admin", admin: "Admin",
    ca: "Taxpert", ops: "Operations", client: "Client",
  };
  return map[role] ?? "User";
}

function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw.length) return 0;
  if (pw.length < 8) return 1;
  const bonus = (+/[A-Z]/.test(pw)) + (+/\d/.test(pw)) + (+/[^a-zA-Z0-9]/.test(pw));
  if (pw.length >= 12 && bonus >= 2) return 3;
  if (bonus >= 1) return 2;
  return 1;
}

const STRENGTH_LABEL: Record<number, string> = { 1: "Weak", 2: "Fair", 3: "Strong" };

// ── Icon primitives ────────────────────────────────────────────

const Ico = ({ d, size = 16, sw = 1.8 }: { d: string; size?: number; sw?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d={d} />
  </svg>
);

// ── EyeToggle (show/hide password) ─────────────────────────────

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="prof-eye" onClick={onToggle} tabIndex={-1}>
      {show ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

// ── Status feedback row ─────────────────────────────────────────

function StatusMsg({ status, msg }: { status: "idle" | "saving" | "saved" | "error"; msg?: string | null }) {
  if (status === "saved") return (
    <span className="prof-status prof-status--ok">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      Saved successfully
    </span>
  );
  if (status === "error" && msg) return (
    <span className="prof-status prof-status--err">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </span>
  );
  return null;
}

// ── Main component ─────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [firstName,  setFirstName]  = useState(() => profile?.first_name ?? "");
  const [lastName,   setLastName]   = useState(() => profile?.last_name  ?? "");
  const [mobile,     setMobile]     = useState(() => profile?.mobile     ?? "");
  const [profStatus, setProfStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [profErr,    setProfErr]    = useState<string | null>(null);

  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [pwStatus,   setPwStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [pwErr,      setPwErr]      = useState<string | null>(null);

  const strength = pwStrength(newPw);

  const joinedDate = useMemo(() => {
    if (!profile?.created_at) return "";
    return new Date(profile.created_at).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  }, [profile?.created_at]);

  if (!user || !profile) return null;

  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";
  const isClient = profile.role === "client";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfStatus("saving"); setProfErr(null);
    try {
      await apiClient.patch("/auth/profile", { first_name: firstName, last_name: lastName, mobile });
      if (refreshProfile) await refreshProfile();
      setProfStatus("saved");
      setTimeout(() => setProfStatus("idle"), 3000);
    } catch (err: any) {
      setProfStatus("error");
      setProfErr(err.response?.data?.message ?? "Failed to update profile");
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwStatus("error"); setPwErr("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { setPwStatus("error"); setPwErr("Passwords do not match"); return; }
    setPwStatus("saving"); setPwErr(null);
    try {
      await apiClient.patch("/auth/password", { password: newPw });
      setPwStatus("saved");
      setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (err: any) {
      setPwStatus("error");
      setPwErr(err.response?.data?.message ?? "Failed to change password");
    }
  }

  return (
    <div className="prof-shell">

      {/* ══ HERO ════════════════════════════════════════════ */}
      <div className="prof-hero">
        <div className="prof-hero-glow" />
        <div className="prof-avatar">{initials}</div>
        <div className="prof-hero-body">
          <div className="prof-hero-name">{firstName} {lastName}</div>
          <div className="prof-hero-row">
            <span className="prof-role-badge">{getRoleLabel(profile.role)}</span>
            <span className="prof-hero-dot" />
            <span className="prof-hero-since">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Member since {joinedDate}
            </span>
          </div>
          <div className="prof-hero-email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            {user.email}
          </div>
        </div>
      </div>

      {/* ══ TWO-COLUMN LAYOUT ═══════════════════════════════ */}
      <div className="prof-layout">

        {/* ── Left column: editable forms ── */}
        <div className="prof-col-main">

          {/* Personal details */}
          <form className="prof-card" onSubmit={saveProfile}>
            <div className="prof-card-head">
              <div className="prof-eyebrow">
                <Ico d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" size={13}/>
                Personal details
              </div>
              <h2 className="prof-card-title">Account information</h2>
              <p className="prof-card-desc">Update your name and contact number.</p>
            </div>

            <div className="prof-form-grid">
              <div className="prof-field">
                <label className="prof-label" htmlFor="pf-fn">First name</label>
                <input id="pf-fn" className="prof-input" type="text"
                  value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="prof-field">
                <label className="prof-label" htmlFor="pf-ln">Last name</label>
                <input id="pf-ln" className="prof-input" type="text"
                  value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <div className="prof-field">
                <label className="prof-label" htmlFor="pf-mob">Mobile number</label>
                <div className="prof-input-wrap">
                  <span className="prof-input-prefix">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5 19.79 19.79 0 0 1 1.61 2.88 2 2 0 0 1 3.6.9h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/>
                    </svg>
                  </span>
                  <input id="pf-mob" className="prof-input prof-input--prefixed" type="text"
                    value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10}
                    placeholder="10-digit number" />
                </div>
              </div>
            </div>

            <div className="prof-form-footer">
              <button type="submit" className="prof-btn prof-btn--primary" disabled={profStatus === "saving"}>
                {profStatus === "saving" ? (
                  <><span className="prof-spinner" /> Saving…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save changes
                  </>
                )}
              </button>
              <StatusMsg status={profStatus} msg={profErr} />
            </div>
          </form>

          {/* Security */}
          <div className="prof-card">
            <div className="prof-card-head">
              <div className="prof-eyebrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Security
              </div>
              <h2 className="prof-card-title">Change password</h2>
              <p className="prof-card-desc">
                {isClient
                  ? "Choose a strong password with at least 8 characters."
                  : "Administrative credentials are managed via SSO."}
              </p>
            </div>

            {isClient ? (
              <form onSubmit={savePassword}>
                <div className="prof-form-grid">
                  <div className="prof-field">
                    <label className="prof-label" htmlFor="pf-npw">New password</label>
                    <div className="prof-input-wrap">
                      <input id="pf-npw" className="prof-input prof-input--eye"
                        type={showNew ? "text" : "password"}
                        value={newPw} onChange={e => setNewPw(e.target.value)}
                        placeholder="At least 8 characters" required />
                      <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
                    </div>
                    {newPw.length > 0 && (
                      <div className="prof-pw-strength" data-s={strength}>
                        <div className="prof-pw-seg" /><div className="prof-pw-seg" /><div className="prof-pw-seg" />
                        <span className="prof-pw-label">{STRENGTH_LABEL[strength]}</span>
                      </div>
                    )}
                  </div>
                  <div className="prof-field">
                    <label className="prof-label" htmlFor="pf-cpw">Confirm password</label>
                    <div className="prof-input-wrap">
                      <input id="pf-cpw" className="prof-input prof-input--eye"
                        type={showConf ? "text" : "password"}
                        value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Re-enter new password" required />
                      <EyeToggle show={showConf} onToggle={() => setShowConf(v => !v)} />
                    </div>
                    {confirmPw.length > 0 && newPw !== confirmPw && (
                      <p className="prof-field-hint prof-field-hint--err">Passwords do not match</p>
                    )}
                    {confirmPw.length > 0 && newPw === confirmPw && (
                      <p className="prof-field-hint prof-field-hint--ok">Passwords match</p>
                    )}
                  </div>
                </div>

                <div className="prof-form-footer">
                  <button type="submit" className="prof-btn prof-btn--dark" disabled={pwStatus === "saving"}>
                    {pwStatus === "saving" ? (
                      <><span className="prof-spinner" /> Updating…</>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Update password
                      </>
                    )}
                  </button>
                  <StatusMsg status={pwStatus} msg={pwErr} />
                </div>
              </form>
            ) : (
              <div className="prof-sso-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Managed via Single Sign-On</span>
                <span className="prof-sso-dots">••••••••••</span>
              </div>
            )}
          </div>

        </div>

        {/* ── Right column: identity + 2FA + support ── */}
        <div className="prof-col-side">

          {/* Identity card */}
          <div className="prof-card">
            <div className="prof-card-head">
              <div className="prof-eyebrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Locked identity
              </div>
              <h2 className="prof-card-title">Verified details</h2>
              <p className="prof-card-desc">These fields are locked and verified by our compliance team.</p>
            </div>

            <div className="prof-id-list">
              {/* Email */}
              <div className="prof-id-item">
                <div className="prof-id-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="prof-id-body">
                  <div className="prof-id-label">Email address</div>
                  <div className="prof-id-value">{user.email ?? "—"}</div>
                </div>
                <div className="prof-id-lock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>

              {/* PAN */}
              <div className="prof-id-item">
                <div className="prof-id-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </div>
                <div className="prof-id-body">
                  <div className="prof-id-label">PAN identification</div>
                  <div className="prof-id-value prof-id-value--mono">
                    {profile.pan ? maskPAN(profile.pan) : "Not on record"}
                  </div>
                </div>
                <div className="prof-id-lock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>

              {/* Role */}
              <div className="prof-id-item prof-id-item--last">
                <div className="prof-id-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  </svg>
                </div>
                <div className="prof-id-body">
                  <div className="prof-id-label">Account role</div>
                  <div className="prof-id-value">
                    <span className="prof-role-pill">{getRoleLabel(profile.role)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2FA card */}
          <div className="prof-card prof-card--2fa">
            <div className="prof-2fa-head">
              <div className="prof-2fa-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div className="prof-2fa-title">Two-Factor Auth</div>
                <span className="prof-2fa-badge">Coming soon</span>
              </div>
            </div>
            <p className="prof-2fa-desc">
              Add an extra layer of protection with a mobile authenticator app.
            </p>
            <button className="prof-btn prof-btn--ghost" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Enable 2FA
            </button>
          </div>

          {/* Support callout */}
          <div className="prof-callout">
            <div className="prof-callout-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="prof-callout-body">
              <div className="prof-callout-title">Need to change locked details?</div>
              <p className="prof-callout-desc">
                To update your registered email or PAN, contact our compliance desk at{" "}
                <a href="mailto:support@thetaxpert.com" className="prof-callout-link">
                  support@thetaxpert.com
                </a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
