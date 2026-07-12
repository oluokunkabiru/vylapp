const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const rateLimiter  = require("./middleware/rateLimiter");
const httpLogger   = require("./middleware/httpLogger");
const logger       = require("./utils/logger");

const { router: authRoutes } = require("./routes/auth.routes");
const { router: userRoutes } = require("./routes/users.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const { router: vibesRoutes } = require("./routes/vibes.routes");
const { router: spacesRoutes } = require("./routes/spaces.routes");
const messagingRoutes = require("./routes/messaging.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const creatorRoutes = require("./routes/creator.routes");
const subscriptionsRoutes = require("./routes/subscriptions.routes");
const searchRoutes = require("./routes/search.routes");
const moderationRoutes = require("./routes/moderation.routes");
const autopilotRoutes = require("./routes/autopilot.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const translateRoutes = require("./routes/translate.routes");
const ravenRoutes = require("./routes/raven.routes");
const learnRoutes = require("./routes/learn.routes");
const forumRoutes = require("./routes/forum.routes");
const rbacRoutes  = require("./routes/rbac.routes");
const devRoutes   = require("./routes/dev.routes");

function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  // ── Server-side rate limiting — applied globally before any route ──────────
  // Limits are configured per route prefix in middleware/rateLimiter.js.
  // This is the authoritative rate limit. Client-side limits in Flutter/React
  // are UX-only and provide zero security value.
  app.use(rateLimiter());
  app.use(httpLogger);

  app.get("/health", (req, res) => res.json({
    ok: true, service: "vylapp-backend", time: new Date().toISOString(),
    rate_limiter: "active", multilingual_moderation: "active",
    learn_pillar: "active", forum: "active",
  }));

  // ── Existing routes ────────────────────────────────────────────────────────
  app.use("/auth",          authRoutes);
  app.use("/users",         userRoutes);
  app.use("/onboarding",    onboardingRoutes);
  app.use("/vibes",         vibesRoutes);
  app.use("/spaces",        spacesRoutes);
  app.use("/messages",      messagingRoutes);
  app.use("/notifications", notificationsRoutes);
  app.use("/creator",       creatorRoutes);
  app.use("/subscriptions", subscriptionsRoutes);
  app.use("/search",        searchRoutes);
  app.use("/moderation",    moderationRoutes);
  app.use("/autopilot",     autopilotRoutes);
  app.use("/analytics",     analyticsRoutes);
  app.use("/translate",     translateRoutes);
  app.use("/raven",         ravenRoutes);

  // ── New routes: Learn pillar and Forum ────────────────────────────────────
  app.use("/learn", learnRoutes);
  app.use("/forum", forumRoutes);

  // ── RBAC management API (super_admin / platform_admin only) ───────────────
  app.use("/rbac",  rbacRoutes);

  // ── Dev-only utilities (never exposed in production) ─────────────────────
  if (env.nodeEnv !== "production") {
    app.use("/dev", devRoutes);
    logger.info("DEV routes mounted at /dev — disable in production");
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
