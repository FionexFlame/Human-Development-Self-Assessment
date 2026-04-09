"use client";

import { useState } from "react";

type DomainResult = {
  domainId: string;
  title: string;
  reflectionScore: number;
  finalScore: number;
};

export default function ManualReviewEditor({
  submissionId,
  participantEmail,
  participantName,
  domainResults,
}: {
  submissionId: string;
  participantEmail: string | null | undefined;
  participantName: string | null | undefined;
  domainResults: DomainResult[];
}) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      domainResults.map((result) => [result.domainId, String(result.reflectionScore ?? "")])
    )
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveAndMarkReviewed() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const manualScores: Record<string, number> = {};

      for (const result of domainResults) {
        const raw = scores[result.domainId]?.trim();

        if (!raw) {
          throw new Error(`Missing score for ${result.title}.`);
        }

        const parsed = Number(raw);

        if (Number.isNaN(parsed) || parsed < 0 || parsed > 5) {
          throw new Error(`Score for ${result.title} must be a number from 0 to 5.`);
        }

        manualScores[result.domainId] = parsed;
      }

      const res = await fetch("/api/admin/review-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          manualScores,
          reviewerNotes: notes,
        }),
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(
          json?.error ||
            text ||
            `Failed to save review. Server returned ${res.status}.`
        );
      }

      setMessage(
        json?.emailSent
          ? "Review saved, submission marked reviewed, and participant email sent."
          : "Review saved and submission marked reviewed."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 12 }}>Manual reflection scoring</h3>

      <div className="grid" style={{ gap: 12 }}>
        {domainResults.map((result) => (
          <div
            key={result.domainId}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>{result.title}</div>
            <div className="small" style={{ marginBottom: 8 }}>
              Current reflection score: {result.reflectionScore} | Current final score: {result.finalScore}
            </div>

            <label className="small">Manual reflection score (0–5)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={scores[result.domainId] ?? ""}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  [result.domainId]: e.target.value,
                }))
              }
              placeholder="e.g. 3.5"
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="small">Reviewer notes</label>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about why you adjusted the reflection scores."
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="button" disabled={saving} onClick={handleSaveAndMarkReviewed}>
          {saving ? "Saving..." : "Save and mark reviewed"}
        </button>

        <div className="small">
          Participant: <strong>{participantName || "Unnamed participant"}</strong>
          {participantEmail ? ` (${participantEmail})` : ""}
        </div>
      </div>

      {message ? (
        <p className="small" style={{ marginTop: 12, color: "green" }}>
          {message}
        </p>
      ) : null}

      {error ? (
        <p style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}