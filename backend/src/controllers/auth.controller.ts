import { Request, Response } from "express";
import { AuthedRequest } from "../types/express";
import env from "../config/env";
import crypto from "../utils/crypto";
import mailer from "../utils/mailer";
import logger from "../utils/logger";
import respond from "../utils/respond";
import rbac from "../rbac";
import prisma from "../config/prisma";

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

  return ok(res, { user: publicUser(toSnakeUser(user)), accessToken, refreshToken }, 201);
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

  return ok(res, { user: publicUser(toSnakeUser(user)), accessToken, refreshToken });
}

// ── POST /auth/refresh ─────────────────────────────────────────────────────────
async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 400, "refreshToken is required");

  const record = await prisma.refreshTokens.findFirst({
    where: { token: refreshToken, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { users: { select: { handle: true } } },
  });
  if (!record) return fail(res, 401, "Invalid or expired refresh token");

  const accessToken = crypto.signJWT({ sub: record.userId, handle: record.users.handle }, env.jwtSecret, ACCESS_TTL_SEC);
  return ok(res, { accessToken });
}

// ── POST /auth/logout ──────────────────────────────────────────────────────────
async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.refreshTokens.updateMany({ where: { token: refreshToken }, data: { revokedAt: new Date() } });
  return ok(res, { loggedOut: true });
}

// ── GET /auth/me ───────────────────────────────────────────────────────────────
async function me(req: AuthedRequest, res: Response) {
  const user = await prisma.users.findUnique({ where: { id: req.user.id } });
  return ok(res, { user: publicUser(toSnakeUser(user)) });
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

export = {
  publicUser, register, login, refresh, logout, me, changePassword, verifyEmail, resendVerification,
  enroll2FA, verify2FA, forgotPassword, resetPassword,
};
