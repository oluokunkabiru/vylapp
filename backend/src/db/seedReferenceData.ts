// Seeds core reference data that used to live inline in schema.sql /
// schema_forum.sql / schema_rbac.sql (RBAC roles+permissions, forum
// categories, interest categories, badges, feature flags, app config,
// trending tags). Prisma migrations only track DDL (tables/columns/enums),
// not these INSERT statements, so they need to run as a separate step.
//
// This is REQUIRED data, not optional demo content — RBAC has zero
// roles/permissions without it, so unlike seed.ts (demo personas/vibes/
// Spaces) this is meant to be a hard gate in the deploy chain, not
// best-effort. Every statement in referenceData.sql is already idempotent
// (ON CONFLICT DO NOTHING / a guarded plpgsql helper), safe to run on every
// deploy.
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import env from "../config/env";

async function seedReferenceData() {
  console.log("[reference-data] ── seeding core reference data ────────────");
  const pool = new Pool({ connectionString: env.databaseUrl, ssl: env.pgSsl ? { rejectUnauthorized: false } : false });
  const sql = fs.readFileSync(path.join(__dirname, "referenceData.sql"), "utf8");
  await pool.query(sql);
  console.log("[reference-data] ── reference data seed complete ───────────");
  await pool.end();
}

seedReferenceData().catch(err => { console.error("[reference-data] failed:", err); process.exit(1); });
