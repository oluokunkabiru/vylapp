// ════════════════════════════════════════════════════════════════════════════
//  SMS ENGINE — phone OTP delivery, mock/live switch (I-02)
//
//  I-02 was blocked for a while on provisioning a real SMS account. That's
//  a real external-credential blocker for *live* delivery, but it doesn't
//  need to block the feature itself: `OTP_PROVIDER=mock` (the default) is a
//  fully working phone-auth path with no provider at all — it always
//  "sends" `env.otp.mockCode`, logged server-side so nothing is ever a
//  guessing game in dev/staging/demos. Flip `OTP_PROVIDER=twilio` and fill
//  in the three TWILIO_* values once a real account exists; nothing else
//  in auth.controller.ts's request/verify flow changes.
//
//  Zero extra dependency for the live path either — same "own it in fetch"
//  convention as oauthEngine.ts/translationEngine.ts rather than pulling in
//  the `twilio` npm package for one REST call.
// ════════════════════════════════════════════════════════════════════════════
import env from "../config/env";
import logger from "../utils/logger";

type SendResult = { ok: true; devCode?: string } | { ok: false; error: string };

function isConfigured(): boolean {
  if (env.otp.provider === "mock") return true;
  const t = env.otp.twilio;
  return Boolean(t.accountSid && t.authToken && t.fromNumber);
}

async function sendOtp(phone: string, code: string): Promise<SendResult> {
  if (env.otp.provider === "mock") {
    // Deliberately no network call. The caller already hashed+stored
    // `code` (which mock mode forces to env.otp.mockCode — see
    // auth.controller.ts) — this just makes it visible without a real phone.
    logger.info("MOCK SMS OTP (no provider configured)", { phone, code });
    return { ok: true, devCode: code };
  }

  if (env.otp.provider === "twilio") {
    const t = env.otp.twilio;
    if (!t.accountSid || !t.authToken || !t.fromNumber) {
      logger.error("OTP_PROVIDER=twilio but TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER not fully set");
      return { ok: false, error: "SMS provider not configured on this server" };
    }
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`;
      const body = new URLSearchParams({ To: phone, From: t.fromNumber, Body: `Your Vylapp code is ${code}. It expires in ${env.otp.ttlMinutes} minutes.` });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${t.accountSid}:${t.authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.error("Twilio send failed", { status: res.status, text: text.slice(0, 500) });
        return { ok: false, error: "Failed to send SMS" };
      }
      return { ok: true };
    } catch (err: any) {
      logger.error("Twilio request threw", { error: err.message });
      return { ok: false, error: "Failed to send SMS" };
    }
  }

  logger.error("Unknown OTP_PROVIDER", { provider: env.otp.provider });
  return { ok: false, error: "SMS provider not configured on this server" };
}

export = { sendOtp, isConfigured };
