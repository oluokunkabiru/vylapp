import "dotenv/config";
import path from "path";

function get(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// CLIENT_ORIGIN accepts one origin or a comma-separated list, e.g.
// "https://vylapp.com,https://www.vylapp.com,http://localhost:5173" — for
// serving the same backend to more than one frontend origin (web + a
// staging domain, apex + www, prod + local dev, etc).
const clientOriginList = (process.env.CLIENT_ORIGIN || "*").split(",").map(s => s.trim()).filter(Boolean);

const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: get("DATABASE_URL"),
  pgSsl: process.env.PGSSL === "true",
  jwtSecret: get("JWT_SECRET", "dev_insecure_secret_change_me"),
  refreshSecret: get("REFRESH_SECRET", "dev_insecure_refresh_secret_change_me"),
  // The full allow-list, for CORS / Socket.IO (supports multiple origins).
  clientOrigins: clientOriginList,
  // The single primary origin — used anywhere a single concrete URL is
  // needed (OAuth redirects, email links). Always the first entry.
  clientOrigin: clientOriginList[0] || "*",
  // Content translation can be disabled independently of UI localization,
  // language detection, moderation, and other Anthropic-backed features.
  // Default-on preserves existing deployments that predate this switch.
  translationEnabled: (process.env.TRANSLATION_ENABLED || "true").toLowerCase() !== "false",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,

  // Payment credentials are deliberately environment-only. Administrators can
  // select enabled gateways in the console, but never enter or retrieve a
  // secret key through the browser or database.
  payments: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || null,
    flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || null,
  },

  // I-02: phone + one-time-code sign-in. "mock" (default) needs no SMS
  // account at all — it always accepts `otpMockCode` (also logged server-side
  // so a developer never has to guess it) instead of sending a real text.
  // Flip to "twilio" and fill in the twilio.* values below once a real
  // account exists; nothing else in the code path changes.
  otp: {
    provider: (process.env.OTP_PROVIDER || "mock").toLowerCase(), // "mock" | "twilio"
    mockCode: process.env.OTP_MOCK_CODE || "123456",
    ttlMinutes: parseInt(process.env.OTP_TTL_MINUTES || "10", 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || null,
      authToken: process.env.TWILIO_AUTH_TOKEN || null,
      fromNumber: process.env.TWILIO_FROM_NUMBER || null,
    },
  },
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "storage", "media"),
  mediaPublicBaseUrl: (process.env.MEDIA_PUBLIC_BASE_URL || `${process.env.API_BASE_URL || `http://localhost:${parseInt(process.env.PORT || "4000", 10)}`}/media`).replace(/\/$/, ""),
  mailHost: process.env.MAIL_HOST || "127.0.0.1",
  mailPort: parseInt(process.env.MAIL_PORT || "1025", 10),
  // "ssl" -> implicit TLS on connect (typically port 465)
  // "tls" -> STARTTLS negotiated after connect (typically port 587)
  // null/unset -> inferred from port below
  mailScheme: process.env.MAIL_SCHEME === "null" || !process.env.MAIL_SCHEME ? null : process.env.MAIL_SCHEME.toLowerCase(),
  mailUsername: process.env.MAIL_USERNAME === "null" || !process.env.MAIL_USERNAME ? null : process.env.MAIL_USERNAME,
  mailPassword: process.env.MAIL_PASSWORD === "null" || !process.env.MAIL_PASSWORD ? null : process.env.MAIL_PASSWORD,
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || "hello@example.com",
  mailFromName: process.env.MAIL_FROM_NAME && !process.env.MAIL_FROM_NAME.includes("APP_NAME") ? process.env.MAIL_FROM_NAME : "Vylapp",

  // Public base URL of THIS backend — used to build OAuth redirect_uri values
  // (must exactly match what's registered in each provider's console).
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${parseInt(process.env.PORT || "4000", 10)}`,

  oauth: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID || null, clientSecret: process.env.GOOGLE_CLIENT_SECRET || null },
    linkedin: { clientId: process.env.LINKEDIN_CLIENT_ID || null, clientSecret: process.env.LINKEDIN_CLIENT_SECRET || null },
    twitter: { clientId: process.env.TWITTER_CLIENT_ID || null, clientSecret: process.env.TWITTER_CLIENT_SECRET || null },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || null,       // the Services ID, e.g. com.vylapp.web
      teamId: process.env.APPLE_TEAM_ID || null,
      keyId: process.env.APPLE_KEY_ID || null,
      // PEM-formatted EC private key for the Sign in with Apple key. May be
      // stored with literal "\n" sequences in one env var line — normalized here.
      privateKey: process.env.APPLE_PRIVATE_KEY ? process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null,
    },
  },

  // Firebase Admin SDK — server-side FCM push delivery (see pushEngine.ts).
  // From Firebase console → Project Settings → Service accounts → Generate new private key.
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || null,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || null,
    // May be stored with literal "\n" sequences in one env var line — normalized here.
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : null,
  },
};

export = env;
