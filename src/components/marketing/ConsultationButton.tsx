"use client";

import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

export default function ConsultationButton() {
  const [open, setOpen]       = useState(false);
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setSent(false); setErr(""); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiClient.post("/marketing/consultations", {
        name:           fd.get("name"),
        phone:          fd.get("phone"),
        email:          fd.get("email"),
        service_needed: fd.get("service"),
        message:        fd.get("message") || undefined,
      });
      setSent(true);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setSent(false);
    setErr("");
  }

  return (
    <>
      <button className="consult-trigger" onClick={() => setOpen(true)}>
        Book Free Consultation
      </button>

      {open && (
        <div className="consult-backdrop" onClick={handleClose}>
          <div className="consult-modal" onClick={(e) => e.stopPropagation()}>
            <button className="consult-close" onClick={handleClose}>✕</button>

            {sent ? (
              <div className="consult-success">
                <span className="consult-success-icon">✓</span>
                <h3>Request received!</h3>
                <p>Our team will reach out within 1 business day to schedule your free consultation.</p>
              </div>
            ) : (
              <>
                <div className="consult-header">
                  <h2>Book a Free Consultation</h2>
                  <p>Tell us a bit about your needs and we&apos;ll get back to you shortly.</p>
                </div>
                <form onSubmit={handleSubmit} className="consult-form">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" name="name" placeholder="Rajesh Kumar" required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-input" name="phone" type="tel" placeholder="+91 98765 43210" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" name="email" type="email" placeholder="you@company.com" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Needed</label>
                    <select className="form-input" name="service" required defaultValue="">
                      <option value="" disabled>Select a service…</option>
                      <option>Income Tax Filing</option>
                      <option>GST Registration / Filing</option>
                      <option>Company / LLP Registration</option>
                      <option>ROC Compliance</option>
                      <option>TDS Compliance</option>
                      <option>Accounting &amp; Bookkeeping</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                    <textarea className="form-input" name="message" rows={3} placeholder="Any specific questions or context…" style={{ resize: "vertical" }} />
                  </div>
                  {err && <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0 0 0.5rem" }}>{err}</p>}
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Sending…" : "Request Consultation"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
