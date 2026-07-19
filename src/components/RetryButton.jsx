// src/components/RetryButton.jsx
"use client";

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: "20px",
        padding: "8px 24px",
        background: "var(--copper)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Retry
    </button>
  );
}
