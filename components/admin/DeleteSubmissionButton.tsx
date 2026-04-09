"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSubmissionButton({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this submission? This cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "DELETE",
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete submission.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        className="button secondary"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Delete submission"}
      </button>

      {error ? (
        <span className="small" style={{ color: "crimson" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}