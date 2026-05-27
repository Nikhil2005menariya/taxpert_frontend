import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/client";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-brand-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ink-900)"/>
              <path d="M8 11h16M16 11v13" stroke="var(--gold-400)" strokeWidth="1.75" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="2.5" stroke="var(--paper)" strokeWidth="1.5"/>
            </svg>
            <span className="auth-brand-name">TheTaxpert</span>
          </div>
          <p className="auth-brand-sub">Set your new password</p>
        </div>

        {success ? (
          <div className="auth-success-banner">
            Password updated! Redirecting to dashboard…
          </div>
        ) : !ready ? (
          <div className="auth-error-banner">
            Invalid or expired reset link. Please request a new one from the{" "}
            <a href="/login" style={{ color: "inherit", textDecoration: "underline" }}>sign in page</a>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-fields">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error && <div className="auth-error-banner">{error}</div>}
              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? "Updating…" : "Set New Password"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
