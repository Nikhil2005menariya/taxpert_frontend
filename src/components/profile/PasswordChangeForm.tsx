import { useState } from "react";
import { apiClient } from "../../api/client";

export default function PasswordChangeForm() {
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [status, setStatus]       = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setStatus("error");
      setErrorMsg("Password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setStatus("error");
      setErrorMsg("Passwords do not match");
      return;
    }
    setStatus("saving");
    setErrorMsg(null);
    try {
      await apiClient.patch("/auth/password", { password: newPw });
      setStatus("saved");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.response?.data?.message || "Failed to change password");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="prof-input-group">
        <label className="prof-input-label" htmlFor="prof-new-pw">New Password</label>
        <input
          id="prof-new-pw"
          type="password"
          className="prof-input"
          value={newPw}
          onChange={e => setNewPw(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
        />
      </div>
      <div className="prof-input-group">
        <label className="prof-input-label" htmlFor="prof-confirm-pw">Confirm Password</label>
        <input
          id="prof-confirm-pw"
          type="password"
          className="prof-input"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="prof-form-footer">
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={status === "saving"}
          style={{ fontSize: "0.875rem", padding: "8px 20px" }}
        >
          {status === "saving" ? "Saving…" : "Change Password"}
        </button>
        {status === "saved" && <span className="prof-success-msg">Password updated.</span>}
        {status === "error" && errorMsg && <span className="prof-error-msg">{errorMsg}</span>}
      </div>
    </form>
  );
}
