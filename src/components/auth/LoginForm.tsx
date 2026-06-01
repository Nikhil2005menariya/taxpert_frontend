import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginSchema } from "../../shared/validations";
import { apiClient, supabase } from "../../api/client";
import type { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    setServerError(null);
    try {
      const res = await apiClient.post("/auth/login", values);
      const { session } = res.data;
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
    } catch (err: any) {
      if (!err.response) {
        setServerError("Cannot reach server. Make sure the backend is running on port 4000.");
      } else {
        setServerError(err.response.data?.error ?? "Sign in failed. Please try again.");
      }
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const email = getValues("email");
    if (!email) {
      setServerError("Enter your email above first");
      return;
    }
    setResetLoading(true);
    setServerError(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResetSent(true);
    setResetLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-form-fields">

        {searchParams.get("verified") === "1" && (
          <div className="auth-success-banner">
            Your account is verified. Please sign in.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            {...register("email")}
            type="email"
            className="form-input"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <span className="error-text">{errors.email.message}</span>}
        </div>

        <div className="form-group">
          <div className="auth-label-row">
            <label className="form-label">Password</label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="auth-forgot-btn"
            >
              {resetLoading ? "Sending…" : "Forgot password?"}
            </button>
          </div>
          <input
            {...register("password")}
            type="password"
            className="form-input"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {errors.password && <span className="error-text">{errors.password.message}</span>}
        </div>

        {serverError && <div className="auth-error-banner">{serverError}</div>}
        {resetSent && (
          <div className="auth-success-banner">
            Password reset email sent — check your inbox.
          </div>
        )}

        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

      </div>
    </form>
  );
}
