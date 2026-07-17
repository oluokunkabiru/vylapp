/**
 * dev.routes.ts — DEV-ONLY endpoints (never mounted in production).
 *
 * All endpoints return { ok, mailpit_ui } so you can immediately open
 * Mailpit at http://localhost:8026 to preview the rendered email.
 *
 * GET  /dev/test-email               — generic SMTP smoke test
 * GET  /dev/test-welcome             — welcome + verify email template
 * GET  /dev/test-verify-email        — standalone email-verification template
 * GET  /dev/test-reset-email         — password-reset template
 * GET  /dev/test-password-changed    — password-changed confirmation template
 * GET  /dev/test-2fa-otp             — 2FA OTP template
 */

import express, { Request, Response } from "express";
import nodemailer from "nodemailer";
import env from "../config/env";
import logger from "../utils/logger";
import mailer from "../utils/mailer";
import prisma from "../config/prisma";

const router = express.Router();

const MAILPIT = "http://localhost:8026";

// ── Shared defaults ────────────────────────────────────────────────────────────
const DEF_TO   = "test@vylapp.dev";
const DEF_NAME = "Test Viber";

// ── GET /dev/test-email — raw SMTP smoke test ──────────────────────────────────
router.get("/test-email", async (req: Request, res: Response) => {
  const {
    to      = DEF_TO,
    subject = "📬 Vylapp — SMTP Test",
    message = "If you can read this, your Mailpit + nodemailer setup is working perfectly! 🎉",
  } = req.query as Record<string, string>;

  try {
    const smtpOk = await mailer.verifyMailConfig();

    const transporter = nodemailer.createTransport({
      host:   env.mailHost,
      port:   env.mailPort,
      secure: env.mailScheme === "ssl",
    });

    const info = await transporter.sendMail({
      from:    `"Vylapp Dev" <dev@vylapp.dev>`,
      to, subject,
      text: message,
      html: `<p style="font-family:sans-serif;">${message}</p>`,
    });

    logger.info("DEV test-email sent", { to, subject });
    return res.json({ ok: true, smtp_verify: smtpOk, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to });
  } catch (err: any) {
    logger.error("DEV test-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-welcome ──────────────────────────────────────────────────────
router.get("/test-welcome", async (req: Request, res: Response) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query as Record<string, string>;
  try {
    const fakeToken = "evt_devfaketoken001";
    const info = await mailer.sendWelcomeEmail(to, name, fakeToken);
    logger.info("DEV test-welcome sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "welcome" });
  } catch (err: any) {
    logger.error("DEV test-welcome failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-verify-email ─────────────────────────────────────────────────
router.get("/test-verify-email", async (req: Request, res: Response) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query as Record<string, string>;
  try {
    const fakeToken = "evt_devfaketoken002";
    const info = await mailer.sendEmailVerificationEmail(to, name, fakeToken);
    logger.info("DEV test-verify-email sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "email-verification" });
  } catch (err: any) {
    logger.error("DEV test-verify-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-reset-email ──────────────────────────────────────────────────
router.get("/test-reset-email", async (req: Request, res: Response) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query as Record<string, string>;
  try {
    const fakeToken = "pwr_devfaketoken003";
    const info = await mailer.sendPasswordResetEmail(to, name, fakeToken);
    logger.info("DEV test-reset-email sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "password-reset" });
  } catch (err: any) {
    logger.error("DEV test-reset-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-password-changed ────────────────────────────────────────────
router.get("/test-password-changed", async (req: Request, res: Response) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query as Record<string, string>;
  try {
    const info = await mailer.sendPasswordChangedEmail(to, name);
    logger.info("DEV test-password-changed sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "password-changed" });
  } catch (err: any) {
    logger.error("DEV test-password-changed failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-2fa-otp ─────────────────────────────────────────────────────
router.get("/test-2fa-otp", async (req: Request, res: Response) => {
  const { to = DEF_TO, name = DEF_NAME, otp = "482917" } = req.query as Record<string, string>;
  try {
    const info = await mailer.send2FAOTPEmail(to, name, otp);
    logger.info("DEV test-2fa-otp sent", { to, otp });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "2fa-otp", otp });
  } catch (err: any) {
    logger.error("DEV test-2fa-otp failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/users — list first 5 users (DB connectivity check) ───────────────
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      take: 5,
      orderBy: { createdAt: "asc" },
      select: {
        id:          true,
        email:       true,
        handle:      true,
        displayName: true,
        createdAt:   true,
      },
    });
    return res.json({ ok: true, count: users.length, users });
  } catch (err: any) {
    logger.error("DEV users list failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export = router;
