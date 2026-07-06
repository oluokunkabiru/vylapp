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
};
