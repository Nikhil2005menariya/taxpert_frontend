"use client";

import { useState } from "react";

const SERVICES = [
  "Income Tax Filing (ITR)",
  "GST Registration",
  "GST Filing (GSTR-1 / GSTR-3B)",
  "Company / LLP Incorporation",
  "ROC Compliance",
  "TDS Compliance",
  "Accounting & Bookkeeping",
  "MSME / Startup Registration",
  "Trade Mark Registration",
  "Other",
];

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Simulate submission — wire to your preferred email/CRM later
      await new Promise((r) => setTimeout(r, 950));
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-success">
        <span className="contact-success-icon">✓</span>
        <h3>Message sent!</h3>
        <p>
          Thanks for reaching out. Our team will get back to you within
          1 business day.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="cf-name">Full Name</label>
          <input
            id="cf-name"
            className="form-input"
            name="name"
            placeholder="Rajesh Kumar"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-phone">Phone</label>
          <input
            id="cf-phone"
            className="form-input"
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          className="form-input"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cf-service">Service Needed</label>
        <select id="cf-service" className="form-input" name="service">
          <option value="">Select a service (optional)…</option>
          {SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cf-message">Message</label>
        <textarea
          id="cf-message"
          className="form-input"
          name="message"
          rows={4}
          placeholder="Tell us about your compliance needs…"
          required
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: "100%", marginTop: "0.25rem" }}
      >
        {loading ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
