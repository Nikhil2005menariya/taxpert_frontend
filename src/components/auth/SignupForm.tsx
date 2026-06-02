import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "../../shared/validations";
import { apiClient, supabase } from "../../api/client";
import type { z } from "zod";
import { TextField, PasswordField, ButtonSpinner, OtpInput } from "./fields";

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
      <form onSubmit={verifyOtp} noValidate className="lp-auth-form">
        <div className="lp-auth-otp-head">
          <span className="lp-auth-otp-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" />
            </svg>
          </span>
          <h2 className="lp-auth-otp-title">Verify your email</h2>
          <p className="lp-auth-otp-sub">
            We sent a 6-digit code to<br />
            <strong>{pendingEmail}</strong>
          </p>
        </div>

        <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError(null); }} autoFocus hasError={!!otpError} />
        {otpError && <div className="lp-auth-banner lp-auth-banner--error">{otpError}</div>}

        <button type="submit" className="lp-btn lp-btn--primary lp-auth-submit" disabled={otpLoading || otp.length !== 6}>
          {otpLoading ? <><ButtonSpinner /> Verifying…</> : "Verify & create account"}
        </button>

        <div className="lp-auth-otp-resend">
          {resendCooldown > 0 ? (
            <span>Resend code in {resendCooldown}s</span>
          ) : (
            <button type="button" onClick={resendOtp} className="lp-auth-link-btn">Resend code</button>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setStep("form"); setOtp(""); setOtpError(null); }}
          className="lp-auth-otp-back"
        >
          ← Use a different email
        </button>
      </form>
    );
  }

  // ── Step 1: signup form ─────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="lp-auth-form">
      {referralCode && (
        <div className="lp-auth-ref">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Referred by <strong>{referralCode}</strong> — your referrer earns a reward when you pay for a service.</span>
          <button type="button" className="lp-auth-ref-x" onClick={() => { setReferralCode(""); clearRef(); }} aria-label="Remove referral code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      )}

      <div className="lp-auth-row">
        <TextField label="First name" placeholder="Rajesh" error={errors.first_name?.message} {...register("first_name")} />
        <TextField label="Last name" placeholder="Kumar" error={errors.last_name?.message} {...register("last_name")} />
      </div>

      <TextField label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />

      <TextField label="Mobile number" type="tel" placeholder="9876543210" error={errors.mobile?.message} {...register("mobile")} />

      <TextField label="PAN" placeholder="ABCDE1234F" className="lp-af-upper" error={errors.pan?.message} {...register("pan")} />

      <PasswordField label="Password" placeholder="Min. 8 characters" autoComplete="new-password" error={errors.password?.message} {...register("password")} />

      {!referralCode && (
        <TextField
          label="Referral code"
          hint="(optional)"
          placeholder="TAXPERT-XXXXXX"
          className="lp-af-mono"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
        />
      )}

      {serverError && <div className="lp-auth-banner lp-auth-banner--error">{serverError}</div>}

      <button type="submit" className="lp-btn lp-btn--primary lp-auth-submit" disabled={loading}>
        {loading ? <><ButtonSpinner /> Sending code…</> : "Continue"}
      </button>

      <p className="lp-auth-fineprint">
        By continuing you agree to our <a href="/terms">Terms</a> & <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  );
}
