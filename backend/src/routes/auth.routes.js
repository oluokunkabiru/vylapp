const express = require("express");
const db = require("../config/db");
const env = require("../config/env");
const crypto = require("../utils/crypto");
const mailer = require("../utils/mailer");
const { ok, fail } = require("../utils/respond");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rbac = require("../rbac");

const router = express.Router();

const ACCESS_TTL_SEC = 15 * 60;       // 15 min access token
const REFRESH_TTL_DAYS = 30;

function issueTokens(user) {
  const accessToken = crypto.signJWT({ sub: user.id, handle: user.handle }, env.jwtSecret, ACCESS_TTL_SEC);
  const refreshToken = crypto.generateRefreshToken();
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, token, deviceInfo) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, device_info, expires_at) VALUES ($1,$2,$3,$4)`,
    [userId, token, deviceInfo || {}, expiresAt]
  );
}

function publicUser(row) {
  return {
    id: row.id, handle: row.handle, displayName: row.display_name, bio: row.bio,
    avatarColor: row.avatar_color, avatarInitials: row.avatar_initials, avatarUrl: row.avatar_url,
    roleTag: row.role_tag, verified: row.verified, verificationTier: row.verification_tier,
    isCreator: row.is_creator, onboardingStep: row.onboarding_step, onboardingDone: row.onboarding_done,
    interests: row.interests, subscriptionPlan: row.subscription_plan,
    vibesCount: row.vibes_count, connectionsCount: row.connections_count, followingCount: row.following_count,
    contentLanguages: row.content_language, location: row.location,
    currentCountry: row.current_country, currentCity: row.current_city, heritageCountries: row.heritage_countries,
  };
}

// ── POST /auth/register ───────────────────────────────────────────────────
router.post("/register", asyncHandler(async (req, res) => {
  const { email, handle, password, displayName } = req.body;
  if (!email || !handle || !password || !displayName) {
    return fail(res, 400, "email, handle, password, and displayName are all required");
  }
  if (password.length < 8) return fail(res, 400, "Password must be at least 8 characters");

  const dupe = await db.query(`SELECT id FROM users WHERE email = $1 OR handle = $2`, [email, handle]);
  if (dupe.rows.length) return fail(res, 409, "Email or handle already in use");

  const password_hash = crypto.hashPassword(password);
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const { rows } = await db.query(
    `INSERT INTO users (email, handle, display_name, password_hash, avatar_initials)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [email, handle, displayName, password_hash, initials || "VY"]
  );
  const user = rows[0];

  // Every authenticated user needs the base 'user' role — it's what grants
  // vibes.create and the other everyday permissions (see schema_rbac.sql).
  await rbac.assignRole(user.id, "user");

  const { accessToken, refreshToken } = issueTokens(user);
  await storeRefreshToken(user.id, refreshToken, { ip: req.ip, ua: req.headers["user-agent"] });

  return ok(res, { user: publicUser(user), accessToken, refreshToken }, 201);
}));

// ── POST /auth/login ─────────────────────────────────────────────────────
router.post("/login", asyncHandler(async (req, res) => {
  const { emailOrHandle, password } = req.body;
  if (!emailOrHandle || !password) return fail(res, 400, "emailOrHandle and password are required");

  const { rows } = await db.query(`SELECT * FROM users WHERE email = $1 OR handle = $1`, [emailOrHandle]);
  if (!rows.length) return fail(res, 401, "Invalid credentials");
  const user = rows[0];
  if (user.is_suspended) return fail(res, 403, "Account suspended");
  if (!crypto.verifyPassword(password, user.password_hash)) return fail(res, 401, "Invalid credentials");

  await db.query(`UPDATE users SET online = TRUE, last_seen = NOW() WHERE id = $1`, [user.id]);

  const { accessToken, refreshToken } = issueTokens(user);
  await storeRefreshToken(user.id, refreshToken, { ip: req.ip, ua: req.headers["user-agent"] });

  return ok(res, { user: publicUser(user), accessToken, refreshToken });
}));

// ── POST /auth/refresh ───────────────────────────────────────────────────
router.post("/refresh", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 400, "refreshToken is required");

  const { rows } = await db.query(
    `SELECT rt.*, u.handle FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    [refreshToken]
  );
  if (!rows.length) return fail(res, 401, "Invalid or expired refresh token");

  const accessToken = crypto.signJWT({ sub: rows[0].user_id, handle: rows[0].handle }, env.jwtSecret, ACCESS_TTL_SEC);
  return ok(res, { accessToken });
}));

// ── POST /auth/logout ────────────────────────────────────────────────────
router.post("/logout", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1`, [refreshToken]);
  return ok(res, { loggedOut: true });
}));

// ── GET /auth/me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  return ok(res, { user: publicUser(rows[0]) });
}));

// ── POST /auth/change-password ───────────────────────────────────────────
router.post("/change-password", requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return fail(res, 400, "currentPassword and newPassword are required");
  if (newPassword.length < 8) return fail(res, 400, "New password must be at least 8 characters");

  const { rows } = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
  if (!crypto.verifyPassword(currentPassword, rows[0].password_hash)) return fail(res, 401, "Current password is incorrect");

  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [crypto.hashPassword(newPassword), req.user.id]);
  await db.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [req.user.id]);
  return ok(res, { changed: true });
}));

// ── 2FA: enroll / verify ─────────────────────────────────────────────────
router.post("/2fa/enroll", requireAuth, asyncHandler(async (req, res) => {
  const secret = crypto.generateTOTPSecret();
  const recoveryCodes = crypto.generateRecoveryCodes();
  await db.query(`UPDATE users SET two_factor_secret = $1, recovery_codes = $2 WHERE id = $3`, [secret, recoveryCodes, req.user.id]);
  return ok(res, { secret, recoveryCodes });
}));

router.post("/2fa/verify", requireAuth, asyncHandler(async (req, res) => {
  const { code } = req.body;
  const { rows } = await db.query(`SELECT two_factor_secret FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]?.two_factor_secret) return fail(res, 400, "2FA not enrolled");
  const valid = crypto.verifyTOTP(code, rows[0].two_factor_secret);
  if (!valid) return fail(res, 401, "Invalid code");
  await db.query(`UPDATE users SET two_factor_enabled = TRUE WHERE id = $1`, [req.user.id]);
  return ok(res, { enabled: true });
}));

// ── Forgot Password ──────────────────────────────────────────────────────────
router.post("/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, 400, "Email is required");

  const { rows } = await db.query(`SELECT id, display_name, email FROM users WHERE email = $1`, [email]);
  if (rows.length) {
    const user = rows[0];
    const token = crypto.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    try {
      await mailer.sendPasswordResetEmail(user.email, token, user.display_name);
    } catch (err) {
      console.error("[forgot-password] failed to send email:", err);
      // Still return success to prevent enumeration and keep user flow consistent
    }
  }

  return ok(res, { message: "If the email is registered, a password reset link has been sent." });
}));

// ── Reset Password ───────────────────────────────────────────────────────────
router.post("/reset-password", asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return fail(res, 400, "Token and newPassword are required");
  if (newPassword.length < 8) return fail(res, 400, "Password must be at least 8 characters");

  const { rows: resets } = await db.query(
    `SELECT * FROM password_resets WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  if (!resets.length) return fail(res, 400, "Invalid or expired reset token");
  const resetRecord = resets[0];

  const hashed = crypto.hashPassword(newPassword);
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, resetRecord.user_id]);
  await db.query(`UPDATE password_resets SET used_at = NOW() WHERE id = $1`, [resetRecord.id]);
  await db.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [resetRecord.user_id]);

  return ok(res, { message: "Password has been reset successfully." });
}));

module.exports = { router, publicUser };
