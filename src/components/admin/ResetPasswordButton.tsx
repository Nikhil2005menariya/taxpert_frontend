import { useState } from "react";
import { apiClient } from "../../api/client";

interface Props {
  userId: string;
  userName: string;
}

export default function ResetPasswordButton({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; msg: string } | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
        await apiClient.patch("/admin/users/password", { userId, password });
        setResult({ ok: true, msg: "Password updated successfully." });
        setPassword("");
        setTimeout(close, 1800);
    } catch (err: any) {
        setResult({ msg: err.response?.data?.error || "Failed to update password." });
    } finally {
        setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rpw-trigger" type="button">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9.5 9.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Reset
      </button>

      {open && (
        <div className="rpw-backdrop" onClick={close}>
          <div className="rpw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rpw-modal-header">
              <div>
                <h3 className="rpw-modal-title">Reset Password</h3>
                <p className="rpw-modal-sub">Set a new password for <strong>{userName}</strong></p>
              </div>
              <button className="rpw-x" onClick={close} type="button">✕</button>
            </div>

            {result?.ok ? (
              <div className="rpw-success">
                <span className="rpw-success-icon">✓</span>
                <p>{result.msg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rpw-form">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="form-input"
                    autoFocus
                    minLength={8}
                    required
                  />
                </div>
                {result && <p className="rpw-err-msg">{result.msg}</p>}
                <div className="rpw-modal-actions">
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                    {loading ? "Updating…" : "Update Password"}
                  </button>
                  <button type="button" onClick={close} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
