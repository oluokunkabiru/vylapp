import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

// Full-page redirect flow, not XHR: the backend 302s the browser to the
// provider, then back to /auth/oauth/:provider/callback, which sets the
// same session cookies login()/register() use and 302s back here — so
// AuthContext's existing /auth/me check on mount picks the session up with
// zero extra plumbing. Providers with no client credentials configured on
// the backend are simply absent from this list (see GET /auth/oauth/providers).
const LABELS = { google: "Google", apple: "Apple", twitter: "X (Twitter)", linkedin: "LinkedIn" };

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.694.91-1.4 0-2.36-1.25-3.351-2.59-1.599-2.05-2.777-4.61-2.777-7.04 0-4.09 2.641-6.29 5.243-6.29 1.36 0 2.51.9 3.372.9.83 0 2.121-.95 3.601-.95.618 0 2.803.06 4.242 2.11-.104.07-2.533 1.48-2.533 4.42 0 3.5 3.087 4.7 3.187 4.72z"/>
    </svg>
  );
}
function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
const ICONS = { google: GoogleIcon, apple: AppleIcon, twitter: TwitterIcon, linkedin: LinkedInIcon };

export default function SocialSignInButtons() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    api.get("/auth/oauth/providers").then(({ providers: p }) => setProviders(p || [])).catch(() => {});
  }, []);

  if (!providers.length) return null;
  console.log("providers", providers);



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
        <span style={{ fontSize: 12, color: "var(--text3)" }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
      </div>
      {providers.map(p => {
        const Icon = ICONS[p];
        return (
          <a
            key={p}
            href={`/api/auth/oauth/${p}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border2)",
              background: "var(--bg)", color: "var(--text)", fontSize: 14, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {Icon && <Icon />}
            Continue with {LABELS[p] || p}
          </a>
        );
      })}
    </div>
  );
}
