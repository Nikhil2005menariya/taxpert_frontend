import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import ProfileForm from "../../components/profile/ProfileForm";
import PasswordChangeForm from "../../components/profile/PasswordChangeForm";

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
  const { user, profile } = useAuth();

  if (!user || !profile) return null;

  const isClient = profile.role === "client";
  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  const actualFirstName = profile.first_name || user.user_metadata?.first_name || "";
  const actualLastName = profile.last_name || user.user_metadata?.last_name || "";

  return (
    <div className="prof-shell">
      <h1 className="db-page-title">My Profile</h1>
      <p className="db-page-sub">Your account details and identity information.</p>

      {/* Avatar + name card */}
      <div className="prof-hero">
        <div className="prof-avatar">
          {(actualFirstName[0] ?? "?").toUpperCase()}
          {(actualLastName[0] ?? "").toUpperCase()}
        </div>
        <div className="prof-hero-info">
          <div className="prof-full-name">{actualFirstName} {actualLastName}</div>
          <div className="prof-role-badge">{getRoleLabel(profile.role)}</div>
          <div className="prof-joined">Member since {joinedDate}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="prof-card">
        {isClient ? (
          <ProfileForm
            initialFirstName={actualFirstName}
            initialLastName={actualLastName}
            initialMobile={profile.mobile ?? ""}
            email={user.email ?? ""}
            pan={profile.pan ?? ""}
            roleLabel={getRoleLabel(profile.role)}
          />
        ) : (
          <>
            <div className="prof-section-title">Account Details</div>
            <div className="prof-row">
              <span className="prof-label">Full Name</span>
              <span className="prof-value">{actualFirstName} {actualLastName}</span>
            </div>
            <div className="prof-row">
              <span className="prof-label">Email</span>
              <span className="prof-value">{user.email ?? "—"}</span>
            </div>
            <div className="prof-row">
              <span className="prof-label">PAN</span>
              <span className="prof-value prof-mono">{profile.pan ? MaskPAN(profile.pan) : "—"}</span>
            </div>
            <div className="prof-row">
              <span className="prof-label">Role</span>
              <span className="prof-value">{getRoleLabel(profile.role)}</span>
            </div>
          </>
        )}
      </div>

      {/* Security card */}
      <div className="prof-card">
        <div className="prof-section-title">Security</div>
        {isClient ? (
          <PasswordChangeForm />
        ) : (
          <div className="prof-row">
            <span className="prof-label">Password</span>
            <span className="prof-value prof-muted">••••••••••</span>
          </div>
        )}
        <div className="prof-row" style={{ marginTop: isClient ? "1rem" : undefined }}>
          <span className="prof-label">Two-factor</span>
          <span className="prof-value prof-muted">Not configured</span>
        </div>
        <div className="prof-note">
          To update your email or PAN, contact{" "}
          <a href="mailto:support@thetaxpert.com" className="prof-link">support@thetaxpert.com</a>.
        </div>
      </div>

      {/* Quick links for clients */}
      {isClient && (
        <div className="prof-card">
          <div className="prof-section-title">Quick Links</div>
          <div className="prof-quick-links">
            <Link to="/vault" className="prof-quick-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              My Vault
            </Link>
            <Link to="/payments" className="prof-quick-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Payments
            </Link>
            <Link to="/referrals" className="prof-quick-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/>
                <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
              Refer &amp; Earn
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
