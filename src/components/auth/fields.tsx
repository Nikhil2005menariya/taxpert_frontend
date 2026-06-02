import { forwardRef, useRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

// ── Icons ─────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.47M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 5.4-1.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);

// ── Shared field props ────────────────────────────────────────

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
}

/** Premium text/email/tel input with focus ring + error state. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(
  function TextField({ label, error, hint, action, className, ...rest }, ref) {
    return (
      <div className="lp-af">
        <div className="lp-af-top">
          <label className="lp-af-label">
            {label}
            {hint && <span className="lp-af-hint">{hint}</span>}
          </label>
          {action}
        </div>
        <div className={`lp-af-box${error ? " is-error" : ""}`}>
          <input ref={ref} className={`lp-af-input${className ? " " + className : ""}`} {...rest} />
        </div>
        {error && <span className="lp-af-error">{error}</span>}
      </div>
    );
  },
);

/** Password input with a show/hide eye toggle. */
export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(
  function PasswordField({ label, error, action, className, ...rest }, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="lp-af">
        <div className="lp-af-top">
          <label className="lp-af-label">{label}</label>
          {action}
        </div>
        <div className={`lp-af-box${error ? " is-error" : ""}`}>
          <input
            ref={ref}
            type={show ? "text" : "password"}
            className={`lp-af-input lp-af-input--pwd${className ? " " + className : ""}`}
            {...rest}
          />
          <button
            type="button"
            className="lp-af-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {error && <span className="lp-af-error">{error}</span>}
      </div>
    );
  },
);

/** Inline spinner for buttons in a loading state. */
export const ButtonSpinner = () => <span className="lp-auth-spin" aria-hidden="true" />;

// ── 6-cell OTP input ──────────────────────────────────────────

interface OtpProps {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  hasError?: boolean;
}

const CELLS = 6;

/** Segmented 6-digit code input with auto-advance, backspace + paste. */
export function OtpInput({ value, onChange, autoFocus, hasError }: OtpProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (!v) return;
    const next = (value.slice(0, i) + v).replace(/\D/g, "").slice(0, CELLS);
    onChange(next);
    const focusIdx = Math.min(i + v.length, CELLS - 1);
    refs.current[focusIdx]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CELLS - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CELLS);
    if (!txt) return;
    onChange(txt);
    refs.current[Math.min(txt.length, CELLS - 1)]?.focus();
  }

  return (
    <div className="lp-otp" onPaste={handlePaste}>
      {Array.from({ length: CELLS }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`lp-otp-cell${hasError ? " is-error" : ""}${value[i] ? " is-filled" : ""}`}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoFocus={autoFocus && i === 0}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
