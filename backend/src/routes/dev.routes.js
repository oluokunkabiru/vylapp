/**
 * dev.routes.js — DEV-ONLY endpoints (never mounted in production).
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

"use strict";

const express  = require("express");
const nodemailer = require("nodemailer");
const env      = require("../config/env");
const logger   = require("../utils/logger");
const mailer   = require("../utils/mailer");

const router = express.Router();

const MAILPIT = "http://localhost:8026";

// ── Shared defaults ────────────────────────────────────────────────────────────
const DEF_TO   = "test@vylapp.dev";
const DEF_NAME = "Test Viber";

// ── GET /dev/test-email — raw SMTP smoke test ──────────────────────────────────
router.get("/test-email", async (req, res) => {
  const {
    to      = DEF_TO,
    subject = "📬 Vylapp — SMTP Test",
    message = "If you can read this, your Mailpit + nodemailer setup is working perfectly! 🎉",
  } = req.query;

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
  } catch (err) {
    logger.error("DEV test-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-welcome ──────────────────────────────────────────────────────
router.get("/test-welcome", async (req, res) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query;
  try {
    const fakeToken = "evt_devfaketoken001";
    const info = await mailer.sendWelcomeEmail(to, name, fakeToken);
    logger.info("DEV test-welcome sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "welcome" });
  } catch (err) {
    logger.error("DEV test-welcome failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-verify-email ─────────────────────────────────────────────────
router.get("/test-verify-email", async (req, res) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query;
  try {
    const fakeToken = "evt_devfaketoken002";
    const info = await mailer.sendEmailVerificationEmail(to, name, fakeToken);
    logger.info("DEV test-verify-email sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "email-verification" });
  } catch (err) {
    logger.error("DEV test-verify-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-reset-email ──────────────────────────────────────────────────
router.get("/test-reset-email", async (req, res) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query;
  try {
    const fakeToken = "pwr_devfaketoken003";
    const info = await mailer.sendPasswordResetEmail(to, name, fakeToken);
    logger.info("DEV test-reset-email sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "password-reset" });
  } catch (err) {
    logger.error("DEV test-reset-email failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-password-changed ────────────────────────────────────────────
router.get("/test-password-changed", async (req, res) => {
  const { to = DEF_TO, name = DEF_NAME } = req.query;
  try {
    const info = await mailer.sendPasswordChangedEmail(to, name);
    logger.info("DEV test-password-changed sent", { to });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "password-changed" });
  } catch (err) {
    logger.error("DEV test-password-changed failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /dev/test-2fa-otp ─────────────────────────────────────────────────────
router.get("/test-2fa-otp", async (req, res) => {
  const { to = DEF_TO, name = DEF_NAME, otp = "482917" } = req.query;
  try {
    const info = await mailer.send2FAOTPEmail(to, name, otp);
    logger.info("DEV test-2fa-otp sent", { to, otp });
    return res.json({ ok: true, message_id: info.messageId, mailpit_ui: MAILPIT, sent_to: to, template: "2fa-otp", otp });
  } catch (err) {
    logger.error("DEV test-2fa-otp failed", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
