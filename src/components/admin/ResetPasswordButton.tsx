import { useState } from "react";
import { apiClient } from "../../api/client";

interface Props {
  userId: string;
  userName: string;
}

export default function ResetPasswordButton({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; msg: string } | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setShow(false);
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2.5 12a9.5 9.5 0 0 1 16-7l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.5 12a9.5 9.5 0 0 1-16 7L3 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 2v5h-5M3 22v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Reset
      </button>

      {open && (
        <div className="rpw-backdrop" onClick={close}>
          <div className="rpw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rpw-modal-header">
              <div>
                <p className="rpw-eyebrow">— Security</p>
                <h3 className="rpw-modal-title">Reset Password</h3>
                <p className="rpw-modal-sub">Set a new password for <strong>{userName}</strong></p>
              </div>
              <button className="rpw-x" onClick={close} type="button" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {result?.ok ? (
              <div className="rpw-success">
                <span className="rpw-success-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p>{result.msg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rpw-form">
                <div className="rpw-field">
                  <label className="rpw-label">New Password</label>
                  <div className="rpw-input-wrap">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="rpw-input"
                      autoFocus
                      minLength={8}
                      required
                    />
                    <button type="button" className="rpw-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>
                      {show ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {result && (
                  <p className="rpw-err-msg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    {result.msg}
                  </p>
                )}
                <div className="rpw-modal-actions">
                  <button type="button" onClick={close} className="rpw-btn rpw-btn--ghost">Cancel</button>
                  <button type="submit" disabled={loading} className="rpw-btn rpw-btn--primary">
                    {loading ? <><span className="rpw-spin" /> Updating…</> : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .rpw-trigger {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--lp-sans); font-size: 0.76rem; font-weight: 600;
          color: var(--lp-ink-muted); background: var(--lp-surface);
          border: 1px solid var(--lp-hairline); border-radius: var(--lp-pill);
          padding: 0.3rem 0.7rem; cursor: pointer; white-space: nowrap;
          transition: color .15s, border-color .15s, background .15s, transform .12s var(--lp-ease);
        }
        .rpw-trigger:hover { color: var(--lp-accent); border-color: rgba(232,82,32,0.4); background: var(--lp-accent-soft); transform: translateY(-1px); }

        .rpw-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(22,20,15,0.55); backdrop-filter: blur(3px);
          display: grid; place-items: center; padding: 1.25rem;
          animation: rpw-fade .18s ease;
        }
        @keyframes rpw-fade { from { opacity: 0; } to { opacity: 1; } }
        .rpw-modal {
          width: 100%; max-width: 420px; background: var(--lp-surface);
          border: 1px solid var(--lp-hairline); border-radius: var(--lp-r-xl);
          box-shadow: var(--lp-shadow-lg); padding: 1.5rem; position: relative;
          animation: rpw-rise .24s var(--lp-ease);
        }
        @keyframes rpw-rise { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
        .rpw-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
        .rpw-eyebrow { font-family: var(--lp-mono); font-size: 0.64rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--lp-accent); margin: 0 0 0.3rem; }
        .rpw-modal-title { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.02em; color: var(--lp-ink); margin: 0 0 0.25rem; }
        .rpw-modal-sub { font-size: 0.82rem; color: var(--lp-ink-subtle); margin: 0; }
        .rpw-modal-sub strong { color: var(--lp-ink); font-weight: 600; }
        .rpw-x {
          display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid var(--lp-hairline); background: var(--lp-surface); border-radius: 50%;
          color: var(--lp-ink-subtle); cursor: pointer; transition: color .15s, background .15s, border-color .15s;
        }
        .rpw-x:hover { color: var(--lp-ink); background: var(--lp-surface-2); }

        .rpw-form { display: flex; flex-direction: column; gap: 1rem; }
        .rpw-field { display: flex; flex-direction: column; gap: 6px; }
        .rpw-label { font-family: var(--lp-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--lp-ink-subtle); }
        .rpw-input-wrap { position: relative; display: flex; align-items: center; }
        .rpw-input {
          width: 100%; height: 46px; padding: 0 44px 0 14px;
          background: var(--lp-canvas); border: 1px solid var(--lp-hairline); border-radius: var(--lp-r-sm);
          font-family: var(--lp-sans); font-size: 14px; color: var(--lp-ink); outline: none;
          transition: border-color .18s, background .18s, box-shadow .18s;
        }
        .rpw-input::placeholder { color: var(--lp-ink-faint); }
        .rpw-input:focus { border-color: var(--lp-ink-muted); background: var(--lp-surface); box-shadow: 0 0 0 4px rgba(232,82,32,0.07); }
        .rpw-eye {
          position: absolute; right: 10px; display: grid; place-items: center;
          width: 30px; height: 30px; background: none; border: none; cursor: pointer;
          color: var(--lp-ink-faint); border-radius: 6px; transition: color .15s, background .15s;
        }
        .rpw-eye:hover { color: var(--lp-ink-muted); background: var(--lp-surface-2); }
        .rpw-err-msg { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #c43d33; margin: 0; }

        .rpw-modal-actions { display: flex; gap: 10px; margin-top: 0.25rem; }
        .rpw-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          height: 44px; padding: 0 18px; border-radius: var(--lp-r-sm);
          font-family: var(--lp-sans); font-size: 0.86rem; font-weight: 600; cursor: pointer;
          transition: box-shadow .18s, transform .18s var(--lp-ease), background .15s, color .15s, opacity .15s;
        }
        .rpw-btn--primary { flex: 1; border: 0; background: var(--lp-accent); color: #fff; box-shadow: 0 2px 8px rgba(232,82,32,0.28); }
        .rpw-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(232,82,32,0.4); }
        .rpw-btn--primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .rpw-btn--ghost { background: transparent; border: 1px solid var(--lp-hairline); color: var(--lp-ink-muted); }
        .rpw-btn--ghost:hover { background: var(--lp-surface-2); color: var(--lp-ink); }
        .rpw-spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: prof-spin 0.7s linear infinite; }

        .rpw-success { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; text-align: center; padding: 1.5rem 0.5rem 0.75rem; }
        .rpw-success-icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: var(--lp-green-soft); color: var(--lp-green); }
        .rpw-success p { font-size: 0.9rem; color: var(--lp-ink); margin: 0; font-weight: 500; }
      `}</style>
    </>
  );
}
