"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function ConsultationButton() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // ESC key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setSent(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Simulate submission — wire to your preferred email/CRM later
    await new Promise((r) => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  }

  return (
    <>
      <button className="consult-trigger" onClick={() => setOpen(true)}>
        Book Free Consultation
      </button>

      {open && (
        <div className="consult-backdrop" onClick={() => setOpen(false)}>
          <div className="consult-modal" onClick={(e) => e.stopPropagation()}>
            <button className="consult-close" onClick={() => { setOpen(false); setSent(false); }}>
              ✕
            </button>

            {sent ? (
              <div className="consult-success">
                <span className="consult-success-icon">✓</span>
                <h3>Request received!</h3>
                <p>
                  Our team will reach out within 1 business day to schedule
                  your free consultation.
                </p>
                <Link to="/contact" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Go to Contact Page
                </Link>
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
                    <select className="form-input" name="service" required>
                      <option value="">Select a service…</option>
                      <option>Income Tax Filing</option>
                      <option>GST Registration / Filing</option>
                      <option>Company / LLP Registration</option>
                      <option>ROC Compliance</option>
                      <option>TDS Compliance</option>
                      <option>Accounting & Bookkeeping</option>
                      <option>Other</option>
                    </select>
                  </div>
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
