import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type Tab = "login" | "signup";

export default function AuthTabs({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="lp-auth-card">
      <header className="lp-auth-head">
        <h1 className="lp-auth-title">
          {tab === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="lp-auth-subtitle">
          {tab === "login"
            ? "Sign in to manage your filings and compliance."
            : "Start handling GST, ITR, ROC and more in one place."}
        </p>
      </header>

      <div className="lp-auth-tabs" data-tab={tab}>
        <span className="lp-auth-tabs-glider" aria-hidden="true" />
        <button
          className={`lp-auth-tab${tab === "login" ? " is-active" : ""}`}
          onClick={() => setTab("login")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`lp-auth-tab${tab === "signup" ? " is-active" : ""}`}
          onClick={() => setTab("signup")}
          type="button"
        >
          Create account
        </button>
      </div>

      <div className="lp-auth-tab-content" key={tab}>
        {tab === "login" ? <LoginForm /> : <SignupForm />}
      </div>
    </div>
  );
}
