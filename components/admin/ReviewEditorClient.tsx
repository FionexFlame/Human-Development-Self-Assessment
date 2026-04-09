"use client";

import { useMemo, useState } from "react";

type ReviewItem = {
  domainId: string;
  title: string;
  reflectionText: string;
  currentReflectionScore: number | null;
  currentFinalScore: number | null;
  existingNotes: string[];
  reviewId: string | null;
  aiScore: number | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  humanScore: number | null;
  humanNotes: string | null;
  finalScore: number | null;
  reviewStatus: string;
};

export default function ReviewEditorClient({
  submissionId,
  participantName,
  reviewItems,
}: {
  submissionId: string;
  participantName: string;
  reviewItems: ReviewItem[];
}) {
  const [manualScores, setManualScores] = useState<Record<string, string>>(() =>
    reviewItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.domainId] =
        item.humanScore !== null && item.humanScore !== undefined
          ? String(item.humanScore)
          : item.currentFinalScore !== null && item.currentFinalScore !== undefined
          ? String(item.currentFinalScore)
          : "";
      return acc;
    }, {})
  );

  const [reviewerNotes, setReviewerNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changedCount = useMemo(() => {
    return reviewItems.filter((item) => {
      const current = manualScores[item.domainId];
      const baseline =
        item.humanScore !== null && item.humanScore !== undefined
          ? String(item.humanScore)
          : item.currentFinalScore !== null && item.currentFinalScore !== undefined
          ? String(item.currentFinalScore)
          : "";
      return current !== baseline;
    }).length;
  }, [manualScores, reviewItems]);

  function updateScore(domainId: string, value: string) {
    setManualScores((prev) => ({
      ...prev,
      [domainId]: value,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const cleanedScores = Object.entries(manualScores).reduce<Record<string, number>>(
        (acc, [domainId, raw]) => {
          const trimmed = raw.trim();

          if (!trimmed) return acc;

          const score = Number(trimmed);

          if (!Number.isFinite(score) || score < 0 || score > 5) {
            throw new Error(`Score for ${domainId} must be between 0 and 5.`);
          }

          acc[domainId] = score;
          return acc;
        },
        {}
      );

      if (Object.keys(cleanedScores).length === 0) {
        throw new Error("Enter at least one manual score before saving.");
      }

      const res = await fetch("/api/admin/review-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          manualScores: cleanedScores,
          reviewerNotes: reviewerNotes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to save review.");
      }

      setMessage(
        json.emailSent
          ? `Review saved and final results emailed to ${participantName}.`
          : "Review saved successfully."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Manual reflection review</h2>
          <p className="small" style={{ margin: 0, lineHeight: 1.8, maxWidth: 900 }}>
            Adjust the final score for each reflection domain as needed. Scores must be between 0
            and 5. When you save, the submission will be marked reviewed and the final results email
            can be sent automatically.
          </p>
        </div>

        <div className="metric" style={{ minWidth: 220 }}>
          <div className="small">Changed domains</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{changedCount}</div>
        </div>
      </div>

      <div className="grid" style={{ gap: 18, marginTop: 20 }}>
        {reviewItems.map((item) => (
          <div key={item.domainId} className="metric" style={{ background: "#ffffff" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 620px" }}>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>{item.title}</h3>

                <div className="small" style={{ lineHeight: 1.8 }}>
                  Current reflection score: <strong>{item.currentReflectionScore ?? "N/A"}</strong>
                  {" · "}
                  Current final score: <strong>{item.currentFinalScore ?? "N/A"}</strong>
                  {item.aiScore !== null && item.aiScore !== undefined ? (
                    <>
                      {" · "}AI score: <strong>{item.aiScore}</strong>
                    </>
                  ) : null}
                  {item.aiConfidence !== null && item.aiConfidence !== undefined ? (
                    <>
                      {" · "}AI confidence: <strong>{item.aiConfidence}</strong>
                    </>
                  ) : null}
                </div>

                {item.aiExplanation ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                  >
                    <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>
                      AI explanation
                    </div>
                    <div className="small" style={{ lineHeight: 1.7 }}>
                      {item.aiExplanation}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fcfcfd",
                  }}
                >
                  <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
                    Written reflection
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                    {item.reflectionText || "No response."}
                  </div>
                </div>

                {item.humanNotes ? (
                  <div className="small" style={{ marginTop: 10, lineHeight: 1.7 }}>
                    Existing review note: <strong>{item.humanNotes}</strong>
                  </div>
                ) : null}

                {item.existingNotes?.length ? (
                  <div className="small" style={{ marginTop: 8, lineHeight: 1.7 }}>
                    Existing result notes:
                    <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                      {item.existingNotes.map((note, index) => (
                        <li key={`${item.domainId}-note-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  flex: "0 1 240px",
                  minWidth: 220,
                  display: "grid",
                  gap: 10,
                }}
              >
                <label className="small" htmlFor={`score-${item.domainId}`}>
                  Manual final score
                </label>
                <input
                  id={`score-${item.domainId}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="5"
                  step="0.1"
                  value={manualScores[item.domainId] ?? ""}
                  onChange={(e) => updateScore(item.domainId, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "#fff",
                    fontSize: 16,
                  }}
                />

                <div className="small" style={{ lineHeight: 1.7 }}>
                  Enter the reviewed score you want saved as the final domain score.
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20, background: "#ffffff" }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Reviewer notes</h3>
        <p className="small" style={{ marginTop: 0, lineHeight: 1.8 }}>
          This note will be attached to the domains you save in this review pass.
        </p>

        <textarea
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          rows={5}
          placeholder="Add a reviewer note for this submission..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "#fff",
            fontSize: 15,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <button
            type="button"
            className="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving review..." : "Save and mark reviewed"}
          </button>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
            }}
          >
            {message}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}