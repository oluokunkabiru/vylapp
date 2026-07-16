import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import AutopilotEngine from "../services/autopilotEngine";
import NotificationEngine from "../services/notificationEngine";
import prisma from "../config/prisma";

const { ok } = respond;

// Frontend (Autopilot.jsx) reads these in snake_case directly off API
// responses — preserve that instead of leaking Prisma's camelCase shape.
function shapeConfig(c: any) {
  if (!c) return null;
  return {
    user_id: c.userId, enabled: c.enabled, auto_post: c.autoPost, auto_engage: c.autoEngage,
    auto_reply: c.autoReply, post_interval_secs: c.postIntervalSecs, reply_delay_secs: c.replyDelaySecs,
    max_posts_per_run: c.maxPostsPerRun, active_categories: c.activeCategories, persona_viber_id: c.personaViberId,
    created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

function shapeRun(r: any) {
  return {
    id: r.id, user_id: r.userId, status: r.status, posts_generated: r.postsGenerated,
    replies_generated: r.repliesGenerated, topics_scanned: r.topicsScanned, total_likes_est: r.totalLikesEst,
    total_reposts_est: r.totalRepostsEst, error_message: r.errorMessage,
    started_at: r.startedAt, completed_at: r.completedAt,
  };
}

// ── GET /autopilot/config ────────────────────────────────────────────────
async function getConfig(req: AuthedRequest, res: Response) {
  const config = await prisma.autopilotConfigs.findUnique({ where: { userId: req.user.id } });
  return ok(res, { config: shapeConfig(config) });
}

// ── PUT /autopilot/config ────────────────────────────────────────────────
async function putConfig(req: AuthedRequest, res: Response) {
  const { enabled, autoPost, autoEngage, autoReply, postIntervalSecs, maxPostsPerRun, activeCategories } = req.body;
  const data = {
    enabled: !!enabled,
    autoPost: autoPost !== false,
    autoEngage: autoEngage !== false,
    autoReply: autoReply !== false,
    postIntervalSecs: postIntervalSecs || 6,
    maxPostsPerRun: maxPostsPerRun || 8,
    activeCategories: activeCategories || ["tech", "global", "creative", "human", "spaces"],
  };
  const config = await prisma.autopilotConfigs.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  });
  return ok(res, { config: shapeConfig(config) });
}

// ── POST /autopilot/run — generate + publish posts for this user ─────────
async function run(req: AuthedRequest, res: Response) {
  const { categories, count } = req.body;
  const cats = categories || ["TECH_VIBES", "GLOBAL_CONNECT", "CREATIVE_LEARN", "HUMAN_POTENTIAL"];
  const n = Math.min(count || 3, 8);

  const autopilotRun = await prisma.autopilotRuns.create({ data: { userId: req.user.id, status: "posting" } });
  const posted: any[] = [];

  for (let i = 0; i < n; i++) {
    const category = cats[i % cats.length];
    const generated = await AutopilotEngine.generatePost(category);
    const engagement = AutopilotEngine.estimateEngagement(generated.content, category);

    const vibe = await prisma.vibes.create({
      data: {
        userId: req.user.id,
        content: generated.content,
        category,
        tags: (AutopilotEngine.HASHTAG_BANK as Record<string, string[]>)[category] || [],
        isAutopilot: true,
        autopilotRunId: autopilotRun.id,
        autopilotTopic: generated.topic,
      },
      select: { id: true, createdAt: true },
    });
    posted.push({ vibeId: vibe.id, content: generated.content, category, method: generated.method, ...engagement, createdAt: vibe.createdAt });
  }

  await prisma.autopilotRuns.update({
    where: { id: autopilotRun.id },
    data: {
      status: "complete",
      postsGenerated: posted.length,
      totalLikesEst: posted.reduce((s, p) => s + p.est_likes, 0),
      completedAt: new Date(),
    },
  });

  const body = NotificationEngine.formatBody("autopilot_posted", null, { count: posted.length });
  await prisma.notifications.create({ data: { userId: req.user.id, type: "autopilot_posted", body } });

  return ok(res, { runId: autopilotRun.id, posted }, 201);
}

// ── GET /autopilot/runs — run history ────────────────────────────────────
async function listRuns(req: AuthedRequest, res: Response) {
  const runs = await prisma.autopilotRuns.findMany({
    where: { userId: req.user.id },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return ok(res, { runs: runs.map(shapeRun) });
}

export = { getConfig, putConfig, run, listRuns };
