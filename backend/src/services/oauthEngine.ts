// ════════════════════════════════════════════════════════════════════════════
//  OAUTH ENGINE — Google / Apple / Twitter(X) / LinkedIn
//
//  Zero extra dependencies (consistent with utils/crypto.ts) — everything
//  here is Node's built-in `crypto` + `fetch`. Each provider is Authorization
//  Code flow (RFC 6749); Twitter additionally requires PKCE; Apple
//  additionally requires (a) a JWT "client_secret" we generate and sign
//  ourselves with our Apple private key, (b) response_mode=form_post at the
//  callback instead of a query-string GET, and (c) verifying the id_token
//  Apple gives back ourselves (Apple has no userinfo endpoint).
//
//  SECURITY: every provider's identity is only ever trusted after a
//  server-to-server code exchange (never trusting anything the browser
//  claims directly), and account linking against an existing local account
//  only happens when the provider confirms the email is verified — see
//  auth.controller.ts's oauthCallback for that logic.
// ════════════════════════════════════════════════════════════════════════════
import crypto from "crypto";
import env from "../config/env";
import type { OauthProvider, OauthProfile } from "../types/oauth";

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlJson(obj: unknown): string {
  return base64url(Buffer.from(JSON.stringify(obj)));
}
function base64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ── PKCE (Twitter/X requires it) ──────────────────────────────────────────────
function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}
function codeChallengeFromVerifier(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

const REDIRECT_BASE = `${env.apiBaseUrl}/auth/oauth`;

// ── Per-provider static config ────────────────────────────────────────────────
const PROVIDERS: Record<OauthProvider, {
  authEndpoint: string; tokenEndpoint: string; scope: string; usesPKCE: boolean; usesFormPost: boolean;
}> = {
  google:   { authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth", tokenEndpoint: "https://oauth2.googleapis.com/token", scope: "openid email profile", usesPKCE: false, usesFormPost: false },
  linkedin: { authEndpoint: "https://www.linkedin.com/oauth/v2/authorization", tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken", scope: "openid email profile", usesPKCE: false, usesFormPost: false },
  twitter:  { authEndpoint: "https://twitter.com/i/oauth2/authorize", tokenEndpoint: "https://api.twitter.com/2/oauth2/token", scope: "tweet.read users.read offline.access", usesPKCE: true, usesFormPost: false },
  apple:    { authEndpoint: "https://appleid.apple.com/auth/authorize", tokenEndpoint: "https://appleid.apple.com/auth/token", scope: "name email", usesPKCE: false, usesFormPost: true },
};

function isConfigured(provider: OauthProvider): boolean {
  const c = env.oauth[provider];
  if (provider === "apple") { const a = env.oauth.apple; return !!(a.clientId && a.teamId && a.keyId && a.privateKey); }
  return !!(c as any)?.clientId && !!(c as any)?.clientSecret;
}

function redirectUriFor(provider: OauthProvider): string {
  return `${REDIRECT_BASE}/${provider}/callback`;
}

// ── Apple's client_secret is a short-lived JWT we sign ourselves (ES256) ─────
function appleClientSecret(): string {
  const { teamId, keyId, clientId, privateKey } = env.oauth.apple;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId, iat: now, exp: now + 5 * 60, aud: "https://appleid.apple.com", sub: clientId,
  };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  // Apple/JOSE ES256 signatures are the raw r||s concatenation, not DER —
  // Node's default `sign()` output is DER, so this must be requested explicitly.
  const signature = sign.sign({ key: privateKey as string, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64url(signature)}`;
}

// ── Verify an Apple id_token against Apple's published JWKS ───────────────────
let appleJwksCache: { keys: any[]; fetchedAt: number } | null = null;
async function getAppleJwks() {
  if (appleJwksCache && Date.now() - appleJwksCache.fetchedAt < 60 * 60 * 1000) return appleJwksCache.keys;
  const res = await fetch("https://appleid.apple.com/auth/keys");
  const data: any = await res.json();
  appleJwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

async function verifyAppleIdToken(idToken: string): Promise<any> {
  const [headerB64, payloadB64, sigB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error("Malformed id_token");
  const header = JSON.parse(base64urlDecode(headerB64).toString("utf8"));
  const payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));

  const keys = await getAppleJwks();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) throw new Error("No matching Apple signing key (kid) found");

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const valid = verifier.verify(publicKey, base64urlDecode(sigB64));
  if (!valid) throw new Error("Apple id_token signature verification failed");

  if (payload.iss !== "https://appleid.apple.com") throw new Error("Unexpected id_token issuer");
  if (payload.aud !== env.oauth.apple.clientId) throw new Error("Unexpected id_token audience");
  if (payload.exp * 1000 < Date.now()) throw new Error("id_token has expired");

  return payload;
}

// ── Build the URL we redirect the user's browser to ───────────────────────────
function buildAuthUrl(provider: OauthProvider, opts: { state: string; codeChallenge?: string }): string {
  const cfg = PROVIDERS[provider];
  const clientId = provider === "apple" ? env.oauth.apple.clientId : (env.oauth[provider] as any).clientId;
  const params = new URLSearchParams({
    client_id: clientId as string,
    redirect_uri: redirectUriFor(provider),
    response_type: "code",
    scope: cfg.scope,
    state: opts.state,
  });
  if (cfg.usesFormPost) params.set("response_mode", "form_post");
  if (cfg.usesPKCE && opts.codeChallenge) {
    params.set("code_challenge", opts.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${cfg.authEndpoint}?${params.toString()}`;
}

// ── Exchange the authorization code for tokens ────────────────────────────────
async function exchangeCode(provider: OauthProvider, opts: { code: string; codeVerifier?: string | null }): Promise<{ accessToken?: string; idToken?: string }> {
  const cfg = PROVIDERS[provider];
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: redirectUriFor(provider),
    client_id: provider === "apple" ? (env.oauth.apple.clientId as string) : (env.oauth[provider] as any).clientId,
  });
  if (provider === "apple") {
    body.set("client_secret", appleClientSecret());
  } else if (cfg.usesPKCE) {
    if (!opts.codeVerifier) throw new Error("Missing PKCE code_verifier");
    body.set("code_verifier", opts.codeVerifier);
  } else {
    body.set("client_secret", (env.oauth[provider] as any).clientSecret);
  }

  const res = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Token exchange failed");
  return { accessToken: data.access_token, idToken: data.id_token };
}

// ── Resolve the user's profile from the tokens we got back ───────────────────
async function fetchProfile(provider: OauthProvider, tokens: { accessToken?: string; idToken?: string }, appleFormUser?: string): Promise<OauthProfile> {
  if (provider === "apple") {
    if (!tokens.idToken) throw new Error("Apple did not return an id_token");
    const claims = await verifyAppleIdToken(tokens.idToken);
    // Apple only ever sends the user's name once, as a JSON string in the
    // `user` form field on the FIRST authorization — never again after that,
    // so we take it if present and fall back to null otherwise.
    let displayName: string | null = null;
    if (appleFormUser) {
      try {
        const parsed = JSON.parse(appleFormUser);
        displayName = [parsed?.name?.firstName, parsed?.name?.lastName].filter(Boolean).join(" ") || null;
      } catch { /* ignore malformed `user` field */ }
    }
    return {
      providerId: claims.sub, email: claims.email || null,
      emailVerified: claims.email_verified === true || claims.email_verified === "true",
      displayName, avatarUrl: null,
    };
  }

  if (provider === "google") {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    const p: any = await res.json();
    if (!res.ok) throw new Error("Failed to fetch Google profile");
    return { providerId: p.sub, email: p.email || null, emailVerified: !!p.email_verified, displayName: p.name || null, avatarUrl: p.picture || null };
  }

  if (provider === "linkedin") {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    const p: any = await res.json();
    if (!res.ok) throw new Error("Failed to fetch LinkedIn profile");
    return { providerId: p.sub, email: p.email || null, emailVerified: !!p.email_verified, displayName: p.name || null, avatarUrl: p.picture || null };
  }

  // twitter
  const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  const p: any = await res.json();
  if (!res.ok) throw new Error("Failed to fetch Twitter profile");
  // Twitter/X's userinfo doesn't include email at all (must be requested
  // separately via an approved elevated app tier) — accounts created this
  // way are provider-linked only until the user adds their own email.
  return { providerId: p.data.id, email: null, emailVerified: false, displayName: p.data.name || null, avatarUrl: p.data.profile_image_url || null };
}

export = {
  isConfigured, buildAuthUrl, exchangeCode, fetchProfile,
  generateCodeVerifier, codeChallengeFromVerifier,
  usesPKCE: (provider: OauthProvider) => PROVIDERS[provider].usesPKCE,
  usesFormPost: (provider: OauthProvider) => PROVIDERS[provider].usesFormPost,
};
