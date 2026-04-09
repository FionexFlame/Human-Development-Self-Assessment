import Link from "next/link";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="container narrow-container">
      <div className="card">
        <div className="badge">Email preferences</div>
        <h1 style={{ fontSize: 36, marginBottom: 10 }}>Unsubscribe from non-essential emails</h1>
        <p className="small" style={{ lineHeight: 1.7 }}>
          This page turns off optional follow-up emails such as growth resources, updates, and future offers. It does not remove access to your saved results.
        </p>
        <form action={`/email-preferences/${token}`} style={{ marginTop: 20 }}>
          <button className="button secondary" type="submit">Open full preference center</button>
        </form>
        <QuickUnsubscribe token={token} />
      </div>
    </main>
  );
}

function QuickUnsubscribe({ token }: { token: string }) {
  return (
    <div className="metric" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>One-click option</h3>
      <p className="small">Use the full preference center to manage both service emails and follow-up emails.</p>
      <form method="post" action={`/api/email-preferences/${token}?mode=unsubscribe-marketing`}>
        <button className="button" type="submit">Turn off follow-up emails</button>
      </form>
      <div style={{ marginTop: 14 }}>
        <Link className="button secondary" href={`/email-preferences/${token}`}>Manage all email settings</Link>
      </div>
    </div>
  );
}
