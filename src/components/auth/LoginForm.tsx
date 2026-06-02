import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginSchema } from "../../shared/validations";
import { apiClient, supabase } from "../../api/client";
import type { z } from "zod";
import { TextField, PasswordField, ButtonSpinner } from "./fields";

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="lp-auth-form">
      {searchParams.get("verified") === "1" && (
        <div className="lp-auth-banner lp-auth-banner--success">
          Your account is verified — please sign in.
        </div>
      )}

      <TextField
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <PasswordField
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password?.message}
        action={
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="lp-auth-link-btn"
          >
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
        }
        {...register("password")}
      />

      {serverError && <div className="lp-auth-banner lp-auth-banner--error">{serverError}</div>}
      {resetSent && (
        <div className="lp-auth-banner lp-auth-banner--success">
          Password reset email sent — check your inbox.
        </div>
      )}

      <button type="submit" className="lp-btn lp-btn--primary lp-auth-submit" disabled={loading}>
        {loading ? <><ButtonSpinner /> Signing in…</> : "Sign in"}
      </button>
    </form>
  );
}
