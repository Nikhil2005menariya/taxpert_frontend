import { useState } from "react";
import { apiClient } from "../../api/client";

interface Props {
  initialFirstName: string;
  initialLastName: string;
  initialMobile: string;
  email: string;
  pan: string;
  roleLabel: string;
}

function maskPAN(pan: string) {
  if (pan.length !== 10) return pan;
  return pan.slice(0, 5) + "****" + pan.slice(9);
}

export default function ProfileForm({
  initialFirstName,
  initialLastName,
  initialMobile,
  email,
  pan,
  roleLabel,
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName]   = useState(initialLastName);
  const [mobile, setMobile]       = useState(initialMobile);
  const [status, setStatus]       = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    try {
      await apiClient.patch("/auth/profile", {
        first_name: firstName,
        last_name: lastName,
        mobile,
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.response?.data?.message || "Failed to update profile");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="prof-section-title">Account Details</div>

      <div className="prof-input-group">
        <label className="prof-input-label" htmlFor="prof-first-name">First Name</label>
        <input
          id="prof-first-name"
          className="prof-input"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          autoComplete="given-name"
          required
        />
      </div>
      <div className="prof-input-group">
        <label className="prof-input-label" htmlFor="prof-last-name">Last Name</label>
        <input
          id="prof-last-name"
          className="prof-input"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          autoComplete="family-name"
          required
        />
      </div>
      <div className="prof-input-group">
        <label className="prof-input-label" htmlFor="prof-mobile">Mobile</label>
        <input
          id="prof-mobile"
          className="prof-input"
          value={mobile}
          onChange={e => setMobile(e.target.value)}
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
        />
      </div>

      <div className="prof-row">
        <span className="prof-label">Email</span>
        <span className="prof-value">{email}</span>
      </div>
      <div className="prof-row">
        <span className="prof-label">PAN</span>
        <span className="prof-value prof-mono">{maskPAN(pan)}</span>
      </div>
      <div className="prof-row" style={{ borderBottom: "none" }}>
        <span className="prof-label">Role</span>
        <span className="prof-value">{roleLabel}</span>
      </div>

      <div className="prof-form-footer">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === "saving"}
          style={{ fontSize: "0.875rem", padding: "8px 20px" }}
        >
          {status === "saving" ? "Saving…" : "Save Changes"}
        </button>
        {status === "saved" && (
          <span className="prof-success-msg">Changes saved successfully.</span>
        )}
        {status === "error" && errorMsg && (
          <span className="prof-error-msg">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}
