/**
 * emailTemplates.js — Professional branded HTML email templates for Vylapp
 *
 * All templates share one base layout (purple gradient header, white card,
 * grey footer) and are self-contained — no external CSS frameworks needed.
 *
 * Exported helpers:
 *   buildWelcomeEmail(displayName, verifyLink)
 *   buildEmailVerificationEmail(displayName, verifyLink)
 *   buildPasswordResetEmail(displayName, resetLink)
 *   buildPasswordChangedEmail(displayName)
 *   build2FAOTPEmail(displayName, otp)
 */

"use strict";

// ── Shared design tokens ───────────────────────────────────────────────────────
const BRAND_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)";
const BRAND_BTN      = "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)";
const BRAND_NAME     = "Vylapp";
const BRAND_TAGLINE  = "Vibe. Learn. Connect.";
const BRAND_YEAR     = new Date().getFullYear();

// ── Base layout wrapper ────────────────────────────────────────────────────────
function layout(headerEmoji, headerTitle, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle} — ${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- HEADER CARD -->
          <tr>
            <td style="background:${BRAND_GRADIENT};border-radius:16px 16px 0 0;padding:32px 30px 28px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">${headerEmoji}</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${BRAND_NAME}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${BRAND_TAGLINE}</p>
            </td>
          </tr>

          <!-- BODY CARD -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;color:#1f2937;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:24px 36px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
              <!-- AI badge -->
              <div style="display:inline-block;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);border-radius:9999px;padding:5px 14px;margin-bottom:14px;">
                <span style="color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:0.5px;">✦ AI-POWERED PLATFORM</span>
              </div>
              <p style="margin:0 0 6px;font-size:11px;color:#c4b5fd;">
                Vylapp is built with AI at its core — smarter content, personalised learning &amp; intelligent connections.
              </p>
              <p style="margin:0 0 10px;font-size:11px;color:#d1d5db;font-style:italic;">
                As the world moves, we move with it. 🌍
              </p>
              <hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;">
              <p style="margin:0 0 4px;">© ${BRAND_YEAR} ${BRAND_NAME}. All rights reserved.</p>
              <p style="margin:0;">You received this email because you have an account on Vylapp.<br>If you didn't request this, you can safely ignore it.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function ctaButton(label, href) {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${href}"
         style="display:inline-block;background:${BRAND_BTN};color:#ffffff;text-decoration:none;
                padding:14px 32px;font-size:15px;font-weight:700;border-radius:9999px;
                box-shadow:0 4px 14px rgba(124,58,237,0.35);">
        ${label}
      </a>
    </div>`;
}

function linkFallback(href) {
  return `
    <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
      If the button doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#7C3AED;word-break:break-all;">${href}</p>`;
}

function divider() {
  return `<hr style="border:0;border-top:1px solid #f3f4f6;margin:24px 0;">`;
}

function highlight(text) {
  return `<strong style="color:#7C3AED;">${text}</strong>`;
}

function infoBox(html) {
  return `
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:16px 20px;margin:20px 0;font-size:14px;color:#6b21a8;">
      ${html}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. WELCOME EMAIL  (sent after registration, includes verify-email CTA)
// ═══════════════════════════════════════════════════════════════════════════════
function buildWelcomeEmail(displayName, verifyLink) {
  const name = displayName || "Viber";
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      Welcome to Vylapp, ${name}! 🎉
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      We're thrilled to have you join the community. Vylapp is your place to
      <strong>vibe</strong>, <strong>learn</strong>, and <strong>connect</strong> with
      creators and learners from across Africa and the diaspora.
    </p>

    <p style="margin:0 0 12px;font-size:15px;color:#374151;">
      To get started, please verify your email address so we know it's really you:
    </p>

    ${ctaButton("✅ Verify My Email", verifyLink)}
    ${linkFallback(verifyLink)}

    ${infoBox(`
      <strong>🚀 What you can do on Vylapp:</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;line-height:1.8;">
        <li>Post vibes — share your thoughts, stories &amp; creativity</li>
        <li>Join Spaces — topic-based communities</li>
        <li>Learn — take courses from verified educators</li>
        <li>Earn — monetise your content as a creator</li>
      </ul>
    `)}

    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      This verification link expires in ${highlight("24 hours")}.
    </p>`;

  return { subject: `Welcome to Vylapp, ${name}! Please verify your email`, html: layout("🌟", "Welcome", body) };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. EMAIL VERIFICATION  (re-send or standalone verify prompt)
// ═══════════════════════════════════════════════════════════════════════════════
function buildEmailVerificationEmail(displayName, verifyLink) {
  const name = displayName || "Viber";
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      Confirm your email address
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Hi <strong>${name}</strong>, please click the button below to verify your email and
      unlock all Vylapp features.
    </p>

    ${ctaButton("✅ Verify Email Address", verifyLink)}
    ${linkFallback(verifyLink)}

    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      This link expires in ${highlight("24 hours")}. If you didn't create a Vylapp account, you can safely ignore this email.
    </p>`;

  return { subject: "Verify your Vylapp email address", html: layout("✉️", "Verify Email", body) };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. PASSWORD RESET
// ═══════════════════════════════════════════════════════════════════════════════
function buildPasswordResetEmail(displayName, resetLink) {
  const name = displayName || "Viber";
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      Reset your password
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Hi <strong>${name}</strong>, we received a request to reset the password for your
      Vylapp account. Click the button below to choose a new password.
    </p>

    ${ctaButton("🔑 Reset My Password", resetLink)}
    ${linkFallback(resetLink)}

    ${infoBox(`
      ⏱ This link is valid for <strong>1 hour</strong>. After that you'll need to
      request a new one from the login page.
    `)}

    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      If you did not request a password reset, your account is safe — just ignore this email.
    </p>`;

  return { subject: "Reset your Vylapp password", html: layout("🔐", "Password Reset", body) };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. PASSWORD CHANGED CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
function buildPasswordChangedEmail(displayName) {
  const name = displayName || "Viber";
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      Your password was changed
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Hi <strong>${name}</strong>, this is a confirmation that your Vylapp account
      password was successfully changed.
    </p>

    ${infoBox(`
      📅 Changed at: <strong>${new Date().toUTCString()}</strong>
    `)}

    <p style="margin:20px 0;font-size:15px;color:#374151;">
      If you made this change, no further action is needed. If you did
      <strong>not</strong> change your password, please
      <a href="mailto:support@vylapp.com" style="color:#7C3AED;text-decoration:none;font-weight:600;">
        contact support immediately
      </a>.
    </p>

    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      All other sessions have been logged out for your security.
    </p>`;

  return { subject: "Your Vylapp password was changed", html: layout("🛡️", "Password Changed", body) };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. 2FA OTP EMAIL  (when user enables 2FA — sends them their initial OTP)
// ═══════════════════════════════════════════════════════════════════════════════
function build2FAOTPEmail(displayName, otp) {
  const name = displayName || "Viber";

  // Render OTP digits as individual blocks for clarity
  const digitBlocks = otp.split("").map(d =>
    `<span style="display:inline-block;background:#faf5ff;border:2px solid #e9d5ff;
                  border-radius:8px;width:38px;height:48px;line-height:48px;text-align:center;
                  font-size:24px;font-weight:800;color:#7C3AED;margin:0 4px;">${d}</span>`
  ).join("");

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">
      Your 2FA verification code
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">
      Hi <strong>${name}</strong>, use the one-time code below to complete your
      two-factor authentication setup on Vylapp.
    </p>

    <!-- OTP digits -->
    <div style="text-align:center;margin:24px 0 8px;">
      ${digitBlocks}
    </div>
    <p style="text-align:center;font-size:13px;color:#9ca3af;margin:8px 0 24px;">
      This code expires in ${highlight("10 minutes")}.
    </p>

    ${infoBox(`
      🔒 <strong>Never share this code</strong> with anyone. Vylapp staff will
      never ask for your OTP.
    `)}

    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      If you didn't try to enable 2FA, please change your password immediately.
    </p>`;

  return { subject: `${otp} is your Vylapp verification code`, html: layout("🔢", "2FA Code", body) };
}

module.exports = {
  buildWelcomeEmail,
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  build2FAOTPEmail,
};
