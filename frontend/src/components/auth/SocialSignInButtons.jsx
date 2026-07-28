import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

// Full-page redirect flow, not XHR: the backend 302s the browser to the
// provider, then back to /auth/oauth/:provider/callback, which sets the
// same session cookies login()/register() use and 302s back here — so
// AuthContext's existing /auth/me check on mount picks the session up with
// zero extra plumbing. Providers with no client credentials configured on
// the backend are simply absent from this list (see GET /auth/oauth/providers).
const LABELS = { google: "Google", apple: "Apple", twitter: "X (Twitter)", linkedin: "LinkedIn" };

export default function SocialSignInButtons() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    api.get("/auth/oauth/providers").then(({ providers: p }) => setProviders(p || [])).catch(() => {});
  }, []);

  if (!providers.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
        <span style={{ fontSize: 12, color: "var(--text3)" }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
      </div>
      {providers.map(p => (
        <a
          key={p}
          href={`/api/auth/oauth/${p}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border2)",
            background: "var(--bg)", color: "var(--text)", fontSize: 14, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Continue with {LABELS[p] || p}
        </a>
      ))}
    </div>
  );
}
