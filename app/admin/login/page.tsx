"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Login failed.");
      }

      router.push("/admin/reviews");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container narrow-container">
      <div className="card">
        <div className="badge">Protected admin access</div>
        <h1 style={{ fontSize: 38, marginBottom: 12 }}>Admin login</h1>
        <p className="small" style={{ lineHeight: 1.7 }}>
          This is a lightweight phase-2 protection layer for your review queue. Set <code>ADMIN_PASSWORD</code> in your environment before using it.
        </p>

        <form onSubmit={handleLogin} className="grid" style={{ gap: 16, marginTop: 20 }}>
          <div>
            <label className="small">Admin password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <button className="button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p style={{ color: "crimson", margin: 0 }}>{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
