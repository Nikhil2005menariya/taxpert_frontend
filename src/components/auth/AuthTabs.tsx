import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type Tab = "login" | "signup";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ink-900)"/>
      <path d="M8 11h16M16 11v13" stroke="var(--gold-400)" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="24" cy="22" r="2.5" stroke="var(--paper)" strokeWidth="1.5"/>
    </svg>
  );
}

export default function AuthTabs({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Logo />
            <span className="auth-brand-name">TheTaxpert</span>
          </div>
          <p className="auth-brand-sub">
            Smart tax filing and compliance — handled by Taxperts.
          </p>
        </div>

        <div className="auth-tab-bar">
          <button
            className={`auth-tab-btn${tab === "login" ? " auth-tab-active" : ""}`}
            onClick={() => setTab("login")}
          >
            Sign in
          </button>
          <button
            className={`auth-tab-btn${tab === "signup" ? " auth-tab-active" : ""}`}
            onClick={() => setTab("signup")}
          >
            Create account
          </button>
        </div>

        <div className="auth-tab-content">
          {tab === "login" && <LoginForm />}
          {tab === "signup" && <SignupForm />}
        </div>

      </div>
    </div>
  );
}
