import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { applyReviewOverrides, getOverallProfile } from "@/lib/scoring";
import { canViewSubmission } from "@/lib/access";
import {
  getGrowthPriorityText,
  getOverallNarrative,
  getStageInterpretation,
} from "@/lib/results";
import { ReflectionReviewRow, SubmissionRow, DomainResult } from "@/types";
import PrintButton from "./PrintButton";

async function getSubmission(id: string) {
  try {
    const supabase = getServiceSupabase();

    const [{ data: submission }, { data: reviews }] = await Promise.all([
      supabase
        .from("assessment_submissions")
        .select(
          "id, participant_name, participant_email, scoring_mode, answers, reflections, domain_results, overall_profile, review_status, human_override, public_token, email_delivery_status, emailed_at, created_at, updated_at"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("reflection_reviews")
        .select(
          "id, submission_id, domain_id, ai_score, ai_confidence, ai_explanation, human_score, human_notes, final_score, status, created_at, updated_at"
        )
        .eq("submission_id", id),
    ]);

    return {
      submission: (submission ?? null) as SubmissionRow | null,
      reviews: (reviews ?? []) as ReflectionReviewRow[],
    };
  } catch {
    return { submission: null, reviews: [] };
  }
}

function formatDate(date?: string | null) {
  if (!date) return "Unknown date";

  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function getStageBadgeColor(stage: number) {
  if (stage <= 1) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }
  if (stage === 2) {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  }
  if (stage === 3) {
    return {
      background: "#e2e8f0",
      color: "#334155",
      border: "1px solid #cbd5e1",
    };
  }
  if (stage === 4) {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }
  return {
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  };
}

function sortDomainsHighToLow(results: DomainResult[]) {
  return [...results].sort((a, b) => b.finalScore - a.finalScore);
}

function scoreWidth(score: number) {
  return `${Math.max(6, Math.min(100, (score / 5) * 100))}%`;
}

type Point = {
  x: number;
  y: number;
};

type DomainGrowthGuidance = {
  practice: string;
  reflection: string;
  behavior: string;
  summary: string;
};

function polarToCartesian(cx: number, cy: number, radius: number, angle: number): Point {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function buildPolygonPoints(points: Point[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function normalizeDomainTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[🌊🌀🪞🛡️🌳💚🧭👑🪷🐎]/gu, "")
    .replace(/[—–-]/g, " ")
    .replace(/\//g, " / ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function getDomainEmoji(title: string) {
  const normalized = normalizeDomainTitle(title);

  if (normalized.includes("emotional containment")) return "🌊";
  if (normalized.includes("authentic creativity")) return "🌀";
  if (normalized.includes("relationship to ego")) return "🪞";
  if (normalized.includes("nervous system regulation")) return "🛡️";
  if (normalized.includes("identity formation")) return "🌳";
  if (normalized.includes("relational / love capacity") || normalized.includes("love capacity")) return "💚";
  if (normalized.includes("purpose / directed effort") || normalized.includes("directed effort")) return "🧭";
  if (normalized.includes("integration / embodied sovereignty") || normalized.includes("embodied sovereignty")) return "👑";
  if (normalized.includes("physical health")) return "🪷";
  if (normalized.includes("grounded rationality")) return "🐎";

  return "●";
}

function getRadarPalette(overallStage: number) {
  if (overallStage <= 2) {
    return {
      grid: "#cbd5e1",
      fill: "rgba(232, 161, 91, 0.20)",
      stroke: "#c97316",
      pointFill: "#e8a15b",
      pointStroke: "#8a4b14",
    };
  }

  if (overallStage === 3) {
    return {
      grid: "#c7d9d5",
      fill: "rgba(22, 50, 58, 0.18)",
      stroke: "#16323a",
      pointFill: "#e8a15b",
      pointStroke: "#16323a",
    };
  }

  return {
    grid: "#c7d9d5",
    fill: "rgba(31, 78, 121, 0.18)",
    stroke: "#1f4e79",
    pointFill: "#e8a15b",
    pointStroke: "#1f4e79",
  };
}

function getDomainGrowthGuidance(title: string): DomainGrowthGuidance {
  const normalized = normalizeDomainTitle(title);

  if (normalized.includes("nervous system regulation")) {
    return {
      practice:
        "Do a 5-minute regulation reset once per day: inhale through the nose for 4, exhale slowly for 6, and relax your jaw, shoulders, and belly.",
      reflection:
        "At the end of the day, ask: “What most dysregulated me today, and what helped me return to steadiness?”",
      behavior:
        "When overwhelmed, pause before reacting and take 3 slow breaths before speaking, texting, deciding, or leaving.",
      summary:
        "Build safety in the body by practicing a daily calming reset, noticing what throws you off, and training yourself to pause instead of immediately reacting.",
    };
  }

  if (normalized.includes("physical health")) {
    return {
      practice:
        "Take a 20-minute walk every day, preferably outdoors and at a steady pace.",
      reflection:
        "Each evening ask: “Did I treat my body like an ally today or like a machine?”",
      behavior:
        "Create a consistent sleep start time and protect it as much as possible.",
      summary:
        "Strengthen physical vitality by moving daily, honestly tracking how you treat your body, and becoming more consistent with sleep.",
    };
  }

  if (normalized.includes("emotional containment")) {
    return {
      practice:
        "When a strong emotion rises, spend 90 seconds naming it without acting on it: “I feel anger,” “I feel shame,” or “I feel fear.”",
      reflection:
        "Journal on: “What did I feel today that I wanted to avoid, discharge, or hand to someone else?”",
      behavior:
        "In emotionally charged moments, stay present without blaming, shutting down, or exploding for at least one full minute.",
      summary:
        "Grow your ability to hold emotion without collapsing into it, escaping it, or making others carry it for you.",
    };
  }

  if (normalized.includes("purpose / directed effort") || normalized.includes("directed effort")) {
    return {
      practice:
        "Spend 25 focused minutes each day on the most important task tied to your deeper mission before doing lower-value tasks.",
      reflection:
        "Each morning ask: “What is the most meaningful thing I can move forward today?”",
      behavior:
        "Finish one important task before switching to distraction, entertainment, or nonessential work.",
      summary:
        "Develop directed effort by taking one meaningful action daily, clarifying what matters most, and training follow-through over mood.",
    };
  }

  if (normalized.includes("identity formation")) {
    return {
      practice:
        "Write a daily 3-sentence self-definition: who you are becoming, what you stand for, and what you will no longer live as.",
      reflection:
        "Ask: “Where did I betray myself today, and where did I act in alignment with who I really am?”",
      behavior:
        "Make at least one small decision per day from self-respect instead of approval-seeking.",
      summary:
        "Form a stronger identity by clarifying your values, noticing when you abandon yourself, and choosing alignment over social acceptance.",
    };
  }

  if (normalized.includes("relationship to ego")) {
    return {
      practice:
        "Once a day, notice a moment of defensiveness and silently say: “I do not need to protect an image right now.”",
      reflection:
        "Journal: “What part of me needed to be seen as right, special, superior, or safe today?”",
      behavior:
        "In one conversation per day, listen without trying to dominate, impress, or prove yourself.",
      summary:
        "Loosen ego reactivity by noticing self-protection, getting curious about the image you defend, and practicing humility in real interactions.",
    };
  }

  if (normalized.includes("grounded rationality")) {
    return {
      practice:
        "When upset or confused, do a fact/story check: What do I know? What am I assuming? What evidence do I actually have?",
      reflection:
        "Ask: “Where did my mind distort reality today through fear, projection, or assumption?”",
      behavior:
        "Before making a conclusion about a person or situation, seek one additional piece of evidence.",
      summary:
        "Strengthen clear thinking by separating facts from interpretation, challenging distortions, and slowing down premature conclusions.",
    };
  }

  if (normalized.includes("authentic creativity")) {
    return {
      practice:
        "Spend 15 minutes a day making something without judging it — writing, sketching, voice notes, melody, ideas, or design.",
      reflection:
        "Ask: “What wanted to come through me today that I almost suppressed?”",
      behavior:
        "Share or save one real creative expression each week instead of endlessly refining it in private.",
      summary:
        "Develop authentic creativity by creating regularly without overcontrol, listening for what is real in you, and allowing expression before perfection.",
    };
  }

  if (normalized.includes("relational / love capacity") || normalized.includes("love capacity")) {
    return {
      practice:
        "Once a day, offer one undistracted moment of presence to someone: listen fully, make eye contact, and do not interrupt.",
      reflection:
        "Journal: “Did I relate to others today with openness, control, fear, or genuine care?”",
      behavior:
        "In close relationships, state one honest feeling or need directly instead of hinting, withdrawing, or expecting mind-reading.",
      summary:
        "Deepen love capacity by becoming more present, more honest, and less defended in how you relate to others.",
    };
  }

  if (normalized.includes("integration / embodied sovereignty") || normalized.includes("embodied sovereignty")) {
    return {
      practice:
        "Spend 10 minutes daily in alignment review: sit quietly and ask, “Are my choices, body, words, and values moving in the same direction?”",
      reflection:
        "Ask each night: “Where was I fragmented today, and where was I fully integrated?”",
      behavior:
        "Make one choice each day that reflects your deeper principles even when it is inconvenient.",
      summary:
        "Build embodied sovereignty by checking for inner alignment, noticing fragmentation, and choosing what is true over what is easy.",
    };
  }

  return {
    practice:
      "Choose one daily practice that directly strengthens this domain in a small, repeatable way.",
    reflection:
      "At the end of the day, ask what supported this domain and what weakened it.",
    behavior:
      "Pick one visible action you can repeat consistently each week to embody growth in this area.",
    summary:
      "Strengthen this domain by pairing one repeatable practice, one clear reflection habit, and one grounded behavior over time.",
  };
}

function RadarChartCard({
  results,
  overallStage,
}: {
  results: DomainResult[];
  overallStage: number;
}) {
  const size = 1100;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 250;
  const levels = 5;
  const labelRadius = maxRadius + 92;
  const palette = getRadarPalette(overallStage);

  const sortedForRadar = [...results].sort((a, b) => a.title.localeCompare(b.title));
  const angleStep = (Math.PI * 2) / sortedForRadar.length;

  const gridPolygons = Array.from({ length: levels }, (_, index) => {
    const radius = (maxRadius / levels) * (index + 1);
    const points = sortedForRadar.map((_, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return polarToCartesian(cx, cy, radius, angle);
    });
    return buildPolygonPoints(points);
  });

  const dataPoints = sortedForRadar.map((result, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const radius = (result.finalScore / 5) * maxRadius;
    return polarToCartesian(cx, cy, radius, angle);
  });

  const axisLines = sortedForRadar.map((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      start: { x: cx, y: cy },
      end: polarToCartesian(cx, cy, maxRadius, angle),
    };
  });

  const labelPoints = sortedForRadar.map((result, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const point = polarToCartesian(cx, cy, labelRadius, angle);
    return {
      ...point,
      emoji: getDomainEmoji(result.title),
      title: result.title,
      score: result.finalScore,
      angle,
    };
  });

  function getTextAnchor(x: number) {
    if (x < cx - 30) return "end";
    if (x > cx + 30) return "start";
    return "middle";
  }

  return (
    <section className="card print-section avoid-break" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Domain Radar Overview</h2>
      <p
        className="small"
        style={{ lineHeight: 1.8, marginTop: 0, marginBottom: 20, maxWidth: 900 }}
      >
        This chart shows your domains in one visual snapshot. Larger reach outward means greater
        strength and integration in that area.
      </p>

      <div
        className="radar-shell"
        style={{
          background: "#ffffff",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: 20,
          overflowX: "auto",
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          style={{ display: "block", minWidth: 760, height: "auto" }}
          role="img"
          aria-label="Radar chart of domain results"
        >
          {gridPolygons.map((polygon, index) => (
            <polygon
              key={index}
              points={polygon}
              fill="none"
              stroke={palette.grid}
              strokeWidth="1"
            />
          ))}

          {axisLines.map((line, index) => (
            <line
              key={index}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke={palette.grid}
              strokeWidth="1"
            />
          ))}

          {[1, 2, 3, 4, 5].map((level) => {
            const y = cy - (maxRadius / 5) * level;
            return (
              <text
                key={level}
                x={cx + 14}
                y={y - 6}
                fontSize="14"
                fill="#5f6f73"
                fontWeight="700"
              >
                {level}
              </text>
            );
          })}

          <polygon
            points={buildPolygonPoints(dataPoints)}
            fill={palette.fill}
            stroke={palette.stroke}
            strokeWidth="3"
          />

          {dataPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5.5"
              fill={palette.pointFill}
              stroke={palette.pointStroke}
              strokeWidth="1.5"
            />
          ))}

          {labelPoints.map((label, index) => {
            const anchor = getTextAnchor(label.x);

            return (
              <g key={index}>
                <text
                  x={label.x}
                  y={label.y - 12}
                  textAnchor={anchor}
                  fontSize="22"
                >
                  {label.emoji}
                </text>

                <text
                  x={label.x}
                  y={label.y + 14}
                  textAnchor={anchor}
                  fontSize="15"
                  fontWeight="700"
                  fill="#16323a"
                >
                  {label.title}
                </text>

                <text
                  x={label.x}
                  y={label.y + 34}
                  textAnchor={anchor}
                  fontSize="13"
                  fontWeight="700"
                  fill="#5f6f73"
                >
                  {label.score} / 5
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-2 print-grid-stack" style={{ marginTop: 20 }}>
        <div className="metric" style={{ background: "#ffffff" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>How to read this chart</h3>
          <ul className="clean-list" style={{ lineHeight: 1.9, marginBottom: 0 }}>
            <li>Each outer label represents one domain.</li>
            <li>A score closer to the outer edge indicates greater development in that area.</li>
            <li>Indented areas usually point to your highest growth priorities.</li>
            <li>A more balanced shape often suggests stronger overall integration.</li>
          </ul>
        </div>

        <div className="metric" style={{ background: "#ffffff" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Visual takeaway</h3>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            This graph is most useful for spotting unevenness. Your deepest opportunity is usually
            not improving every domain equally, but strengthening the weaker sides that pull the
            whole shape inward.
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const { submission, reviews } = await getSubmission(id);

  if (!submission) notFound();

  const allowed = await canViewSubmission(submission.public_token, token ?? null);

  if (!allowed) {
    return (
      <main className="container">
        <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="badge">Private result</div>
          <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 8 }}>
            This result link needs a valid email token
          </h1>
          <p className="small" style={{ lineHeight: 1.8, maxWidth: 620 }}>
            This page is protected. Please open it from the emailed link you received, or log in as
            the admin to view the result directly.
          </p>

          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button secondary" href="/assessment">
              Back to assessment
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const results = reviews.length
    ? applyReviewOverrides({
        answers: submission.answers,
        reflections: submission.reflections,
        existingResults: submission.domain_results,
        reviews,
      })
    : submission.domain_results ?? [];

  const overall = getOverallProfile(results);
  const priorities = getGrowthPriorityText(results);
  const sortedResults = sortDomainsHighToLow(results);

  const strongestDomain = overall.strongest?.[0] ?? sortedResults[0] ?? null;
  const weakestDomain = overall.weakest?.[0] ?? sortedResults[sortedResults.length - 1] ?? null;
  const recommendedPath = [...overall.weakest];

  const overallBadgeStyle = getStageBadgeColor(overall.stage);

  return (
    <>
      <style>{`
        .print-report-root {
          background: #f8fafc;
          min-height: 100vh;
          padding: 32px 0 56px;
        }

        .print-report-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .report-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .report-title-kicker {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--muted);
          font-weight: 700;
          margin-bottom: 8px;
        }

        .report-subtle {
          color: var(--muted);
        }

        .print-only {
          display: none;
        }

        .screen-only {
          display: block;
        }

        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .force-page-break {
          break-before: page;
          page-break-before: always;
        }

        .section-spacing {
          margin-top: 20px;
        }

        .growth-task-box {
          margin-top: 16px;
          padding: 16px 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
        }

        .growth-task-kicker {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #355c7d;
          margin-bottom: 10px;
        }

        .growth-task-summary {
          margin: 0;
          line-height: 1.8;
        }

        .growth-task-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 14px;
        }

        .growth-task-item {
          background: #ffffff;
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          padding: 12px 14px;
        }

        .growth-task-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #5f6f73;
          margin-bottom: 6px;
        }

        .growth-task-text {
          margin: 0;
          line-height: 1.8;
        }

        @media print {
          @page {
            size: auto;
            margin: 0.55in;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-report-root {
            background: #ffffff !important;
            padding: 0 !important;
          }

          .print-report-wrap {
            max-width: none !important;
            padding: 0 !important;
          }

          .screen-only,
          .button,
          .badge a,
          nav,
          footer {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .container {
            max-width: none !important;
            padding: 0 !important;
          }

          .card,
          .metric,
          .growth-task-item {
            background: #ffffff !important;
            box-shadow: none !important;
            border: 1px solid #d7dee7 !important;
          }

          .growth-task-box {
            background: #f8fafc !important;
            border: 1px solid #d7dee7 !important;
          }

          .card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .grid,
          .grid-2,
          .grid-3 {
            gap: 12px !important;
          }

          .print-grid-stack {
            display: block !important;
          }

          .print-grid-stack > * + * {
            margin-top: 12px !important;
          }

          .radar-shell {
            overflow: visible !important;
          }

          .progress-wrap {
            background: #eef2f7 !important;
            border: 1px solid #d7dee7 !important;
          }

          .progress-bar {
            background: #355c7d !important;
          }

          a {
            color: inherit !important;
            text-decoration: none !important;
          }

          h1, h2, h3 {
            break-after: avoid;
            page-break-after: avoid;
          }

          p, li {
            orphans: 3;
            widows: 3;
          }

          .domain-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        @media (max-width: 900px) {
          .report-topbar {
            align-items: flex-start;
          }
        }
      `}</style>

      <main className="print-report-root">
        <div className="print-report-wrap">
          <div className="report-topbar screen-only">
            <div>
              <div className="report-title-kicker">Human Development Assessment Report</div>
              <div className="report-subtle"></div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <PrintButton />
              <Link className="button secondary" href="/assessment">
                Back to Assessment
              </Link>
            </div>
          </div>

          <div className="print-only" style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#475569",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Human Development Assessment Report
            </div>
            <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: 0 }}>
              Personal Results and Development Profile
            </h1>
          </div>

          <section className="card avoid-break">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 24,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: "1 1 620px", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "var(--muted)",
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                  className="screen-only"
                >
                  Human Development Assessment Report
                </div>

                <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: "0 0 12px" }}>
                  Personal Results and Development Profile
                </h1>

                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 18,
                    lineHeight: 1.6,
                    color: "#355c7d",
                    fontWeight: 500,
                  }}
                >
                  Congratulations on taking this step toward your growth and human development!
                </p>

                <p className="small" style={{ lineHeight: 1.8, margin: 0 }}>
                  Participant: <strong>{submission.participant_name || "Unnamed participant"}</strong> ·
                  Completed: <strong>{formatDate(submission.created_at)}</strong> ·
                </p>

                <div
                  className="metric"
                  style={{ marginTop: 20, background: "#ffffff", borderRadius: 20 }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 10 }}>Executive Interpretation</h3>
                  <p className="small" style={{ lineHeight: 1.9, margin: 0 }}>
                    {getOverallNarrative(overall)}
                  </p>
                </div>
              </div>

              <div
                className="metric avoid-break"
                style={{
                  flex: "0 1 320px",
                  minWidth: 280,
                  background: "#ffffff",
                  borderRadius: 20,
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    ...overallBadgeStyle,
                  }}
                >
                  Overall Stage {overall.stage} — {overall.label}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="small">Overall average</div>
                  <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>
                    {overall.average} <span style={{ fontSize: 20, color: "var(--muted)" }}>/ 5</span>
                  </div>
                </div>

                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                  <div className="small">
                    Email status: {submission.email_delivery_status || "unknown"}
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    Last updated: {formatDate(submission.updated_at || submission.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-2 section-spacing avoid-break">
            <div className="metric">
              <div className="small">Overall Average</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{overall.average}</div>
              <p className="small" style={{ lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                Current developmental average across all domains.
              </p>
            </div>

            <div className="metric">
              <div className="small">Lowest 3 Average</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>
                {overall.lowestThreeAvg}
              </div>
              <p className="small" style={{ lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                This helps show where stabilization is needed first.
              </p>
            </div>

            <div className="metric">
              <div className="small">Strongest Domain</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                {strongestDomain?.title ?? "—"}
              </div>
              <p className="small" style={{ lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                {strongestDomain ? `${strongestDomain.finalScore} / 5` : "No domain available"}
              </p>
            </div>

            <div className="metric">
              <div className="small">Primary Growth Area</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                {weakestDomain?.title ?? "—"}
              </div>
              <p className="small" style={{ lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                {weakestDomain ? `${weakestDomain.finalScore} / 5` : "No domain available"}
              </p>
            </div>
          </section>

          <RadarChartCard results={results} overallStage={overall.stage} />

          <section className="grid grid-2 section-spacing" style={{ alignItems: "start" }}>
            <div className="card avoid-break">
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Ranked Domain Snapshot</h2>

              <div style={{ display: "grid", gap: 16 }}>
                {sortedResults.map((result) => (
                  <div key={result.domainId} className="avoid-break">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{result.title}</div>
                        <div className="small">{result.label}</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{result.finalScore} / 5</div>
                    </div>

                    <div className="progress-wrap">
                      <div
                        className="progress-bar"
                        style={{ width: scoreWidth(result.finalScore) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card avoid-break">
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Growth Priorities</h2>

              <div className="grid" style={{ gap: 14 }}>
                {recommendedPath.map((item, index) => (
                  <div className="metric avoid-break" key={item.domainId}>
                    <div className="small">Priority {index + 1}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{item.title}</div>
                    <div className="small" style={{ marginTop: 4 }}>
                      {item.finalScore} / 5 · Stage {item.stage}
                    </div>
                    <p className="small" style={{ lineHeight: 1.8, marginTop: 12, marginBottom: 0 }}>
                      {item.stage <= 2
                        ? "This domain likely needs stabilization first. Strengthening it may improve the reliability of several other areas."
                        : "This domain appears to need stronger consistency. Deepening it may create more integration across your overall profile."}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <ul className="clean-list" style={{ lineHeight: 1.9 }}>
                  {priorities.map((item) => (
                    <li key={item} style={{ marginBottom: 6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="card section-spacing">
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Domain Breakdown</h2>
            <p className="small" style={{ lineHeight: 1.8, marginTop: 0, marginBottom: 20 }}>
              A domain-by-domain view of your current profile, including score, stage, interpretation,
              and recommended next focus.
            </p>

            <div className="grid grid-2">
              {sortedResults.map((result, index) => {
                const stageBadgeStyle = getStageBadgeColor(result.stage);
                const growth = getDomainGrowthGuidance(result.title);

                return (
                  <div
                    className={`metric domain-break ${index > 0 && index % 4 === 0 ? "force-page-break" : ""}`}
                    key={result.domainId}
                    style={{ background: "#ffffff" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h3 style={{ marginTop: 0, marginBottom: 6 }}>{result.title}</h3>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            ...stageBadgeStyle,
                          }}
                        >
                          Stage {result.stage} — {result.label}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div className="small">Final Score</div>
                        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                          {result.finalScore}
                        </div>
                      </div>
                    </div>

                    <p className="small" style={{ lineHeight: 1.85, marginTop: 16, marginBottom: 0 }}>
                      {getStageInterpretation(result.stage)}
                    </p>

                    <div className="grid grid-3" style={{ marginTop: 16 }}>
                      <div className="metric">
                        <div className="small">Core</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                          {result.coreAvg}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="small">Consistency</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                          {result.contradictionAvg}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="small">Reflection</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                          {result.reflectionScore}
                        </div>
                      </div>
                    </div>

                    <div className="growth-task-box">
                      <div className="growth-task-kicker">Next growth task</div>
                      <p className="growth-task-summary">{growth.summary}</p>

                      <div className="growth-task-grid">
                        <div className="growth-task-item">
                          <div className="growth-task-label">Specific practice</div>
                          <p className="growth-task-text">{growth.practice}</p>
                        </div>

                        <div className="growth-task-item">
                          <div className="growth-task-label">Reflection habit</div>
                          <p className="growth-task-text">{growth.reflection}</p>
                        </div>

                        <div className="growth-task-item">
                          <div className="growth-task-label">Strengthening behavior</div>
                          <p className="growth-task-text">{growth.behavior}</p>
                        </div>
                      </div>
                    </div>

                    {result.notes?.length ? (
                      <div style={{ marginTop: 16 }}>
                        <div className="small" style={{ marginBottom: 8 }}>
                          Notes
                        </div>
                        <ul className="clean-list" style={{ lineHeight: 1.8 }}>
                          {result.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card section-spacing avoid-break">
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Important Note</h2>
            <p className="small" style={{ lineHeight: 1.9, margin: 0, maxWidth: 900 }}>
              This assessment is a developmental tool, not a clinical diagnosis. Scores reflect
              self-reported patterns, capacities, contradictions, and reflective responses at this point
              in time. These results are best used as a guide for structured growth, reflection, and
              continued learning.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}