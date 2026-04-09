"use client";

import { useState } from "react";

export default function ResendEmailButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/resend-results/${submissionId}`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to resend email.");
      }

      setMessage(
        json.isFinal ? "Final results email sent." : "Initial results email sent."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to resend email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        className="button secondary"
        type="button"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Sending..." : "Resend results email"}
      </button>
      {message ? <span className="small">{message}</span> : null}
    </div>
  );
}