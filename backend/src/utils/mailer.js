const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

function getTransporter() {
  if (!transporter) {
    const config = {
      host: env.mailHost,
      port: env.mailPort,
      // "ssl" forces implicit TLS; "tls" forces STARTTLS; unset falls back
      // to the port-465-is-implicit-TLS convention most providers follow.
      secure: env.mailScheme === "ssl" ? true : env.mailScheme === "tls" ? false : env.mailPort === 465,
    };
    if (env.mailScheme === "tls") config.requireTLS = true;

    if (env.mailUsername && env.mailPassword) {
      config.auth = {
        user: env.mailUsername,
        pass: env.mailPassword,
      };
    }

    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

/**
 * Verifies the configured SMTP connection actually works, so mail
 * misconfiguration shows up in the logs at boot instead of being discovered
 * only when a real forgot-password/reset-email attempt silently fails.
 */
async function verifyMailConfig() {
  try {
    await getTransporter().verify();
    console.log(`[mailer] SMTP OK — sending as ${env.mailFromAddress} via ${env.mailHost}:${env.mailPort}`);
    return true;
  } catch (err) {
    console.error(`[mailer] SMTP verification failed for ${env.mailHost}:${env.mailPort} — emails will not be delivered:`, err.message);
    return false;
  }
}

/**
 * Sends a password reset email
 * @param {string} email
 * @param {string} token
 * @param {string} displayName
 */
async function sendPasswordResetEmail(email, token, displayName) {
  const resetLink = `${env.clientOrigin}/reset-password?token=${token}`;
  const transporter = getTransporter();

  const mailOptions = {
    from: `"${env.mailFromName}" <${env.mailFromAddress}>`,
    to: email,
    subject: "Reset your Vylapp Password",
    text: `Hi ${displayName || "Viber"},\n\nYou requested a password reset for your Vylapp account. Please reset your password by visiting this link: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #f3f4f6;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #C084FC 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Vylapp</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Vibe. Learn. Connect.</p>
          </div>
          <div style="padding: 40px 30px; text-align: left; color: #1f2937; line-height: 1.6;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">Reset your password</h2>
            <p style="margin: 0 0 24px 0; font-size: 15px;">Hi <strong>${displayName || "Viber"}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 15px;">We received a request to reset your password. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 700; border-radius: 9999px; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3); transition: all 0.2s ease;">
                Reset Password
              </a>
            </div>
            
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="margin: 0 0 24px 0; font-size: 13px; color: #7C3AED; word-break: break-all;">${resetLink}</p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request this email, you can safely ignore it.</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
            © 2026 Vylapp. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendPasswordResetEmail,
  verifyMailConfig,
};
