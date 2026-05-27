import { useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { formatRupees } from "../../shared/finance-utils";

type TabId = "account" | "security";

function MaskPAN(pan: string) {
  if (pan.length !== 10) return pan;
  return pan.slice(0, 5) + "****" + pan.slice(9);
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'ca': return 'Taxpert';
    case 'ops': return 'Operations';
    case 'client': return 'Client';
    default: return 'User';
  }
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("account");

  // Form states for profile details
  const [firstName, setFirstName] = useState(() => profile?.first_name || "");
  const [lastName, setLastName] = useState(() => profile?.last_name || "");
  const [mobile, setMobile] = useState(() => profile?.mobile || "");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Form states for security details
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);

  const isClient = profile?.role === "client";
  const joinedDate = useMemo(() => {
    if (!profile?.created_at) return "";
    return new Date(profile.created_at).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  }, [profile?.created_at]);

  if (!user || !profile) return null;

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setProfileErrorMsg(null);
    try {
      await apiClient.patch("/auth/profile", {
        first_name: firstName,
        last_name: lastName,
        mobile,
      });
      setProfileStatus("saved");
      if (refreshProfile) await refreshProfile();
      setTimeout(() => setProfileStatus("idle"), 3000);
    } catch (error: any) {
      setProfileStatus("error");
      setProfileErrorMsg(error.response?.data?.message || "Failed to update profile");
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setPwStatus("error");
      setPwErrorMsg("Password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus("error");
      setPwErrorMsg("Passwords do not match");
      return;
    }
    setPwStatus("saving");
    setPwErrorMsg(null);
    try {
      await apiClient.patch("/auth/password", { password: newPw });
      setPwStatus("saved");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (error: any) {
      setPwStatus("error");
      setPwErrorMsg(error.response?.data?.message || "Failed to change password");
    }
  }

  return (
    <div className="prof-shell" style={{ maxWidth: "1080px", padding: "1.5rem 1.5rem 4rem" }}>
      
      {/* Premium Unified Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", borderBottom: "1px solid var(--line-soft)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--ink-900), #27272a)",
          color: "#fff",
          fontSize: "1.25rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "2px solid var(--line-soft)"
        }}>
          {(firstName[0] ?? "?").toUpperCase()}
          {(lastName[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink-900)", margin: 0, letterSpacing: "-0.02em" }}>
            {firstName} {lastName}
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--ink-400)", margin: "0.15rem 0 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{getRoleLabel(profile.role)}</span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--ink-300)" }} />
            <span>Member since {joinedDate}</span>
          </p>
        </div>
      </div>

      {/* Main Tabbed Grid Workspace */}
      <div className="profile-dashboard-container" style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "start" }}>
        
        {/* Left Side: Stateful Tab Sidebar */}
        <div className="profile-sidebar-wrap" style={{ flex: "1 0 240px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          
          <button
            onClick={() => setActiveTab("account")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.75rem 1rem",
              background: activeTab === "account" ? "var(--ink-50)" : "transparent",
              color: activeTab === "account" ? "var(--ink-900)" : "var(--ink-500)",
              border: "1px solid",
              borderColor: activeTab === "account" ? "var(--line-soft)" : "transparent",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: activeTab === "account" ? 600 : 500,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Account Settings
          </button>

          <button
            onClick={() => setActiveTab("security")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.75rem 1rem",
              background: activeTab === "security" ? "var(--ink-50)" : "transparent",
              color: activeTab === "security" ? "var(--ink-900)" : "var(--ink-500)",
              border: "1px solid",
              borderColor: activeTab === "security" ? "var(--line-soft)" : "transparent",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: activeTab === "security" ? 600 : 500,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Security &amp; Access
          </button>
        </div>

        {/* Right Side: Active Workspace Card */}
        <div className="profile-content-wrap" style={{ flex: "999 1 500px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "16px", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          
          {/* TAB 1: Account Settings Form */}
          {activeTab === "account" && (
            <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-900)", margin: 0 }}>Account Details</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", margin: "0.25rem 0 0" }}>Update your personal settings and active telephone values.</p>
              </div>

              {/* 2-Column Responsive Form Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label htmlFor="p-first-name" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>First Name</label>
                  <input
                    id="p-first-name"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    className="pm-filter-input"
                    style={{ width: "100%", height: "38px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label htmlFor="p-last-name" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>Last Name</label>
                  <input
                    id="p-last-name"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    className="pm-filter-input"
                    style={{ width: "100%", height: "38px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label htmlFor="p-mobile" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>Mobile Number</label>
                  <input
                    id="p-mobile"
                    type="text"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    maxLength={10}
                    className="pm-filter-input"
                    style={{ width: "100%", height: "38px" }}
                  />
                </div>
                {/* Locked Email Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)", display: "flex", alignItems: "center" }}>
                    <span>Email Address</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={user.email ?? "—"}
                      disabled
                      className="pm-filter-input"
                      style={{ width: "100%", height: "38px", background: "var(--ink-50)", color: "var(--ink-400)", paddingRight: "2.5rem", borderStyle: "dashed", cursor: "not-allowed" }}
                    />
                    <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-300)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure read-only fields */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", paddingTop: "0.5rem" }}>
                {/* Locked PAN Card Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>PAN Identification</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={profile.pan ? MaskPAN(profile.pan) : "—"}
                      disabled
                      className="pm-filter-input"
                      style={{ width: "100%", height: "38px", background: "var(--ink-50)", color: "var(--ink-400)", fontFamily: "var(--font-mono)", paddingRight: "2.5rem", borderStyle: "dashed", cursor: "not-allowed" }}
                    />
                    <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-300)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>Account Role</span>
                  <div style={{ height: "38px", display: "flex", alignItems: "center" }}>
                    <span style={{ background: "rgba(196,154,58,0.08)", border: "1px solid rgba(196,154,58,0.2)", color: "var(--gold-700)", padding: "0.2rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action and feedback states */}
              <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: "1.5rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={profileStatus === "saving"}
                  className="btn btn-primary"
                  style={{ minWidth: "130px", height: "38px", minHeight: "38px" }}
                >
                  {profileStatus === "saving" ? "Saving Changes…" : "Save Changes"}
                </button>
                {profileStatus === "saved" && (
                  <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-600)" }}>✓ Personal profile updated successfully!</span>
                )}
                {profileStatus === "error" && profileErrorMsg && (
                  <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--danger)" }}>✗ {profileErrorMsg}</span>
                )}
              </div>
            </form>
          )}

          {/* TAB 2: Security & Credentials */}
          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* Password change form */}
              {isClient ? (
                <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-900)", margin: 0 }}>Authentication Credentials</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", margin: "0.25rem 0 0" }}>Update your primary password. We recommend choosing a unique secure key.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <label htmlFor="p-new-pw" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>New Password</label>
                      <input
                        id="p-new-pw"
                        type="password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        className="pm-filter-input"
                        style={{ width: "100%", height: "38px" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <label htmlFor="p-confirm-pw" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-500)" }}>Confirm Password</label>
                      <input
                        id="p-confirm-pw"
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        required
                        className="pm-filter-input"
                        style={{ width: "100%", height: "38px" }}
                      />
                    </div>
                  </div>

                  <div style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={pwStatus === "saving"}
                      className="btn btn-secondary"
                      style={{ minWidth: "150px", height: "38px", minHeight: "38px" }}
                    >
                      {pwStatus === "saving" ? "Updating…" : "Update Password"}
                    </button>
                    {pwStatus === "saved" && (
                      <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-600)" }}>✓ Password updated successfully!</span>
                    )}
                    {pwStatus === "error" && pwErrorMsg && (
                      <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--danger)" }}>✗ {pwErrorMsg}</span>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-900)", margin: 0 }}>Authentication Credentials</h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-400)", margin: "0.25rem 0 1rem" }}>Administrative credentials are managed securely via SSO.</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--ink-50)", border: "1px solid var(--line-soft)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>Password</span>
                    <span style={{ fontSize: "0.88rem", color: "var(--ink-400)", letterSpacing: "0.15em" }}>••••••••••</span>
                  </div>
                </div>
              )}

              {/* Two-Factor Authentication Box */}
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-900)", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-600)" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Two-Factor Authentication (2FA)
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "1.25rem 1.5rem", background: "var(--ink-50)", border: "1px solid var(--line-soft)", borderRadius: "12px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink-800)" }}>Status</span>
                      <span style={{ background: "var(--ink-100)", color: "var(--ink-500)", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "999px", textTransform: "uppercase" }}>Inactive</span>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--ink-400)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>Add an extra layer of system security using mobile authenticator credentials.</p>
                  </div>
                  <button disabled className="btn btn-secondary" style={{ fontSize: "0.78rem", height: "34px", minHeight: "34px", padding: "0 0.85rem", opacity: 0.6, cursor: "not-allowed" }}>
                    Configure 2FA
                  </button>
                </div>
              </div>

              {/* Premium Support Disclaimer callout banner */}
              <div style={{ display: "flex", gap: "1rem", padding: "1.1rem 1.25rem", background: "rgba(196,154,58,0.06)", border: "1.5px solid rgba(196,154,58,0.18)", borderRadius: "12px", marginTop: "0.5rem" }}>
                <div style={{ color: "var(--gold-600)", marginTop: "2px", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--ink-800)", margin: 0 }}>Identity Modification Request</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--ink-500)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>
                    To modify your locked identity details (such as your registered email address or PAN information), please email our compliance desk directly at{" "}
                    <a href="mailto:support@thetaxpert.com" className="prof-link" style={{ fontWeight: 600 }}>support@thetaxpert.com</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
