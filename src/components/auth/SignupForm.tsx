import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "../../shared/validations";
import { apiClient, supabase } from "../../api/client";
import type { z } from "zod";

type SignupInput = z.infer<typeof signupSchema>;

const REF_STORAGE_KEY = "txp_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

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

export default function SignupForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      const payload: Record<string, string> = { ...values };
      if (referralCode) payload.referral_code_used = referralCode;

      const res = await apiClient.post("/auth/signup", payload);
      const { session, message } = res.data;

      if (session) {
        clearRef();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (sessionError) {
          setServerError(sessionError.message);
          setLoading(false);
          return;
        }
        const next = searchParams.get("next") || "/dashboard";
        navigate(next, { replace: true });
      } else {
        clearRef();
        setSuccessMessage(message ?? "Account created. Please confirm your email.");
        setLoading(false);
      }
    } catch (err: any) {
      if (!err.response) {
        setServerError("Cannot reach server. Make sure the backend is running on port 4000.");
      } else {
        setServerError(err.response.data?.error ?? "Sign up failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-form-fields">

        {referralCode && (
          <div className="auth-referral-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/>
              <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            Referral code <strong>{referralCode}</strong> applied — you'll get ₹500 off your first service!
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
        {successMessage && <div className="auth-success-banner">{successMessage}</div>}

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

      </div>
    </form>
  );
}
