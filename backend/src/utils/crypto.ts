// ════════════════════════════════════════════════════════════════════════════
//  ORGANIC CRYPTO — zero third-party auth dependencies (no bcrypt, no
//  jsonwebtoken). Built entirely on Node's built-in `crypto` module.
//
//  This mirrors the method names/shape of AuthEngine from
//  vylapp-organic-api.jsx, but the browser demo used a toy FNV hash to stay
//  dependency-free in a sandboxed artifact. A real backend needs real
//  security, so this version uses scrypt (password hashing) and HMAC-SHA256
//  (token signing) — both native to Node, both cryptographically sound.
// ════════════════════════════════════════════════════════════════════════════
import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }; // ~16MB memory cost, interactive-login tuned

function randomHex(n: number): string {
  return crypto.randomBytes(n).toString("hex");
}

function randomBase32(n: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes).map(b => chars[b % 32]).join("");
}

// ── Password hashing (scrypt, salted) ─────────────────────────────────────
function hashPassword(plain: string): string {
  const salt = randomHex(16);
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString("hex");
  return `$vyl$scrypt$${salt}$${hash}`;
}

function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts[1] !== "vyl" || parts[2] !== "scrypt") return false;
  const salt = parts[3];
  const expected = parts[4];
  const actual = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString("hex");
  // timing-safe comparison
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Base64url helpers ──────────────────────────────────────────────────────
function b64url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

// ── JWT (HMAC-SHA256, hand-rolled, RFC 7519-shaped) ───────────────────────
function signJWT(payload: Record<string, unknown>, secret: string, expiresInSec = 86400): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${body}.${sig}`;
}

type JWTResult =
  | { valid: true; payload: { sub: string; [key: string]: unknown; iat: number; exp: number } }
  | { valid: false; error: string };

function verifyJWT(token: string, secret: string): JWTResult {
  try {
    const [h, b, sig] = token.split(".");
    if (!h || !b || !sig) return { valid: false, error: "Malformed token" };
    const expected = crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "Invalid signature" };
    }
    const payload = JSON.parse(fromB64url(b));
    if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, error: "Token expired" };
    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Malformed token" };
  }
}

// ── Tokens ─────────────────────────────────────────────────────────────────
const generateSessionToken = () => "vyl_sess_" + randomHex(32);
const generateRefreshToken = () => "vyl_ref_" + randomHex(48);
const generateApiKey = (tier = "free") => `vyl_${tier}_${randomHex(24)}`;
const generateMagicLinkToken = () => "mlk_" + randomHex(40);
const generatePasswordResetToken = () => "pwr_" + randomHex(40);
const generateEmailVerificationToken = () => "evt_" + randomHex(32);
const generateOAuthState = () => randomHex(32);

// ── TOTP 2FA (RFC 6238, HMAC-SHA1 based) ──────────────────────────────────
function base32Decode(b32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of b32.toUpperCase().replace(/=+$/, "")) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateTOTPSecret(): string { return randomBase32(20); }

function totpAt(secret: string, timeStep: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, "0");
}

function generateTOTPCode(secret: string): string {
  return totpAt(secret, Math.floor(Date.now() / 30000));
}

function verifyTOTP(code: string, secret: string, window = 1): boolean {
  const step = Math.floor(Date.now() / 30000);
  for (let t = step - window; t <= step + window; t++) {
    if (totpAt(secret, t) === code) return true;
  }
  return false;
}

function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    `${randomHex(4)}-${randomHex(4)}-${randomHex(4)}`
  );
}

export = {
  randomHex, randomBase32,
  hashPassword, verifyPassword,
  signJWT, verifyJWT,
  generateSessionToken, generateRefreshToken, generateApiKey,
  generateMagicLinkToken, generatePasswordResetToken, generateEmailVerificationToken,
  generateOAuthState,
  generateTOTPSecret, generateTOTPCode, verifyTOTP, generateRecoveryCodes,
};
