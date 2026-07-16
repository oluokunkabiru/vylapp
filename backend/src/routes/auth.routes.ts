import express from "express";
import asyncHandler from "../middleware/asyncHandler";
import authMiddleware from "../middleware/auth";
import authController from "../controllers/auth.controller";

const { requireAuth } = authMiddleware;

const router = express.Router();

// ── POST /auth/register ────────────────────────────────────────────────────────
router.post("/register", asyncHandler(authController.register));

// ── POST /auth/login ───────────────────────────────────────────────────────────
router.post("/login", asyncHandler(authController.login));

// ── POST /auth/refresh ─────────────────────────────────────────────────────────
router.post("/refresh", asyncHandler(authController.refresh));

// ── POST /auth/logout ──────────────────────────────────────────────────────────
router.post("/logout", asyncHandler(authController.logout));

// ── GET /auth/me ───────────────────────────────────────────────────────────────
router.get("/me", requireAuth, asyncHandler(authController.me));

// ── POST /auth/change-password ─────────────────────────────────────────────────
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));

// ── POST /auth/verify-email ────────────────────────────────────────────────────
router.post("/verify-email", asyncHandler(authController.verifyEmail));

// ── POST /auth/resend-verification ────────────────────────────────────────────
router.post("/resend-verification", requireAuth, asyncHandler(authController.resendVerification));

// ── 2FA: enroll ───────────────────────────────────────────────────────────────
router.post("/2fa/enroll", requireAuth, asyncHandler(authController.enroll2FA));

// ── 2FA: verify ───────────────────────────────────────────────────────────────
router.post("/2fa/verify", requireAuth, asyncHandler(authController.verify2FA));

// ── POST /auth/forgot-password ─────────────────────────────────────────────────
router.post("/forgot-password", asyncHandler(authController.forgotPassword));

// ── POST /auth/reset-password ──────────────────────────────────────────────────
router.post("/reset-password", asyncHandler(authController.resetPassword));

export = { router, publicUser: authController.publicUser };
