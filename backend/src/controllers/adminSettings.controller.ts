// ════════════════════════════════════════════════════════════════════════════
//  ADMIN SETTINGS CONTROLLER  /admin/settings/*
//
//  Platform-wide config (app_config) and feature flags (feature_flags).
//  Both tables existed in the schema but had zero routes reading or writing
//  them anywhere in the codebase before this — this is the first wiring.
//  Sits behind requireAdmin + admin.system.config at the router level, which
//  by design only super_admin holds (platform_admin is explicitly "everything
//  except system config" per schema_rbac.sql).
// ════════════════════════════════════════════════════════════════════════════
import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";

const { ok, fail } = respond;

// target_id is a UUID column — app_config keys are free-text, not UUIDs, so
// they're recorded in target_type instead (e.g. "app_config:autopilot_max_posts")
// and target_id stays null. Feature flags do have a real UUID id and use it normally.
async function writeAudit(adminId: string, action: string, targetType: string | null, targetId: string | null, beforeData: unknown, afterData: unknown, ip: string | null) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, beforeData: beforeData as any, afterData: afterData as any, ipAddress: ip },
  });
}

// ── GET /admin/settings/config ────────────────────────────────────────────────
async function listConfig(req: AuthedRequest, res: Response) {
  const rows = await prisma.appConfig.findMany({ orderBy: { key: "asc" } });
  return ok(res, { config: rows.map(r => ({ key: r.key, value: r.value, description: r.description, updated_at: r.updatedAt })) });
}

// ── PUT /admin/settings/config/:key — body: { value, description? } ──────────
async function upsertConfig(req: AuthedRequest, res: Response) {
  const { key } = req.params;
  const { value, description } = req.body;
  if (value === undefined) return fail(res, 400, "value is required");

  const before = await prisma.appConfig.findUnique({ where: { key } });
  const row = await prisma.appConfig.upsert({
    where: { key },
    create: { key, value, description: description || null, updatedBy: req.user.id },
    update: { value, description: description !== undefined ? description : undefined, updatedBy: req.user.id, updatedAt: new Date() },
  });
  await writeAudit(req.user.id, before ? "settings.config.update" : "settings.config.create", `app_config:${key}`, null, before, row, req.ip || null);
  return ok(res, { config: { key: row.key, value: row.value, description: row.description, updated_at: row.updatedAt } });
}

// ── DELETE /admin/settings/config/:key ────────────────────────────────────────
async function deleteConfig(req: AuthedRequest, res: Response) {
  const { key } = req.params;
  const before = await prisma.appConfig.findUnique({ where: { key } });
  if (!before) return fail(res, 404, "Config key not found");

  await prisma.appConfig.delete({ where: { key } });
  await writeAudit(req.user.id, "settings.config.delete", `app_config:${key}`, null, before, null, req.ip || null);
  return ok(res, { deleted: true });
}

// ── GET /admin/settings/flags ─────────────────────────────────────────────────
async function listFlags(req: AuthedRequest, res: Response) {
  const rows = await prisma.featureFlags.findMany({ orderBy: { key: "asc" } });
  return ok(res, {
    flags: rows.map(f => ({ id: f.id, key: f.key, enabled: f.enabled, rollout_pct: f.rolloutPct, description: f.description, updated_at: f.updatedAt })),
  });
}

// ── POST /admin/settings/flags — body: { key, description?, enabled?, rollout_pct? }
async function createFlag(req: AuthedRequest, res: Response) {
  const { key, description, enabled, rollout_pct } = req.body;
  if (!key?.trim()) return fail(res, 400, "key is required");

  const flag = await prisma.featureFlags.create({
    data: { key: key.trim(), description: description || null, enabled: !!enabled, rolloutPct: rollout_pct ?? 0, updatedBy: req.user.id },
  });
  await writeAudit(req.user.id, "settings.flag.create", "feature_flag", flag.id, null, flag, req.ip || null);
  return ok(res, { flag: { id: flag.id, key: flag.key, enabled: flag.enabled, rollout_pct: flag.rolloutPct, description: flag.description } }, 201);
}

// ── PATCH /admin/settings/flags/:id ───────────────────────────────────────────
async function updateFlag(req: AuthedRequest, res: Response) {
  const before = await prisma.featureFlags.findUnique({ where: { id: req.params.id } });
  if (!before) return fail(res, 404, "Flag not found");

  const { enabled, rollout_pct, description } = req.body;
  const data: Record<string, unknown> = { updatedBy: req.user.id };
  if (enabled !== undefined) data.enabled = !!enabled;
  if (rollout_pct !== undefined) data.rolloutPct = Math.min(100, Math.max(0, parseInt(rollout_pct, 10) || 0));
  if (description !== undefined) data.description = description;

  const flag = await prisma.featureFlags.update({ where: { id: req.params.id }, data });
  await writeAudit(req.user.id, "settings.flag.update", "feature_flag", req.params.id, before, flag, req.ip || null);
  return ok(res, { flag: { id: flag.id, key: flag.key, enabled: flag.enabled, rollout_pct: flag.rolloutPct, description: flag.description } });
}

// ── DELETE /admin/settings/flags/:id ──────────────────────────────────────────
async function deleteFlag(req: AuthedRequest, res: Response) {
  const before = await prisma.featureFlags.findUnique({ where: { id: req.params.id } });
  if (!before) return fail(res, 404, "Flag not found");

  await prisma.featureFlags.delete({ where: { id: req.params.id } });
  await writeAudit(req.user.id, "settings.flag.delete", "feature_flag", req.params.id, before, null, req.ip || null);
  return ok(res, { deleted: true });
}

export = { listConfig, upsertConfig, deleteConfig, listFlags, createFlag, updateFlag, deleteFlag };
