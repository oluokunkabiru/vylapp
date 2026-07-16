/**
 * mailer.ts — Single SMTP transport for all Vylapp transactional emails.
 *
 * Exported send functions:
 *   sendWelcomeEmail(email, displayName, verifyToken)
 *   sendEmailVerificationEmail(email, displayName, verifyToken)
 *   sendPasswordResetEmail(email, displayName, resetToken)
 *   sendPasswordChangedEmail(email, displayName)
 *   send2FAOTPEmail(email, displayName, otp)
 *   verifyMailConfig()
 */

import nodemailer, { Transporter } from "nodemailer";
import env from "../config/env";
import logger from "./logger";
import emailTemplates from "./emailTemplates";

const {
  buildWelcomeEmail,
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  build2FAOTPEmail,
} = emailTemplates;

// ── Singleton transporter ──────────────────────────────────────────────────────
let _transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!_transporter) {
    const config: Record<string, unknown> = {
      host: env.mailHost,
      port: env.mailPort,
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

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

// ── Base send helper ───────────────────────────────────────────────────────────
async function send({ to, subject, html }: SendArgs) {
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
async function verifyMailConfig(): Promise<boolean> {
  try {
    await getTransporter().verify();
    logger.info(`SMTP OK — sending as ${env.mailFromAddress}`, { host: env.mailHost, port: env.mailPort });
    return true;
  } catch (err: any) {
    logger.error("SMTP verification failed — emails will not be delivered", {
      host: env.mailHost, port: env.mailPort, error: err.message,
    });
    return false;
  }
}

// ── 1. Welcome (after registration) ───────────────────────────────────────────
async function sendWelcomeEmail(email: string, displayName: string | null | undefined, verifyToken: string) {
  const verifyLink = `${env.clientOrigin}/verify-email?token=${verifyToken}`;
  const { subject, html } = buildWelcomeEmail(displayName, verifyLink);
  return send({ to: email, subject, html });
}

// ── 2. Standalone email verification (resend) ──────────────────────────────────
async function sendEmailVerificationEmail(email: string, displayName: string | null | undefined, verifyToken: string) {
  const verifyLink = `${env.clientOrigin}/verify-email?token=${verifyToken}`;
  const { subject, html } = buildEmailVerificationEmail(displayName, verifyLink);
  return send({ to: email, subject, html });
}

// ── 3. Password reset ──────────────────────────────────────────────────────────
async function sendPasswordResetEmail(email: string, displayName: string | null | undefined, resetToken: string) {
  const resetLink = `${env.clientOrigin}/reset-password?token=${resetToken}`;
  const { subject, html } = buildPasswordResetEmail(displayName, resetLink);
  return send({ to: email, subject, html });
}

// ── 4. Password changed confirmation ──────────────────────────────────────────
async function sendPasswordChangedEmail(email: string, displayName: string | null | undefined) {
  const { subject, html } = buildPasswordChangedEmail(displayName);
  return send({ to: email, subject, html });
}

// ── 5. 2FA OTP ─────────────────────────────────────────────────────────────────
async function send2FAOTPEmail(email: string, displayName: string | null | undefined, otp: string) {
  const { subject, html } = build2FAOTPEmail(displayName, otp);
  return send({ to: email, subject, html });
}

export = {
  verifyMailConfig,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  send2FAOTPEmail,
};
