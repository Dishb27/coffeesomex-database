"use client";

import { useState, useEffect } from "react";

export function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Something went wrong. Please try again.",
        );
      }

      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {sent ? (
          <div className="form-success">
            <div className="form-success-icon">✓</div>
            <h3>Message sent</h3>
            <p>Thank you for reaching out. We'll get back to you soon.</p>
          </div>
        ) : (
          <>
            <p className="modal-eyebrow">Get in touch</p>
            <h2>Contact us</h2>
            {/* <p className="modal-sub">
              Questions about a gene record, data licensing, or contributing new
              annotations — send us a note.
            </p> */}

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="cf-name">
                  Name
                </label>
                <input
                  id="cf-name"
                  className="form-input"
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={update("name")}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cf-email">
                  Email
                </label>
                <input
                  id="cf-email"
                  className="form-input"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cf-message">
                  Message
                </label>
                <textarea
                  id="cf-message"
                  className="form-textarea"
                  placeholder="Your Message"
                  value={form.message}
                  onChange={update("message")}
                  required
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                className="form-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
