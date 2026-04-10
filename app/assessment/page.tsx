"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DOMAINS, SCALE, SCALE_LABELS } from "@/lib/domains";
import { getOverallProfile, scoreAssessmentBasic } from "@/lib/scoring";
import type { DomainResult, OverallProfile, SubmissionPayload } from "@/types";
import { getConsentVersion } from "@/lib/compliance";

type SubmitResponse = {
  submissionId: string | null;
  resultUrl: string | null;
  emailStatus:
    | "pending"
    | "sent"
    | "failed"
    | "suppressed"
    | "not_requested";
  results: DomainResult[];
  overall: OverallProfile;
  consentVersion: string;
  scoringModeUsed: string;
  manualReviewPending: boolean;
};

export default function AssessmentForm() {
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [consentToEmail, setConsentToEmail] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverResult, setServerResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = useMemo(
    () => DOMAINS.reduce((sum, d) => sum + d.core.length + d.contradictions.length + 1, 0),
    []
  );

  const completed = useMemo(() => {
    let count = 0;

    DOMAINS.forEach((d) => {
      d.core.forEach((_, i) => {
        if (answers[`${d.id}_core_${i}`] !== undefined) count += 1;
      });

      d.contradictions.forEach((_, i) => {
        if (answers[`${d.id}_con_${i}`] !== undefined) count += 1;
      });

      if ((reflections[d.id] || "").trim()) count += 1;
    });

    return count;
  }, [answers, reflections]);

  const localResults = useMemo(
    () => scoreAssessmentBasic(answers, reflections),
    [answers, reflections]
  );

  const localOverall = useMemo(
    () => getOverallProfile(localResults),
    [localResults]
  );

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      if (!isAdultConfirmed) {
        throw new Error("Please confirm that you are at least 18 before submitting.");
      }

      const payload: SubmissionPayload = {
        participantName,
        participantEmail,
        isAdultConfirmed,
        consentToEmail,
        marketingConsent,
        ageConfirmed18Plus: isAdultConfirmed,
        consentVersion: getConsentVersion(),
        answers,
        reflections,
      };

      const res = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit assessment.");
      }

      setServerResult(json as SubmitResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  const shownResults: DomainResult[] = serverResult?.results ?? localResults;
  const shownOverall: OverallProfile = serverResult?.overall ?? localOverall;

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div className="badge">Human Development Assessment</div>
        <h1 style={{ fontSize: 40, marginBottom: 28 }}>Full assessment</h1>

        <p className="small" style={{ maxWidth: 860, lineHeight: 1.7 }}>
          Answer from your real life over the last 6 months, especially when stressed,
          hurt, tired, disappointed, afraid, or under pressure.
          Your reflections will be scored automatically.
        </p>

        <div className="grid grid-3" style={{ marginTop: 20 }}>
          <div>
            <label className="small">Participant name</label>
            <input
              className="input"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Name"
            />
          </div>

          <div>
            <label className="small">Email address</label>
            <input
              className="input"
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="grid" style={{ gap: 12, marginTop: 16 }}>
          <label
            className="small"
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              checked={isAdultConfirmed}
              onChange={(e) => setIsAdultConfirmed(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>I confirm that I am at least 18 years old.</span>
          </label>

          <label
            className="small"
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              checked={consentToEmail}
              onChange={(e) => setConsentToEmail(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I agree to receive my requested assessment results by email and to have
              my email stored for this assessment workflow. This is required to save
              and deliver my results.
            </span>
          </label>

          <label
            className="small"
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I want optional follow-up emails about growth resources, updates, and
              future offers. I can turn this off later from the preference link in any email.
            </span>
          </label>

          <p className="small">
            By submitting, you also agree to the <a href="/privacy">privacy notice</a>{" "}
            and understand the assessment terms.
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="small">Progress</label>
          <div className="progress-wrap" style={{ marginTop: 12 }}>
            <div
              className="progress-bar"
              style={{ width: `${(completed / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            {completed}/{totalQuestions}
          </div>
        </div>
      </div>

      {DOMAINS.map((domain) => (
        <div className="card" key={domain.id}>
          <h2 style={{ marginTop: 0 }}>{domain.title}</h2>
          <p className="small">{domain.definition}</p>

          <div className="grid" style={{ gap: 18, marginTop: 18 }}>
            {domain.core.map((question, i) => (
              <QuestionBlock
                key={`${domain.id}_core_${i}`}
                question={question}
                value={answers[`${domain.id}_core_${i}`]}
                onSelect={(value) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [`${domain.id}_core_${i}`]: value,
                  }))
                }
              />
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Consistency check</h3>
          <div className="grid" style={{ gap: 18 }}>
            {domain.contradictions.map((question, i) => (
              <QuestionBlock
                key={`${domain.id}_con_${i}`}
                question={question}
                value={answers[`${domain.id}_con_${i}`]}
                onSelect={(value) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [`${domain.id}_con_${i}`]: value,
                  }))
                }
              />
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Reflection</h3>
          <p className="small">{domain.reflection}</p>
          <textarea
            className="textarea"
            value={reflections[domain.id] || ""}
            onChange={(e) =>
              setReflections((prev) => ({
                ...prev,
                [domain.id]: e.target.value,
              }))
            }
            placeholder="Write a real answer from your life. Honest, concrete answers are more useful than polished ones."
          />
        </div>
      ))}

      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="button" disabled={loading} onClick={handleSubmit}>
            {loading ? "Scoring..." : "Submit and score"}
          </button>

          {serverResult?.resultUrl ? (
            <Link className="button secondary" href={serverResult.resultUrl}>
              Open private result page
            </Link>
          ) : null}
        </div>

        {serverResult?.emailStatus ? (
          <p className="small" style={{ marginTop: 12 }}>
            Email status: <strong>{serverResult.emailStatus}</strong>
          </p>
        ) : null}

        {serverResult?.manualReviewPending ? (
          <p className="small" style={{ marginTop: 12 }}>
            Your initial results are ready. Your written reflections will be reviewed separately,
            and your full reviewed results will be sent to your email once that review is complete.
          </p>
        ) : null}

        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Results preview</h2>
        <p className="small">
          Overall stage {shownOverall.stage} — {shownOverall.label}
        </p>

        <div className="grid grid-3">
          <div className="metric">
            <div className="small">Average</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{shownOverall.average}</div>
          </div>

          <div className="metric">
            <div className="small">Lowest 3 average</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{shownOverall.lowestThreeAvg}</div>
          </div>

          <div className="metric">
            <div className="small">Variability</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{shownOverall.variability}</div>
          </div>
        </div>

        <table className="table" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Core</th>
              <th>Contradiction</th>
              <th>Reflection</th>
              <th>Source</th>
              <th>Final</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {shownResults.map((result) => (
              <tr key={result.domainId}>
                <td>{result.title}</td>
                <td>{result.coreAvg}</td>
                <td>{result.contradictionAvg}</td>
                <td>{result.reflectionScore}</td>
                <td>{result.reflectionSource ?? "basic"}</td>
                <td>{result.finalScore}</td>
                <td>
                  {result.stage} — {result.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  value,
  onSelect,
}: {
  question: string;
  value?: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div>
      <div>{question}</div>
      <div className="question-grid">
        {SCALE.map((n) => (
          <button
            key={n}
            type="button"
            className={`scale-button ${value === n ? "active" : ""}`}
            onClick={() => onSelect(n)}
            title={SCALE_LABELS[n]}
          >
            <div style={{ fontWeight: 700 }}>{n}</div>
            <div className="small">{SCALE_LABELS[n]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
