"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EmailPreferencesPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [serviceEmails, setServiceEmails] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    params.then(async ({ token }) => {
      setToken(token);
      try {
        const res = await fetch(`/api/email-preferences/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load preferences.");
        setEmail(json.participant.email || "");
        setName(json.participant.name || "");
        setServiceEmails(Boolean(json.participant.serviceEmails));
        setMarketingEmails(Boolean(json.participant.marketingEmails));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/email-preferences/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceEmails, marketingEmails }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to save preferences.");
      setSuccess(json.summary || "Preferences updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container narrow-container">
      <div className="card">
        <div className="badge">Email preference center</div>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Manage your email settings</h1>
        {loading ? <p className="small">Loading…</p> : (
          <>
            <p className="small" style={{ lineHeight: 1.7 }}>
              {name || "Participant"} · {email}
            </p>
            <div className="grid" style={{ gap: 16, marginTop: 20 }}>
              <label className="metric" style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={serviceEmails} onChange={(e) => setServiceEmails(e.target.checked)} />
                  <strong>Service emails</strong>
                </div>
                <p className="small" style={{ marginTop: 8 }}>
                  Used for requested assessment results, resend requests, and important accountless service messages tied to your assessment.
                </p>
              </label>

              <label className="metric" style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />
                  <strong>Optional follow-up emails</strong>
                </div>
                <p className="small" style={{ marginTop: 8 }}>
                  Occasional growth resources, updates, workshop news, and future offers. This category is optional and can be turned off any time.
                </p>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
              <button className="button" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save preferences"}</button>
              <Link className="button secondary" href="/assessment">Back to assessment</Link>
            </div>
            {success ? <p style={{ color: "green", marginTop: 12 }}>{success}</p> : null}
            {error ? <p style={{ color: "crimson", marginTop: 12 }}>{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
