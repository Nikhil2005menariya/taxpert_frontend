import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

const IDLE_TIMEOUT_MS  = 25 * 60 * 1000; // 25 minutes
const WARN_BEFORE_MS   = 5  * 60 * 1000; // warn 5 minutes before
const WARN_AT_MS       = IDLE_TIMEOUT_MS - WARN_BEFORE_MS; // 20 minutes
const STORAGE_KEY      = "tt_session_logout";
const ACTIVITY_EVENTS  = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"] as const;

export default function IdleSessionGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARN_BEFORE_MS / 1000);

  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivity = useRef<number>(Date.now());

  const { logout } = useAuth();

  const doLogout = useCallback(async () => {
    // Broadcast to other tabs
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    await logout();
    window.location.href = "/login?reason=idle";
  }, [logout]);

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();

    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);
    setCountdown(WARN_BEFORE_MS / 1000);

    // Schedule warning
    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARN_BEFORE_MS / 1000);

      // Start countdown ticker
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARN_AT_MS);

    // Schedule hard logout
    idleTimer.current = setTimeout(() => {
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  // Activity listeners
  useEffect(() => {
    const handler = () => resetTimers();
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    resetTimers(); // start on mount

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers]);

  // Multi-tab logout sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        // Another tab logged out — follow immediately
        window.location.href = "/login?reason=idle";
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!showWarning) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = mins > 0
    ? `${mins}m ${String(secs).padStart(2, "0")}s`
    : `${countdown}s`;

  return (
    <div className="idle-overlay" role="alertdialog" aria-modal="true" aria-label="Session expiring soon">
      <div className="idle-modal">
        <div className="idle-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
        </div>
        <h2 className="idle-title">Session expiring soon</h2>
        <p className="idle-body">
          You&apos;ve been inactive for a while. For security, your session will end in{" "}
          <strong className="idle-countdown">{timeStr}</strong>.
        </p>
        <div className="idle-actions">
          <button
            className="btn btn-primary"
            onClick={resetTimers}
            autoFocus
          >
            Stay signed in
          </button>
          <button
            className="btn btn-secondary"
            onClick={doLogout}
          >
            Sign out now
          </button>
        </div>
      </div>

      <style>{`
        .idle-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: idle-fade-in 0.2s ease;
        }
        @keyframes idle-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .idle-modal {
          background: #fff;
          border-radius: 1.25rem;
          padding: 2rem 2rem 1.75rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(15,23,42,0.18);
          text-align: center;
          animation: idle-slide-up 0.25s ease;
        }
        @keyframes idle-slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .idle-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #fff7ed;
          color: #c2410c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.1rem;
          border: 1.5px solid #fed7aa;
        }
        .idle-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
        }
        .idle-body {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }
        .idle-countdown {
          color: #dc2626;
          font-variant-numeric: tabular-nums;
        }
        .idle-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .idle-actions .btn {
          width: 100%;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
