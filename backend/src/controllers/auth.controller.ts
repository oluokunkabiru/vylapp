import { Request, Response } from "express";
import { AuthedRequest } from "../types/express";
import env from "../config/env";
import crypto from "../utils/crypto";
import authCookies from "../utils/authCookies";
import mailer from "../utils/mailer";
import logger from "../utils/logger";
import respond from "../utils/respond";
import rbac from "../rbac";
import prisma from "../config/prisma";
import OauthEngine from "../services/oauthEngine";
import type { OauthProvider } from "../types/oauth";
import { AuthProvider } from "../generated/prisma";

const { ok, fail } = respond;

const ACCESS_TTL_SEC = 15 * 60; // 15 min access token
const REFRESH_TTL_DAYS = 30;
const VERIFY_TTL_HRS = 24; // email verification link lifetime

function issueTokens(user: { id: string; handle: string }) {
  const accessToken = crypto.signJWT({ sub: user.id, handle: user.handle }, env.jwtSecret, ACCESS_TTL_SEC);
  const refreshToken = crypto.generateRefreshToken();
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, token: string, deviceInfo?: unknown) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);
  await prisma.refreshTokens.create({
    data: { userId, token, deviceInfo: (deviceInfo as any) || {}, expiresAt },
  });
}

function publicUser(row: any) {
  return {
    id: row.id, handle: row.handle, displayName: row.display_name, bio: row.bio,
    avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, avatarUrl: row.avatar_url,
    roleTag: row.role_tag, verified: row.verified, verificationTier: row.verification_tier,
    isCreator: row.is_creator, onboardingStep: row.onboarding_step, onboardingDone: row.onboarding_done,
    interests: row.interests, subscriptionPlan: row.subscription_plan,
    vibesCount: row.vibes_count, connectionsCount: row.connections_count, followingCount: row.following_count,
    contentLanguages: row.content_language, location: row.location,
    currentCountry: row.current_country, currentCity: row.current_city, heritageCountries: row.heritage_countries,
    isFoundingMember: row.is_founding_member, foundingRank: row.founding_rank,
  };
}

// publicUser expects the snake_case shape it always has (matching every
// other controller's raw-row convention) — map Prisma's camelCase User at
// each call site rather than changing publicUser's contract.
function toSnakeUser(u: any) {
  return {
    id: u.id, handle: u.handle, display_name: u.displayName, bio: u.bio,
    avatar_color: u.avatarColor, avatar_initials: u.avatarInitials, avatar_url: u.avatarUrl,
    role_tag: u.roleTag, verified: u.verified, verification_tier: u.verificationTier,
    is_creator: u.isCreator, onboarding_step: u.onboardingStep, onboarding_done: u.onboardingDone,
    interests: u.interests, subscription_plan: u.subscriptionPlan,
    vibes_count: u.vibesCount, connections_count: u.connectionsCount, following_count: u.followingCount,
    content_language: u.contentLanguage, location: u.location,
    current_country: u.currentCountry, current_city: u.currentCity, heritage_countries: u.heritageCountries,
    is_founding_member: u.isFoundingMember, founding_rank: u.foundingRank,
  };
}

// ── Helper: create + store an email-verification token ────────────────────────
async function issueEmailVerificationToken(userId: string) {
  const token = crypto.generateEmailVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFY_TTL_HRS * 3600000);
  // Invalidate any previous un-used tokens first
  await prisma.emailVerifications.updateMany({
    where: { userId, verifiedAt: null },
    data: { verifiedAt: new Date() },
  });
  await prisma.emailVerifications.create({ data: { userId, token, expiresAt } });
  return token;
}

// ── POST /auth/register ────────────────────────────────────────────────────────
async function register(req: Request, res: Response) {
  const { email, handle, password, displayName } = req.body;
  if (!email || !handle || !password || !displayName) {
    return fail(res, 400, "email, handle, password, and displayName are all required");
  }
  if (password.length < 8) return fail(res, 400, "Password must be at least 8 characters");

  const dupe = await prisma.users.findFirst({ where: { OR: [{ email }, { handle }] }, select: { id: true } });
  if (dupe) return fail(res, 409, "Email or handle already in use");

  const passwordHash = crypto.hashPassword(password);
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // Founding member: permanent, first 1000 accounts ever
  const existingCount = await prisma.users.count();
  const isFounding = existingCount < 1000;
  const foundingRank = isFounding ? existingCount + 1 : null;

  const user = await prisma.users.create({
    data: {
      email, handle, displayName, passwordHash,
      avatarInitials: initials || "VY",
      isFoundingMember: isFounding,
      foundingRank,
    },
  });

  // Assign base 'user' role
  await rbac.assignRole(user.id, "user");

  // Issue auth tokens
  const { accessToken, refreshToken } = issueTokens(user);
  await storeRefreshToken(user.id, refreshToken, { ip: req.ip, ua: req.headers["user-agent"] });

  // Send welcome email with email-verification link (fire-and-forget)
  try {
    const verifyToken = await issueEmailVerificationToken(user.id);
    await mailer.sendWelcomeEmail(user.email, user.displayName, verifyToken);
  } catch (err: any) {
    logger.warn("Welcome email failed to send after registration", { userId: user.id, error: err.message });
  }

  const csrfToken = authCookies.setAuthCookies(res, { accessToken, refreshToken });
  return ok(res, { user: publicUser(toSnakeUser(user)), csrfToken }, 201);
}

// ── POST /auth/login ───────────────────────────────────────────────────────────
async function login(req: Request, res: Response) {
  const { emailOrHandle, password } = req.body;
  if (!emailOrHandle || !password) return fail(res, 400, "emailOrHandle and password are required");
  const user = await prisma.users.findFirst({ where: { OR: [{ email: emailOrHandle }, { handle: emailOrHandle }] } });
  if (!user) return fail(res, 401, "Invalid credentials");
  if (user.isSuspended) return fail(res, 403, "Account suspended");
  if (!crypto.verifyPassword(password, user.passwordHash)) return fail(res, 401, "Invalid credentials");

  await prisma.users.update({ where: { id: user.id }, data: { online: true, lastSeen: new Date() } });

  const { accessToken, refreshToken } = issueTokens(user);
  await storeRefreshToken(user.id, refreshToken, { ip: req.ip, ua: req.headers["user-agent"] });

  const csrfToken = authCookies.setAuthCookies(res, { accessToken, refreshToken });
  return ok(res, { user: publicUser(toSnakeUser(user)), csrfToken });
}

// ── POST /auth/refresh ─────────────────────────────────────────────────────────
async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[authCookies.REFRESH_COOKIE];
  if (!refreshToken) return fail(res, 401, "Missing refresh token");

  const record = await prisma.refreshTokens.findFirst({
    where: { token: refreshToken, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { users: { select: { handle: true } } },
  });
  if (!record) return fail(res, 401, "Invalid or expired refresh token");

  const accessToken = crypto.signJWT({ sub: record.userId, handle: record.users.handle }, env.jwtSecret, ACCESS_TTL_SEC);
  authCookies.setAccessCookie(res, accessToken);
  return ok(res, { refreshed: true });
}

// ── POST /auth/logout ──────────────────────────────────────────────────────────
async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[authCookies.REFRESH_COOKIE];
  if (refreshToken) await prisma.refreshTokens.updateMany({ where: { token: refreshToken }, data: { revokedAt: new Date() } });
  authCookies.clearAuthCookies(res);
  return ok(res, { loggedOut: true });
}

// ── GET /auth/me ───────────────────────────────────────────────────────────────
async function me(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({ where: { id: req.user.id } });
  // Echoes the CSRF cookie back in the body so the frontend can restore its
  // in-memory copy on page load — the browser attaches vyl_csrf to this
  // request automatically (SameSite=None + credentials: include), but the
  // frontend's JS can't read it directly cross-origin in production (see
  // authCookies.ts's setAuthCookies for why).
  const csrfToken = req.cookies?.[authCookies.CSRF_COOKIE] || null;
  return ok(res, { user: publicUser(toSnakeUser(user)), csrfToken });
}

// ── POST /auth/change-password ─────────────────────────────────────────────────
async function changePassword(req: AuthedRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return fail(res, 400, "currentPassword and newPassword are required");
  if (newPassword.length < 8) return fail(res, 400, "New password must be at least 8 characters");

  const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { passwordHash: true, email: true, displayName: true } });
  if (!crypto.verifyPassword(currentPassword, user!.passwordHash)) return fail(res, 401, "Current password is incorrect");

  await prisma.users.update({ where: { id: req.user.id }, data: { passwordHash: crypto.hashPassword(newPassword) } });
  await prisma.refreshTokens.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });

  // Send password-changed confirmation email (fire-and-forget)
  try {
    await mailer.sendPasswordChangedEmail(user!.email, user!.displayName);
  } catch (err: any) {
    logger.warn("Password-changed email failed to send", { userId: req.user.id, error: err.message });
  }

  return ok(res, { changed: true });
}

// ── POST /auth/verify-email ────────────────────────────────────────────────────
async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) return fail(res, 400, "token is required");

  const record = await prisma.emailVerifications.findFirst({
    where: { token, verifiedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) return fail(res, 400, "Invalid or expired verification token");

  await prisma.emailVerifications.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });
  await prisma.users.update({ where: { id: record.userId }, data: { verified: true } });

  return ok(res, { verified: true });
}

// ── POST /auth/resend-verification ────────────────────────────────────────────
async function resendVerification(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { email: true, displayName: true, verified: true } });

  if (user!.verified) return fail(res, 400, "Email is already verified");

  try {
    const verifyToken = await issueEmailVerificationToken(req.user.id);
    await mailer.sendEmailVerificationEmail(user!.email, user!.displayName, verifyToken);
  } catch (err: any) {
    logger.error("Resend verification email failed", { userId: req.user.id, error: err.message });
    return fail(res, 500, "Failed to send verification email, please try again later");
  }

  return ok(res, { message: "Verification email sent. Please check your inbox." });
}

// ── 2FA: enroll ───────────────────────────────────────────────────────────────
async function enroll2FA(req: AuthedRequest, res: Response) {
  const secret = crypto.generateTOTPSecret();
  const recoveryCodes = crypto.generateRecoveryCodes();
  const otp = crypto.generateTOTPCode(secret); // current 30-second window

  await prisma.users.update({ where: { id: req.user.id }, data: { twoFactorSecret: secret, recoveryCodes } });

  // Email the initial OTP so the user can verify the enrolment
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { email: true, displayName: true } });
    await mailer.send2FAOTPEmail(user!.email, user!.displayName, otp);
  } catch (err: any) {
    logger.warn("2FA OTP email failed to send", { userId: req.user.id, error: err.message });
  }

  return ok(res, { secret, recoveryCodes });
}

// ── 2FA: verify ───────────────────────────────────────────────────────────────
async function verify2FA(req: AuthedRequest, res: Response) {
  const { code } = req.body;
  const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { twoFactorSecret: true } });
  if (!user?.twoFactorSecret) return fail(res, 400, "2FA not enrolled");
  const valid = crypto.verifyTOTP(code, user.twoFactorSecret);
  if (!valid) return fail(res, 401, "Invalid code");
  await prisma.users.update({ where: { id: req.user.id }, data: { twoFactorEnabled: true } });
  return ok(res, { enabled: true });
}

// ── POST /auth/forgot-password ─────────────────────────────────────────────────
async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return fail(res, 400, "Email is required");

  const user = await prisma.users.findFirst({ where: { email }, select: { id: true, displayName: true, email: true } });
  if (user) {
    const token = crypto.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResets.create({ data: { userId: user.id, token, expiresAt } });

    try {
      await mailer.sendPasswordResetEmail(user.email, user.displayName, token);
    } catch (err: any) {
      logger.warn("Password-reset email failed to send", { userId: user.id, error: err.message });
      // Still return success to prevent email enumeration
    }
  }

  return ok(res, { message: "If the email is registered, a password reset link has been sent." });
}

// ── POST /auth/reset-password ──────────────────────────────────────────────────
async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return fail(res, 400, "Token and newPassword are required");
  if (newPassword.length < 8) return fail(res, 400, "Password must be at least 8 characters");

  const reset = await prisma.passwordResets.findFirst({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    include: { users: { select: { email: true, displayName: true } } },
  });
  if (!reset) return fail(res, 400, "Invalid or expired reset token");

  const hashed = crypto.hashPassword(newPassword);
  await prisma.users.update({ where: { id: reset.userId }, data: { passwordHash: hashed } });
  await prisma.passwordResets.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  await prisma.refreshTokens.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });

  // Send password-changed confirmation email (fire-and-forget)
  try {
    await mailer.sendPasswordChangedEmail(reset.users.email, reset.users.displayName);
  } catch (err: any) {
    logger.warn("Post-reset confirmation email failed to send", { userId: reset.userId, error: err.message });
  }

  return ok(res, { message: "Password has been reset successfully." });
}

// ════════════════════════════════════════════════════════════════════════════
//  SOCIAL SIGN-IN — Google, Apple, Twitter(X), LinkedIn
//
//  Full-page browser redirect flow (not XHR): oauthStart 302s the browser to
//  the provider, the provider 302s (or, for Apple, form_posts) back to
//  oauthCallback, which sets the same session cookies login()/register() use
//  and then 302s the browser back to the frontend.
// ════════════════════════════════════════════════════════════════════════════
const OAUTH_PROVIDERS: OauthProvider[] = ["google", "apple", "twitter", "linkedin"];
const OAUTH_STATE_TTL_MIN = 10;

function isValidProvider(p: string): p is OauthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(p);
}

// Only ever redirect back to a path on our own frontend — never to an
// attacker-supplied absolute URL (open-redirect prevention).
function safeRedirectPath(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function frontendRedirect(res: Response, path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  res.redirect(`${env.clientOrigin}${path}${qs ? `?${qs}` : ""}`);
}

// ── GET /auth/oauth/providers — which providers the frontend can offer ──────
async function oauthProviders(req: Request, res: Response) {
  const configured = OAUTH_PROVIDERS.filter(p => OauthEngine.isConfigured(p));
  return ok(res, { providers: configured });
}

// ── GET /auth/oauth/:provider — redirect to the provider ────────────────────
async function oauthStart(req: Request, res: Response) {
  const provider = req.params.provider;
  if (!isValidProvider(provider)) return fail(res, 400, "Unknown provider");
  if (!OauthEngine.isConfigured(provider)) return fail(res, 503, `${provider} sign-in is not configured on this server`);

  const state = crypto.generateOAuthState();
  const redirectTo = safeRedirectPath(req.query.redirect_to);
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MIN * 60000);

  let codeVerifier: string | null = null;
  let codeChallenge: string | undefined;
  if (OauthEngine.usesPKCE(provider)) {
    codeVerifier = OauthEngine.generateCodeVerifier();
    codeChallenge = OauthEngine.codeChallengeFromVerifier(codeVerifier);
  }

  await prisma.oauthStates.create({
    data: { state, provider: provider as AuthProvider, redirectTo, codeVerifier, expiresAt },
  });

  return res.redirect(OauthEngine.buildAuthUrl(provider, { state, codeChallenge }));
}

// Finds a returning OAuth user, links a verified-email match to an existing
// local account, or creates a brand new account — in that priority order.
async function findOrCreateOauthUser(provider: OauthProvider, profile: { providerId: string; email: string | null; emailVerified: boolean; displayName: string | null; avatarUrl: string | null }) {
  const byProvider = await prisma.users.findFirst({ where: { provider: provider as AuthProvider, providerId: profile.providerId } });
  if (byProvider) return byProvider;

  if (profile.email) {
    const byEmail = await prisma.users.findFirst({ where: { email: profile.email } });
    if (byEmail) {
      if (!profile.emailVerified) {
        throw Object.assign(new Error("An account with this email already exists. Log in with your password to link " + provider + "."), { status: 409 });
      }
      return prisma.users.update({
        where: { id: byEmail.id },
        data: { provider: provider as AuthProvider, providerId: profile.providerId, verified: true },
      });
    }
  }

  // Brand new account
  const baseHandle = (profile.displayName || profile.email?.split("@")[0] || provider + "user")
    .toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20) || "viber";
  let handle = baseHandle;
  for (let i = 0; await prisma.users.findUnique({ where: { handle } }); i++) {
    handle = `${baseHandle}${crypto.randomHex(3)}`;
    if (i > 5) break; // pathological collision loop guard
  }

  const existingCount = await prisma.users.count();
  const isFounding = existingCount < 1000;

  const displayName = profile.displayName || handle;
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "VY";

  const user = await prisma.users.create({
    data: {
      // A provider account may have no email at all (e.g. Twitter) — fall
      // back to a synthetic, unique, unroutable placeholder so the unique
      // email constraint isn't violated. The user can set a real email later.
      email: profile.email || `${provider}.${profile.providerId}@oauth.vylapp.invalid`,
      handle, displayName, avatarInitials: initials,
      provider: provider as AuthProvider, providerId: profile.providerId,
      verified: profile.emailVerified,
      isFoundingMember: isFounding, foundingRank: isFounding ? existingCount + 1 : null,
    },
  });
  await rbac.assignRole(user.id, "user");
  return user;
}

// ── GET/POST /auth/oauth/:provider/callback ──────────────────────────────────
// GET for Google/Twitter/LinkedIn (query string); POST (form_post) for Apple.
async function oauthCallback(req: Request, res: Response) {
  const provider = req.params.provider;
  if (!isValidProvider(provider)) return frontendRedirect(res, "/login", { oauth_error: "unknown_provider" });

  const source = req.method === "POST" ? req.body : req.query;
  const { code, state, error: providerError } = source as Record<string, string>;
  if (providerError) return frontendRedirect(res, "/login", { oauth_error: providerError });
  if (!code || !state) return frontendRedirect(res, "/login", { oauth_error: "missing_code_or_state" });

  const stateRow = await prisma.oauthStates.findUnique({ where: { state } });
  // Always delete on first use — states are single-use regardless of outcome.
  if (stateRow) await prisma.oauthStates.delete({ where: { state } }).catch(() => {});
  if (!stateRow || stateRow.provider !== provider || stateRow.expiresAt < new Date()) {
    return frontendRedirect(res, "/login", { oauth_error: "invalid_or_expired_state" });
  }

  try {
    const tokens = await OauthEngine.exchangeCode(provider, { code, codeVerifier: stateRow.codeVerifier });
    const profile = await OauthEngine.fetchProfile(provider, tokens, provider === "apple" ? (source as any).user : undefined);
    const user = await findOrCreateOauthUser(provider, profile);

    if (user.isSuspended) return frontendRedirect(res, "/login", { oauth_error: "account_suspended" });

    await prisma.users.update({ where: { id: user.id }, data: { online: true, lastSeen: new Date() } });
    const { accessToken, refreshToken } = issueTokens(user);
    await storeRefreshToken(user.id, refreshToken, { ip: req.ip, ua: req.headers["user-agent"], oauth: provider });
    authCookies.setAuthCookies(res, { accessToken, refreshToken });

    return frontendRedirect(res, stateRow.redirectTo || "/");
  } catch (err: any) {
    logger.warn("OAuth callback failed", { provider, error: err.message });
    return frontendRedirect(res, "/login", { oauth_error: err.status === 409 ? "account_exists" : "oauth_failed" });
  }
}

export = {
  publicUser, register, login, refresh, logout, me, changePassword, verifyEmail, resendVerification,
  enroll2FA, verify2FA, forgotPassword, resetPassword,
  oauthProviders, oauthStart, oauthCallback,
};
