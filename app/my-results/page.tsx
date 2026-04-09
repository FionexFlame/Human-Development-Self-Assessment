import Link from "next/link";

export default function MyResultsPage() {
  return (
    <main className="container">
      <div className="card">
        <div className="badge">My results</div>
        <h1 style={{ fontSize: 38, marginBottom: 8 }}>Open your results from your email</h1>
        <p className="small" style={{ maxWidth: 760, lineHeight: 1.8 }}>
          In this phase-3 version, participant results are delivered through a private emailed link rather than a public account dashboard.
          This keeps the build lighter while still letting you collect participant emails and send updated results later.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="button secondary" href="/assessment">Take the assessment</Link>
          <Link className="button secondary" href="/admin/login">Admin login</Link>
        </div>
      </div>
    </main>
  );
}
