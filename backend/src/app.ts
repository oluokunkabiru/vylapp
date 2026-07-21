import express from "express";
import cors from "cors";
import env from "./config/env";
import errorHandlerModule from "./middleware/errorHandler";
import rateLimiter from "./middleware/rateLimiter";
import httpLogger from "./middleware/httpLogger";
import metrics from "./middleware/metrics";
import logger from "./utils/logger";

const { notFound, errorHandler } = errorHandlerModule;

import { router as authRoutes } from "./routes/auth.routes";
import { router as userRoutes } from "./routes/users.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import { router as vibesRoutes } from "./routes/vibes.routes";
import { router as spacesRoutes } from "./routes/spaces.routes";
import messagingRoutes from "./routes/messaging.routes";
import notificationsRoutes from "./routes/notifications.routes";
import creatorRoutes from "./routes/creator.routes";
import subscriptionsRoutes from "./routes/subscriptions.routes";
import searchRoutes from "./routes/search.routes";
import moderationRoutes from "./routes/moderation.routes";
import autopilotRoutes from "./routes/autopilot.routes";
import analyticsRoutes from "./routes/analytics.routes";
import translateRoutes from "./routes/translate.routes";
import ravenRoutes from "./routes/raven.routes";
import learnRoutes from "./routes/learn.routes";
import forumRoutes from "./routes/forum.routes";
import rbacRoutes from "./routes/rbac.routes";
import adminRoutes from "./routes/admin.routes";
import devRoutes from "./routes/dev.routes";

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
  app.use(metrics.httpMetrics);

  app.get("/health", (req, res) => res.json({
    ok: true, service: "vylapp-backend", time: new Date().toISOString(),
    rate_limiter: "active", multilingual_moderation: "active",
    learn_pillar: "active", forum: "active",
  }));

  // ── Prometheus scrape target ──────────────────────────────────────────────
  // Deliberately unauthenticated — protected by network isolation (only the
  // prometheus container can reach it inside the compose network), not by
  // application auth. Never expose this port publicly in production without
  // putting a reverse-proxy allowlist or basic auth in front of it.
  app.get("/metrics", metrics.metricsHandler);

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

  // ── Admin dashboard API (admin.access + granular admin.* permissions) ─────
  app.use("/admin", adminRoutes);

  // ── Dev-only utilities (exposed in production too) ─────────────────────────
  app.use("/dev", devRoutes);
  logger.info("DEV routes mounted at /dev");

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export = createApp;
