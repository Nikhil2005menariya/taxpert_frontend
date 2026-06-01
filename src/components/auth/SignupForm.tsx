import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "../../shared/validations";
import { apiClient, supabase } from "../../api/client";
import type { z } from "zod";

type SignupInput = z.infer<typeof signupSchema>;

const REF_STORAGE_KEY = "txp_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const RESEND_COOLDOWN_SECONDS = 30;

function persistRef(code: string) {
  try { localStorage.setItem(REF_STORAGE_KEY, code); } catch { /* */ }
  try {
    document.cookie = `${REF_STORAGE_KEY}=${encodeURIComponent(code)}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;
  } catch { /* */ }
}

function clearRef() {
  try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* */ }
  try { document.cookie = `${REF_STORAGE_KEY}=; max-age=0; path=/`; } catch { /* */ }
}

type Step = "form" | "otp";

export default function SignupForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("form");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // OTP step state
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Priority: URL param > localStorage > cookie
    const urlRef = searchParams.get("ref")?.toUpperCase().trim() ?? "";
    if (urlRef) { setReferralCode(urlRef); persistRef(urlRef); return; }
    try {
      const stored = localStorage.getItem(REF_STORAGE_KEY) ?? "";
      if (stored) { setReferralCode(stored); return; }
    } catch { /* */ }
    try {
      const cookieVal = document.cookie
        .split("; ")
        .find((r) => r.startsWith(`${REF_STORAGE_KEY}=`))
        ?.split("=")[1];
      if (cookieVal) setReferralCode(decodeURIComponent(cookieVal));
    } catch { /* */ }
  }, [searchParams]);

  // Cleanup cooldown timer on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  // ── Step 1: submit form → send OTP ──────────────────────────
  async function onSubmit(values: SignupInput) {
    setLoading(true);
    setServerError(null);
    try {
      const payload: Record<string, string> = { ...values };
      if (referralCode) payload.referral_code_used = referralCode;

      const res = await apiClient.post("/auth/signup-initiate", payload);
      setPendingEmail(res.data.email ?? values.email);
      setStep("otp");
      setOtp("");
      setOtpError(null);
      startResendCooldown();
    } catch (err: any) {
      if (!err.response) {
        setServerError("Cannot reach server. Make sure the backend is running on port 4000.");
      } else if (err.response.data?.code === "OTP_ALREADY_SENT") {
        // A code is already valid — jump straight to OTP entry
        setPendingEmail(err.response.data?.email ?? values.email);
        setStep("otp");
        setServerError(null);
        startResendCooldown();
      } else {
        setServerError(err.response.data?.error ?? "Sign up failed. Please try again.");
      }
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP → create account + session ───────────
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length !== 6) { setOtpError("Enter the 6-digit code"); return; }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await apiClient.post("/auth/signup-verify-otp", { email: pendingEmail, otp: otp.trim() });
      const { session } = res.data;

      if (session) {
        clearRef();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (sessionError) { setOtpError(sessionError.message); setOtpLoading(false); return; }
        const next = searchParams.get("next") || "/dashboard";
        navigate(next, { replace: true });
      } else {
        // Account created but no session — send to login
        clearRef();
        navigate("/login?verified=1", { replace: true });
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "OTP_EXPIRED" || code === "OTP_MAX_ATTEMPTS") {
        // Must restart — go back to the form
        setOtpError(err.response.data?.error ?? "Code expired. Please start over.");
        setTimeout(() => { setStep("form"); setOtp(""); setOtpError(null); }, 2500);
      } else {
        setOtpError(err.response?.data?.error ?? "Verification failed. Please try again.");
      }
      setOtpLoading(false);
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    setOtpError(null);
    try {
      await apiClient.post("/auth/signup-resend-otp", { email: pendingEmail });
      startResendCooldown();
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "OTP_EXPIRED") {
        setOtpError("Your session expired. Please start over.");
        setTimeout(() => { setStep("form"); setOtp(""); setOtpError(null); }, 2500);
      } else {
        setOtpError(err.response?.data?.error ?? "Could not resend code.");
      }
    }
  }

  // ── OTP entry screen ────────────────────────────────────────
  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} noValidate>
        <div className="auth-form-fields">
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#f9f5ec",
              border: "1.5px solid #c49a3a", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 1rem", color: "#c49a3a",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.4rem" }}>
              Verify your email
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              We sent a 6-digit code to<br /><strong style={{ color: "#0f172a" }}>{pendingEmail}</strong>
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Verification code</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
              placeholder="000000"
              autoFocus
              style={{
                fontSize: "1.5rem", letterSpacing: "0.5em", textAlign: "center",
                fontFamily: "var(--font-mono, monospace)", fontWeight: 700,
              }}
            />
            {otpError && <span className="error-text">{otpError}</span>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={otpLoading || otp.length !== 6}>
            {otpLoading ? "Verifying…" : "Verify & Create Account"}
          </button>

          <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
            {resendCooldown > 0 ? (
              <span>Resend code in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={resendOtp}
                style={{ background: "none", border: "none", padding: 0, color: "var(--gold-600, #b45309)", textDecoration: "underline", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Resend code
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setStep("form"); setOtp(""); setOtpError(null); }}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer", marginTop: "0.25rem" }}
          >
            ← Use a different email
          </button>
        </div>
      </form>
    );
  }

  // ── Step 1: signup form ─────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-form-fields">

        {referralCode && (
          <div className="auth-referral-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Referred by <strong>{referralCode}</strong> — your referrer earns a reward when you pay for a service.
            <button
              type="button"
              className="auth-referral-remove"
              onClick={() => { setReferralCode(""); clearRef(); }}
            >×</button>
          </div>
        )}

        <div className="auth-name-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input {...register("first_name")} className="form-input" placeholder="Rajesh" />
            {errors.first_name && <span className="error-text">{errors.first_name.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input {...register("last_name")} className="form-input" placeholder="Kumar" />
            {errors.last_name && <span className="error-text">{errors.last_name.message}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input {...register("email")} type="email" className="form-input" placeholder="you@example.com" />
          {errors.email && <span className="error-text">{errors.email.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <input {...register("mobile")} type="tel" className="form-input" placeholder="9876543210" />
          {errors.mobile && <span className="error-text">{errors.mobile.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">PAN</label>
          <input
            {...register("pan")}
            className="form-input"
            placeholder="ABCDE1234F"
            style={{ textTransform: "uppercase" }}
          />
          {errors.pan && <span className="error-text">{errors.pan.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            {...register("password")}
            type="password"
            className="form-input"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          {errors.password && <span className="error-text">{errors.password.message}</span>}
        </div>

        {!referralCode && (
          <div className="form-group">
            <label className="form-label">
              Referral code <span className="form-label-optional">(optional)</span>
            </label>
            <input
              className="form-input"
              placeholder="TAXPERT-XXXXXX"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
            />
          </div>
        )}

        {serverError && <div className="auth-error-banner">{serverError}</div>}

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
          {loading ? "Sending code…" : "Continue"}
        </button>

      </div>
    </form>
  );
}
