require("dotenv").config();

function get(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

module.exports = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: get("DATABASE_URL"),
  pgSsl: process.env.PGSSL === "true",
  jwtSecret: get("JWT_SECRET", "dev_insecure_secret_change_me"),
  refreshSecret: get("REFRESH_SECRET", "dev_insecure_refresh_secret_change_me"),
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  mailHost: process.env.MAIL_HOST || "127.0.0.1",
  mailPort: parseInt(process.env.MAIL_PORT || "1025", 10),
  mailUsername: process.env.MAIL_USERNAME === "null" || !process.env.MAIL_USERNAME ? null : process.env.MAIL_USERNAME,
  mailPassword: process.env.MAIL_PASSWORD === "null" || !process.env.MAIL_PASSWORD ? null : process.env.MAIL_PASSWORD,
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || "hello@example.com",
  mailFromName: process.env.MAIL_FROM_NAME && !process.env.MAIL_FROM_NAME.includes("APP_NAME") ? process.env.MAIL_FROM_NAME : "Vylapp",
};
