import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{ fontSize: 44, marginBottom: 12 }}>Human Development Assessment</h1>

        <p className="small" style={{ maxWidth: 850, lineHeight: 1.7 }}>
          This assessment is designed to support honest self-reflection across key areas of human development.
          For the clearest results, take it when you have enough time and space to answer truthfully rather than
          rushing through it.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#f8fafc",
            maxWidth: 900,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Before you begin</h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Take the assessment in a quiet setting where you can reflect without interruption.</li>
            <li>It may be best taken at night or during a calm part of the day, when you can be more honest with yourself.</li>
            <li>Check in with your body before your mind, as these questions are best answered by the truth of the body rather than overthinking.</li>
            <li>Answer based on your real patterns, not the person you hope to be or think you should be.</li>
            <li>Use the results for reflection and growth, not self-judgment.</li>
          </ul>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button" href="/assessment">
            Open assessment
          </Link>
          <Link className="button secondary" href="/privacy">
            Privacy
          </Link>
          <Link className="button secondary" href="/terms">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}