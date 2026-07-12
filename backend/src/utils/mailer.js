/**
 * mailer.js — Single SMTP transport for all Vylapp transactional emails.
 *
 * Exported send functions:
 *   sendWelcomeEmail(email, displayName, verifyToken)
 *   sendEmailVerificationEmail(email, displayName, verifyToken)
 *   sendPasswordResetEmail(email, displayName, resetToken)
 *   sendPasswordChangedEmail(email, displayName)
 *   send2FAOTPEmail(email, displayName, otp)
 *   verifyMailConfig()
 */

"use strict";

const nodemailer = require("nodemailer");
const env        = require("../config/env");
const logger     = require("./logger");
const {
  buildWelcomeEmail,
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  build2FAOTPEmail,
} = require("./emailTemplates");

// ── Singleton transporter ──────────────────────────────────────────────────────
let _transporter;

function getTransporter() {
  if (!_transporter) {
    const config = {
      host:   env.mailHost,
      port:   env.mailPort,
      secure: env.mailScheme === "ssl"
        ? true
        : env.mailScheme === "tls"
          ? false
          : env.mailPort === 465,
    };
    if (env.mailScheme === "tls") config.requireTLS = true;
    if (env.mailUsername && env.mailPassword) {
      config.auth = { user: env.mailUsername, pass: env.mailPassword };
    }
    _transporter = nodemailer.createTransport(config);
  }
  return _transporter;
}

// ── Base send helper ───────────────────────────────────────────────────────────
async function send({ to, subject, html }) {
  const info = await getTransporter().sendMail({
    from: `"${env.mailFromName}" <${env.mailFromAddress}>`,
    to,
    subject,
    html,
  });
  logger.info(`Email sent: ${subject}`, { to, messageId: info.messageId });
  return info;
}

// ── SMTP health check ──────────────────────────────────────────────────────────
async function verifyMailConfig() {
  try {
    await getTransporter().verify();
    logger.info(`SMTP OK — sending as ${env.mailFromAddress}`, { host: env.mailHost, port: env.mailPort });
    return true;
  } catch (err) {
    logger.error("SMTP verification failed — emails will not be delivered", {
      host: env.mailHost, port: env.mailPort, error: err.message,
    });
    return false;
  }
}

// ── 1. Welcome (after registration) ───────────────────────────────────────────
async function sendWelcomeEmail(email, displayName, verifyToken) {
  const verifyLink = `${env.clientOrigin}/verify-email?token=${verifyToken}`;
  const { subject, html } = buildWelcomeEmail(displayName, verifyLink);
  return send({ to: email, subject, html });
}

// ── 2. Standalone email verification (resend) ──────────────────────────────────
async function sendEmailVerificationEmail(email, displayName, verifyToken) {
  const verifyLink = `${env.clientOrigin}/verify-email?token=${verifyToken}`;
  const { subject, html } = buildEmailVerificationEmail(displayName, verifyLink);
  return send({ to: email, subject, html });
}

// ── 3. Password reset ──────────────────────────────────────────────────────────
async function sendPasswordResetEmail(email, displayName, resetToken) {
  const resetLink = `${env.clientOrigin}/reset-password?token=${resetToken}`;
  const { subject, html } = buildPasswordResetEmail(displayName, resetLink);
  return send({ to: email, subject, html });
}

// ── 4. Password changed confirmation ──────────────────────────────────────────
async function sendPasswordChangedEmail(email, displayName) {
  const { subject, html } = buildPasswordChangedEmail(displayName);
  return send({ to: email, subject, html });
}

// ── 5. 2FA OTP ─────────────────────────────────────────────────────────────────
async function send2FAOTPEmail(email, displayName, otp) {
  const { subject, html } = build2FAOTPEmail(displayName, otp);
  return send({ to: email, subject, html });
}

module.exports = {
  verifyMailConfig,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  send2FAOTPEmail,
};
