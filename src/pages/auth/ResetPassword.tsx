import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../api/client";
import AuthLayout from "../../components/auth/AuthLayout";
import { PasswordField, ButtonSpinner } from "../../components/auth/fields";

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
    <>
      <Helmet>
        <title>Reset password | TheTaxpert</title>
      </Helmet>
      <AuthLayout>
        <div className="lp-auth-card">
          <header className="lp-auth-head">
            <h1 className="lp-auth-title">Set a new password</h1>
            <p className="lp-auth-subtitle">Choose a strong password to secure your account.</p>
          </header>

          {success ? (
            <div className="lp-auth-banner lp-auth-banner--success">
              Password updated — redirecting to your dashboard…
            </div>
          ) : !ready ? (
            <div className="lp-auth-banner lp-auth-banner--error">
              This reset link is invalid or has expired. Request a new one from the{" "}
              <Link to="/login">sign in page</Link>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="lp-auth-form">
              <PasswordField
                label="New password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordField
                label="Confirm password"
                placeholder="Repeat password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {error && <div className="lp-auth-banner lp-auth-banner--error">{error}</div>}
              <button type="submit" className="lp-btn lp-btn--primary lp-auth-submit" disabled={loading}>
                {loading ? <><ButtonSpinner /> Updating…</> : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
